import { execSync } from "node:child_process";
import { findGitInvocations, normalizeCwd, parseGitInvocation, splitSegments, tokenize } from "./git-command-parser.mjs";
import { ask, deny, getCommand, readPayload } from "./hook-utils.mjs";

const cmd = getCommand(readPayload());
if (typeof cmd !== "string") process.exit(0);

const pushInvocations = findGitInvocations(cmd, "push");
if (pushInvocations.length === 0) process.exit(0);

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

const cdMatch = cmd.match(/(?:^|[;&|])\s*cd\s+(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/);
let cdCwd = cdMatch && (cdMatch[1] || cdMatch[2] || cdMatch[3]);
cdCwd = normalizeCwd(cdCwd);

const protectedBranches = /^(master|main|develop|release)$/;

for (const inv of pushInvocations) {
  if (inv.args.includes("--no-verify")) {
    deny("--no-verify 금지. pre-push hook을 우회하지 마세요.");
  }

  // git -C <path>가 우선. 없으면 cd 추출 cwd로 fallback.
  const invCwd = normalizeCwd(inv.cwd) || cdCwd;
  const gitOpts = invCwd ? { encoding: "utf8", cwd: invCwd } : { encoding: "utf8" };
  const gitOptsQuiet = { ...gitOpts, stdio: "pipe" };

  const explicitTarget = extractPushTargetBranch(inv.args);

  if (explicitTarget && protectedBranches.test(explicitTarget)) {
    ask(`${explicitTarget} 보호 브랜치에 push합니다. 승인하면 진행합니다.`);
  }

  let branch;
  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD", gitOpts).trim();
  } catch (e) {
    // execSync throw 시 process가 비정상 종료되어 deny()가 호출되지 못한다 → 보호 브랜치 검증 우회.
    deny(`Hook이 브랜치를 확인할 수 없습니다 (cwd=${invCwd ?? "<inherit>"}): ${e.message}`);
  }
  const targetBranch = explicitTarget || branch;

  if (protectedBranches.test(targetBranch)) {
    ask(`${targetBranch} 보호 브랜치에 push합니다. 승인하면 진행합니다.`);
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

function extractPushTargetBranch(args) {
  const positional = [];
  for (const token of args) {
    if (!token) continue;
    if (token.startsWith("-")) continue;
    positional.push(token);
  }

  const refspec = positional[1];
  if (!refspec) return null;

  const branch = refspec.includes(":") ? refspec.split(":").pop() : refspec;
  if (!branch || branch === "HEAD") return null;
  return branch.replace(/^refs\/heads\//, "");
}
