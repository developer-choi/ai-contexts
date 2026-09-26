import { execSync, spawnSync } from "node:child_process";
import { allInFreeRepos, originRepoName, repoTier, tierOfRepoName } from "./repo-tiers.mjs";
import {
  findGhPrMerges,
  findGitInvocations,
  normalizeCwd,
  parseGitInvocation,
  splitSegments,
  tokenize,
} from "./git-command-parser.mjs";
import { deny, getCommand, getCwd, readPayload } from "./hook-utils.mjs";

// 보호 브랜치 push는 레포 등급(repo-tiers.mjs)으로 가른다. FREE는 통과, 승인·PR 전용은 차단 —
// 승인 창을 두지 않는다. push는 밖으로 나가 되돌리기 어려우니 사용자가 리뷰한 뒤 직접 민다.
// 원격 PR 머지(gh pr merge·gh api)도 원격 보호 브랜치를 바로 바꾸므로 같은 기준으로 여기서 막는다.
const PUSH_TAIL = {
  "approval-gated": "승인 등급 레포는 push를 사용자가 합니다.",
  "pr-only": "PR 전용 레포는 작업 브랜치를 push하고 PR을 엽니다.",
};

const payload = readPayload();
const cmd = getCommand(payload);
if (typeof cmd !== "string") process.exit(0);

const pushInvocations = findGitInvocations(cmd, "push");
const ghMerges = findGhPrMerges(cmd);
if (pushInvocations.length === 0 && ghMerges.length === 0) process.exit(0);

const cdMatch = cmd.match(/(?:^|[;&|])\s*cd\s+(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/);
let cdCwd = cdMatch && (cdMatch[1] || cdMatch[2] || cdMatch[3]);
cdCwd = normalizeCwd(cdCwd);

// gh로 PR을 머지하는 호출. `-R owner/name`이나 API 경로에 레포가 적혀 있으면 그 이름으로, 없으면 gh가
// 실제로 보는 작업 폴더로 등급을 정한다.
for (const { repo } of ghMerges) {
  const where = cdCwd || getCwd(payload);
  const name = repo ?? originRepoName(where);
  const tier = repo ? tierOfRepoName(repo) : repoTier(where);
  if (tier !== "free") {
    deny(
      `${name || "(레포 이름 미확인)"}의 PR을 gh로 머지하려 했습니다 — 원격 보호 브랜치를 바로 바꾸므로 push와 같이 막습니다. ` +
        "FREE 등급이 아닌 레포의 PR 머지는 사용자가 합니다.",
    );
  }
}
if (pushInvocations.length === 0) process.exit(0);

// FREE 등급 레포에서는 이 정책을 통째로 걷는다. chain 검사보다 먼저 본다 —
// 뒤에 두면 FREE 레포의 `reset && push --force`가 여기서 먼저 막힌다.
if (allInFreeRepos(pushInvocations, getCwd(payload))) process.exit(0);

// chained 우회 차단: 같은 명령에 history rewrite와 force push가 함께 들어오면, PreToolUse 훅은
// rewrite 실행 전 상태로 1회만 검사하므로 push 시점의 실제 diff를 못 본다 (reset && push --force 패턴).
// 둘이 한 명령에 공존하면 deny하고 분리 실행을 안내한다 — 분리하면 두 번째 push가 정상 검증된다.
const forcePushPresent = pushInvocations.some((inv) =>
  inv.args.some((t) => /^(--force|--force-with-lease|-f)$|^--force-with-lease=/.test(t)),
);
if (forcePushPresent && findHistoryRewrites(cmd).length > 0) {
  deny(
    "history rewrite(reset --soft/--mixed/--hard, rebase, cherry-pick, commit --amend)와 force push를 한 명령으로 chain하면 훅이 push 시점 상태를 검증하지 못합니다. 두 명령을 분리해 각각 실행하세요 (rewrite 먼저 → 그다음 force push).",
  );
}

const protectedBranches = /^(master|main|develop|release)$/;

for (const inv of pushInvocations) {
  if (inv.args.includes("--no-verify")) {
    deny("--no-verify 금지. pre-push hook을 우회하지 마세요.");
  }

  // git -C <path>가 우선. 없으면 cd 추출 cwd로 fallback.
  const invCwd = normalizeCwd(inv.cwd) || cdCwd;
  const gitOpts = invCwd ? { encoding: "utf8", cwd: invCwd } : { encoding: "utf8" };
  const gitOptsQuiet = { ...gitOpts, stdio: "pipe" };
  const tier = repoTier(invCwd || getCwd(payload));

  let branch;
  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD", gitOpts).trim();
  } catch (e) {
    // execSync throw 시 process가 비정상 종료되어 deny()가 호출되지 못한다 → 보호 브랜치 검증 우회.
    deny(`Hook이 브랜치를 확인할 수 없습니다 (cwd=${invCwd ?? "<inherit>"}): ${e.message}`);
  }
  const targetBranch = extractPushTargetBranch(inv.args) || branch;

  if (tier !== "free") {
    const repo = originRepoName(invCwd || getCwd(payload)) || "(레포 이름 미확인)";
    // --all·--mirror는 refspec 없이 보호 브랜치까지 함께 민다.
    if (inv.args.some((t) => t === "--all" || t === "--mirror")) {
      deny(`${repo}의 모든 브랜치를 push하려 했습니다(보호 브랜치 포함) — ${PUSH_TAIL[tier]}`);
    }
    if (protectedBranches.test(targetBranch) && !isFirstPush(inv.args, gitOptsQuiet)) {
      const source = extractPushSource(inv.args, branch);
      deny(`${repo}의 ${targetBranch} 보호 브랜치에 ${source}을(를) push하려 했습니다 — ${PUSH_TAIL[tier]}`);
    }
  }

  try {
    const prState = execSync(`gh pr view ${targetBranch} --json state -q .state`, gitOptsQuiet).toString().trim();
    if (prState === "OPEN") {
      deny(`${targetBranch} 브랜치에 열린 PR이 있어 AI 푸시를 막습니다 — 사용자가 직접 푸시하세요.`);
    }
  } catch {
    // No PR, gh unavailable, or no GitHub remote. Continue with local checks.
  }

  if (inv.args.some((t) => /^(--force|--force-with-lease|-f)$|^--force-with-lease=/.test(t))) {
    try {
      execSync(`git fetch origin ${branch}`, gitOptsQuiet);
    } catch {
      continue;
    }

    try {
      execSync(`git diff origin/${branch} HEAD --quiet`, gitOptsQuiet);
    } catch {
      deny(`force push 차단: origin/${branch}과 코드가 다릅니다. 히스토리 정리(squash, reword)만 허용됩니다.`);
    }
  }
}

function findHistoryRewrites(command) {
  const out = [];
  for (const seg of splitSegments(command)) {
    const tokens = tokenize(seg);
    for (let i = 0; i < tokens.length; i += 1) {
      if (tokens[i] !== "git") continue;
      const parsed = parseGitInvocation(tokens, i + 1);
      if (parsed && isHistoryRewrite(parsed)) out.push(parsed);
      break;
    }
  }
  return out;
}

function isHistoryRewrite(parsed) {
  const { subcommand, args } = parsed;
  if (subcommand === "rebase" || subcommand === "cherry-pick") return true;
  if (subcommand === "reset") return args.some((t) => /^--(soft|mixed|hard|keep|merge)$/.test(t));
  if (subcommand === "commit") return args.some((t) => t === "--amend");
  return false;
}

// 원격 이름·refspec 자리. 값을 따로 받는 옵션(`-o ci.skip`)은 값까지 건너뛴다 — 안 그러면 값이
// 원격 이름으로, 원격 이름이 refspec으로 밀려 보호 브랜치 판정이 통째로 빗나간다.
function pushPositionals(args) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    const t = args[i];
    if (!t) continue;
    if (t === "-o" || t === "--push-option") i += 1;
    else if (!t.startsWith("-")) out.push(t);
  }
  return out;
}

// 원격에 브랜치가 하나도 없으면 첫 push다 — 빈 레포에는 PR을 받을 base가 없어 보호 브랜치에 바로 민다.
// 대상 브랜치 하나만 없는지 보면 base가 있는 레포에도 `release` 같은 보호 브랜치를 새로 만들게 된다.
// 조회가 실패하면(원격 없음·네트워크) 첫 push로 보지 않는다 — 모를 때 막는 쪽으로 틀린다.
function isFirstPush(args, gitOpts) {
  const remote = pushPositionals(args)[0] || "origin";
  const res = spawnSync("git", ["ls-remote", "--heads", remote], { ...gitOpts, timeout: 15000 });
  return res.status === 0 && String(res.stdout).trim() === "";
}

// 보호 브랜치로 들어가는 쪽. `src:dst`면 src, 콜론 없는 refspec이면 같은 이름의 로컬 브랜치,
// refspec이 없거나 src가 HEAD면 현재 브랜치다.
function extractPushSource(args, currentBranch) {
  const refspec = pushPositionals(args)[1];
  if (!refspec) return currentBranch;
  const src = (refspec.includes(":") ? refspec.split(":")[0] : refspec).replace(/^\+/, "").replace(/^refs\/heads\//, "");
  return !src || src === "HEAD" ? currentBranch : src;
}

function extractPushTargetBranch(args) {
  const positional = pushPositionals(args);

  const refspec = positional[1];
  if (!refspec) return null;

  // 강제 표시 `+`를 벗긴다 — 남기면 `+master`가 보호 브랜치 이름과 안 맞아 검사를 빠져나간다.
  const branch = (refspec.includes(":") ? refspec.split(":").pop() : refspec).replace(/^\+/, "");
  if (!branch || branch === "HEAD") return null;
  return branch.replace(/^refs\/heads\//, "");
}
