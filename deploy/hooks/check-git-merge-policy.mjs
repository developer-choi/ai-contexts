import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { allInFreeRepos, originRepoName, repoTier } from "./repo-tiers.mjs";
import { findGitInvocations, invocationCwd } from "./git-command-parser.mjs";
import { ask, deny, getCommand, getCwd, readPayload } from "./hook-utils.mjs";

// 보호 브랜치(master/main/develop/release)로의 머지·포인터 이동을 AI가 사용자 결정 없이 못 하게 한다.
// hook은 AI 도구 호출만 게이트한다(사용자 터미널 명령엔 영향 없음).
// 두 갈래로 판정한다:
//   1. 정적 매칭 — 보호 브랜치명이 인자에 직접 노출: branch -f/--force, checkout -B, switch -C. 차단.
//   2. HEAD 기반 — 타깃이 현재 체크아웃 브랜치라 인자에 안 나옴: merge/pull/rebase/cherry-pick.
//      이 경우만 `git rev-parse --abbrev-ref HEAD`로 현재 브랜치를 읽어 보호 여부를 판정한다.
//      merge는 승인 등급 레포면 승인 창(ask)으로 사용자 결정을 받는다 — 사용자가 터미널에서 손으로 치던 것을
//      승인 한 번으로 줄이되, 결정 주체는 그대로 사용자다. PR 전용 레포는 차단(PR로만 들어간다).
//      pull/rebase/cherry-pick은 차단 유지.
//      예외: `merge --ff-only`로 현재 보호 브랜치를 자기 upstream에 따라잡는 동기화(origin/main→main)는 묻지 않고 허용한다(isUpstreamCatchUp).
//      결정이 끝난 원격 커밋을 로컬에 맞추는 ff라 사용자 결정이 아니다.
// push(refspec→보호 브랜치)는 check-git-push-policy.mjs가 이미 담당하므로 여기서 중복 처리하지 않는다
// (한 명령에 deny가 두 번 뜨는 것을 막는다). reset 포인터 이동은 check-git-reset-policy.mjs 담당.
const payload = readPayload();
const cmd = getCommand(payload);
if (typeof cmd !== "string") process.exit(0);
if (!/\b(merge|pull|rebase|cherry-pick|branch|checkout|switch)\b/.test(cmd)) process.exit(0);

const PROTECTED = /^(master|main|develop|release)$/;
// 면제 안내를 첫 문장에 두는 이유: check-md-hook-restatement가 이 메시지를 md 작성 화면에
// 주입할 때 160자에서 자른다. 뒤에 두면 잘려나가, FREE 레포에서 md를 쓰는 AI가 "여기도 막힌다"로
// 읽는다 (2026-08-29 PP 세션 실측: 주입 2회, AI가 면제 레포에서 머지를 사용자에게 떠넘김).
// 머지는 MERGE_ASK가 다루므로 이 문구는 pull·rebase·cherry-pick·포인터 이동만 다룬다. 마지막 문장은
// 여기 걸린 AI가 실은 작업 브랜치를 통합하려던 것일 때 갈 길이다.
const MERGE_MSG =
  "보호 브랜치(master/main/develop/release) 위의 pull·rebase·cherry-pick·포인터 강제 이동은 사용자 결정 사항입니다 — 단 FREE 등급 레포(repo-tiers.mjs)는 면제되어 AI가 직접 실행합니다. " +
  "그 밖의 레포에서는 AI가 직접 실행하지 말고(pull/rebase/cherry-pick, branch -f, checkout -B, switch -C) 실행할 명령을 사용자에게 안내하세요. " +
  "작업 브랜치를 보호 브랜치에 넣는 것은 이 명령들 대신 머지 직전까지(워크트리 커밋·rebase) 끝낸 뒤 승인 등급 레포면 `git -C <레포 절대경로> merge --ff-only <branch>`를 내면 승인 창이 뜨고(서브에이전트는 메인에 요청), PR 전용 레포면 작업 브랜치를 push해 PR을 엽니다.";

// PR 전용 레포의 보호 브랜치 머지 차단 사유. 승인 창 사유(MERGE_ASK)와 같은 세 가지를 보인다.
const MERGE_PR_ONLY = ({ repo, branch, source }) =>
  `${repo || "(레포 이름 미확인)"}의 ${branch} 보호 브랜치에 ${source}을(를) 머지하려 했습니다 — PR 전용 레포는 보호 브랜치에 머지하지 않습니다. 작업 브랜치를 push하고 PR을 여세요.`;

// 보호 브랜치 머지의 승인 창 사유. 명령 원문만으로는 `git -C <경로>`가 어느 레포인지 한눈에 안 읽히므로
// 레포 이름·대상 브랜치·들어갈 브랜치를 문장으로 풀어 적는다.
const MERGE_ASK = ({ repo, branch, source }) =>
  `${repo || "(레포 이름 미확인)"}의 ${branch} 보호 브랜치에 ${source}을(를) 머지합니다.`;

// 승인 창에는 명령과 도구 호출 설명(description)만 보인다. 한 줄 설명으로는 사용자가 무엇을 들이는지
// 판단할 근거가 없어, 한 번 거절하고 사유를 되물은 뒤에야 승인했다(2026-09-26 AC 938561b0). 설명이 짧으면
// 승인 창을 띄우지 않고 돌려보낸다. 양식은 정하지 않는다 — 무엇이 필요한지는 세션이 안다.
// 줄 수는 대리 지표다. 내용은 보지 않아 커밋 목록 네 줄로도 통과한다 — 막는 것은 한 줄짜리 설명뿐이다.
// 4는 무엇·왜·확인·되돌리기를 한 줄씩만 적어도 닿는 최소치다.
const MIN_SUMMARY_LINES = 4;
const MERGE_NEEDS_SUMMARY =
  "승인 창에는 명령과 이 호출의 설명(description)만 보여, 지금 설명으로는 사용자가 이 머지를 판단할 근거가 없습니다. " +
  `이 브랜치에서 한 일을 사용자가 읽기 좋게 줄을 나눠(비어 있지 않은 줄 ${MIN_SUMMARY_LINES}줄 이상) 요약해 description에 싣고 같은 명령을 다시 내세요 — ` +
  "무엇을 왜 바꿨는지, 어떻게 확인했는지처럼 머지를 정하는 데 필요한 것을 담습니다.";
// description 필드가 있는 호출에만 요구한다. 이 훅은 codex에도 실리는데 거기엔 이 필드가 없어,
// 요구하면 따를 방법이 없는 거부가 된다. 필드가 없으면 예전처럼 승인 창으로 간다.
const DESCRIBED_TOOLS = new Set(["Bash", "PowerShell"]);
const lacksSummary = (payload) => {
  const input = payload.tool_input ?? {};
  if (!DESCRIBED_TOOLS.has(payload.tool_name) || !("description" in input)) return false;
  const d = typeof input.description === "string" ? input.description : "";
  return d.split("\n").filter((l) => l.trim()).length < MIN_SUMMARY_LINES;
};

// 판정 불가로 차단할 때의 안내. MERGE_MSG·MERGE_ASK와 분리한다 — 그 둘은 보호 브랜치를 건드린다고 판정된
// 뒤의 안내이고, 여기서 걸린 명령은 아직 그걸 모르는 상태라 "경로를 통째로 적어 다시 실행하라"가 답이다.
const UNRESOLVED_CWD_MSG = (cwd) =>
  `훅이 판정할 작업 폴더를 찾지 못했습니다 (cwd=${cwd}). 경로를 셸 변수로 넘기면(\`K=<path>; git -C "$K" merge …\`) ` +
  "훅은 셸 확장 전 원문을 받아 보호 브랜치 머지 판정을 돌리지 못하므로 차단합니다. " +
  '경로를 통째로 적어 다시 실행하세요 (예: `git -C "<레포 절대경로>" merge --ff-only <branch>`).';

// 호출마다 실제로 도는 폴더(git -C → 폴더 이동 → 세션 폴더 순)를 cwd에 담아 둔다.
const sessionCwd = getCwd(payload);
const invocations = (sub) => findGitInvocations(cmd, sub).map((inv) => ({ ...inv, cwd: invocationCwd(inv, sessionCwd) }));

// FREE 등급 레포(repo-tiers.mjs)에서는 이 정책을 통째로 걷는다. 이 훅이 보는 호출을 다 모아
// 한 번에 판정한다 — 아래 두 갈래(정적 매칭·HEAD 기반)가 같은 기준으로 갈려야 한다.
const GATED_SUBCOMMANDS = ["branch", "checkout", "switch", "merge", "pull", "rebase", "cherry-pick"];
const gated = GATED_SUBCOMMANDS.flatMap(invocations);
if (allInFreeRepos(gated, sessionCwd)) process.exit(0);

// --- 1. 정적 매칭: 포인터를 보호 브랜치로 강제 이동/재설정하는 명령 ---
// branch -f <protected> [start] — 첫 positional(이동 대상 브랜치명)만 본다.
//   `branch -f feature master`(feature를 master 위치로 생성)는 차단 대상이 아니다.
for (const inv of findGitInvocations(cmd, "branch")) {
  const forced = inv.args.some((t) => t === "-f" || t === "--force");
  const first = inv.args.find((t) => !t.startsWith("-"));
  if (forced && first && PROTECTED.test(stripRef(first))) deny(MERGE_MSG);
}
// checkout -B <protected> / switch -C|--force-create <protected> — 플래그 다음 토큰이 새 브랜치명.
for (const inv of findGitInvocations(cmd, "checkout")) {
  if (flagValues(inv.args, "-B").some((v) => PROTECTED.test(stripRef(v)))) deny(MERGE_MSG);
}
for (const inv of findGitInvocations(cmd, "switch")) {
  if (flagValues(inv.args, "-C", "--force-create").some((v) => PROTECTED.test(stripRef(v)))) deny(MERGE_MSG);
}

// --- 2. HEAD 기반: 타깃이 현재 브랜치인 명령 ---
const CONTROL = /^--(abort|continue|skip|quit|edit-todo)$/; // 진행 중 작업 복구/중단은 허용
// 승인 창은 모든 호출을 다 본 뒤에 띄운다 — ask()는 그 자리에서 종료하므로, 같은 명령 뒤쪽의 차단
// 대상(`merge feature && git rebase …`)이 승인 창 한 번에 묻혀 함께 실행되지 않게 한다.
const merges = [];
for (const sub of ["merge", "pull", "rebase", "cherry-pick"]) {
  for (const inv of invocations(sub)) {
    if (inv.args.some((t) => CONTROL.test(t))) continue;
    const invCwd = inv.cwd;
    // 폴더를 못 정하면 통과시키지 않는다(repo-tiers.mjs의 판정 불가 처리와 같은 방향).
    // 훅은 셸이 변수를 풀기 전의 명령 원문을 받으므로 `K=<path>; git -C "$K" merge`의 cwd는 `$K`라는
    // 글자 그대로 들어오고, 그 폴더에서 브랜치를 못 읽어 아래 fail-open으로 흘러 판정이 통째로
    // 사라졌다 (2026-08-29 KA `main` 무단 머지 사고, 08-30 재현: 같은 merge를 통째 경로로는 막고
    // 셸 변수로는 통과시켰다). detached HEAD는 폴더가 실존해 이 갈래에 안 걸리고 fail-open이 받는다.
    if (invCwd && !existsSync(invCwd)) deny(UNRESOLVED_CWD_MSG(invCwd));
    const gitOpts = invCwd ? { encoding: "utf8", cwd: invCwd, stdio: "pipe" } : { encoding: "utf8", stdio: "pipe" };
    let branch;
    try {
      branch = execSync("git rev-parse --abbrev-ref HEAD", gitOpts).toString().trim();
    } catch {
      // fail-open: 비-git 디렉터리거나 detached HEAD(=보호 브랜치가 아님). push hook의 fail-closed와
      // 의도적으로 반대 — merge/rebase의 흔한 정상 상태(detached)를 오차단하지 않기 위함. 정적 매칭은 그대로 보호.
      continue;
    }
    if (!PROTECTED.test(branch)) continue;
    // 예외: 현재 보호 브랜치를 자기 upstream으로 따라잡는 `merge --ff-only`만 허용(동기화이지 결정이 아님).
    if (sub === "merge" && isUpstreamCatchUp(inv, gitOpts)) continue;
    if (sub === "merge") {
      const merge = { repo: originRepoName(gitOpts.cwd), branch, source: mergeSources(inv.args) };
      if (repoTier(gitOpts.cwd) === "pr-only") deny(MERGE_PR_ONLY(merge));
      merges.push(merge);
      continue;
    }
    deny(MERGE_MSG);
  }
}

// 서브에이전트는 ask()가 어차피 거부하고 메인에 넘기므로 요약을 요구하지 않는다.
if (merges.length > 0 && !payload.agent_id && lacksSummary(payload)) deny(MERGE_NEEDS_SUMMARY);
if (merges.length > 0) ask(merges.map(MERGE_ASK).join(" / "));

process.exit(0);

// --- helpers ---
function stripRef(value) {
  return value.replace(/^refs\/heads\//, "");
}

// `merge --ff-only`가 '현재 브랜치를 자기 upstream(예: origin/main)으로 따라잡기'인지 판정한다.
// --ff-only가 없거나, upstream 미설정이거나, 머지 대상이 upstream이 아니면 false(=차단 유지) —
// feature→master 같은 통합 ff를 따라잡기로 오인하지 않게 한다. ff 불가 시엔 git이 거부하므로 데이터 위험도 없다.
function isUpstreamCatchUp(inv, gitOpts) {
  if (!inv.args.includes("--ff-only")) return false;
  let upstream;
  try {
    upstream = execSync("git rev-parse --abbrev-ref --symbolic-full-name @{u}", gitOpts).toString().trim();
  } catch {
    return false;
  }
  const positionals = inv.args.filter((t) => !t.startsWith("-"));
  if (positionals.length === 0) return true; // 인자 없는 `merge --ff-only` = @{u} 머지 = 따라잡기
  if (positionals.length > 1) return false;
  const ref = stripRef(positionals[0]);
  return ref === upstream || ref === "@{u}" || ref === "@{upstream}";
}

// 머지로 들어갈 브랜치(들). 값을 받는 옵션의 값은 건너뛴다 — `-m "msg" feature`의 msg를 브랜치로 적지 않게.
// 인자가 없으면 git이 upstream을 머지한다.
function mergeSources(args) {
  const VALUED = new Set(["-m", "-F", "-s", "-X", "--file", "--strategy", "--strategy-option", "--cleanup", "--into-name"]);
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    if (VALUED.has(args[i])) i += 1;
    else if (!args[i].startsWith("-")) out.push(args[i]);
  }
  return out.length > 0 ? out.join(", ") : "upstream";
}

function flagValues(args, ...flags) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    if (flags.includes(args[i]) && args[i + 1] && !args[i + 1].startsWith("-")) out.push(args[i + 1]);
  }
  return out;
}
