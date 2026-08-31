import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { allInPolicyExemptRepos } from "./policy-exempt-repos.mjs";
import { findGitInvocations, normalizeCwd } from "./git-command-parser.mjs";
import { deny, getCommand, getCwd, readPayload } from "./hook-utils.mjs";

// 보호 브랜치(master/main/develop/release)로의 머지·포인터 이동을 AI가 직접 못 하게 막는다.
// 머지 결정은 사용자 몫이라 hook은 AI 도구 호출만 게이트한다(사용자 터미널 명령엔 영향 없음).
// 두 갈래로 차단한다:
//   1. 정적 매칭 — 보호 브랜치명이 인자에 직접 노출: branch -f/--force, checkout -B, switch -C.
//   2. HEAD 기반 — 타깃이 현재 체크아웃 브랜치라 인자에 안 나옴: merge/pull/rebase/cherry-pick.
//      이 경우만 `git rev-parse --abbrev-ref HEAD`로 현재 브랜치를 읽어 보호 여부를 판정한다.
//      예외: `merge --ff-only`로 현재 보호 브랜치를 자기 upstream에 따라잡는 동기화(origin/main→main)는 허용한다(isUpstreamCatchUp).
//      결정이 끝난 원격 커밋을 로컬에 맞추는 ff라 사용자 결정이 아니다. feature→master 같은 통합 ff는 그대로 차단.
// push(refspec→보호 브랜치)는 check-git-push-policy.mjs가 이미 담당하므로 여기서 중복 처리하지 않는다
// (한 명령에 deny가 두 번 뜨는 것을 막는다). reset 포인터 이동은 check-git-reset-policy.mjs 담당.
const payload = readPayload();
const cmd = getCommand(payload);
if (typeof cmd !== "string") process.exit(0);
if (!/\b(merge|pull|rebase|cherry-pick|branch|checkout|switch)\b/.test(cmd)) process.exit(0);

const PROTECTED = /^(master|main|develop|release)$/;
// 면제 안내를 첫 문장에 두는 이유: check-md-hook-restatement가 이 메시지를 md 작성 화면에
// 주입할 때 160자에서 자른다. 뒤에 두면 잘려나가, 면제 레포에서 md를 쓰는 AI가 "여기도 막힌다"로
// 읽는다 (2026-08-29 PP 세션 실측: 주입 2회, AI가 면제 레포에서 머지를 사용자에게 떠넘김).
const MERGE_MSG =
  "보호 브랜치(master/main/develop/release)로의 머지·포인터 이동은 사용자 결정 사항입니다 — 단 git 정책 면제 레포(policy-exempt-repos.mjs의 POLICY_EXEMPT_REPOS)는 면제되어 AI가 직접 머지합니다. " +
  "면제 아닌 레포에서는 AI가 직접 실행하지 말고(merge/pull/rebase/cherry-pick, branch -f, checkout -B, switch -C), " +
  "머지 직전까지(워크트리 커밋·rebase) 끝낸 뒤 실행할 명령을 사용자에게 안내하세요 (예: `git merge --ff-only <branch>`). " +
  "지금 따르는 스킬·절차가 면제 아닌 레포에서 직접 머지하라고 지시하고 있다면, 이참에 그 절차를 '사용자에게 머지를 안내'하는 수준으로 고쳐 두세요 (전수 수정 불필요 — 마주칠 때마다 점진 이관).";

// 판정 불가로 차단할 때의 안내. MERGE_MSG와 분리한다 — 여기서 걸린 명령은 보호 브랜치를 건드리는지
// 아직 모르는 상태라, "사용자에게 머지를 안내하라"가 아니라 "경로를 통째로 적어 다시 실행하라"가 답이다.
const UNRESOLVED_CWD_MSG = (cwd) =>
  `훅이 판정할 작업 폴더를 찾지 못했습니다 (cwd=${cwd}). 경로를 셸 변수로 넘기면(\`K=<path>; git -C "$K" merge …\`) ` +
  "훅은 셸 확장 전 원문을 받아 보호 브랜치 머지 판정을 돌리지 못하므로 차단합니다. " +
  '경로를 통째로 적어 다시 실행하세요 (예: `git -C "<레포 절대경로>" merge --ff-only <branch>`).';

const cdMatch = cmd.match(/(?:^|[;&|])\s*cd\s+(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/);
const cdCwd = normalizeCwd(cdMatch && (cdMatch[1] || cdMatch[2] || cdMatch[3]));

// 면제 레포(policy-exempt-repos.mjs)에서는 이 정책을 통째로 걷는다. 이 훅이 보는 호출을 다 모아
// 한 번에 판정한다 — 아래 두 갈래(정적 매칭·HEAD 기반)가 같은 기준으로 갈려야 한다.
const GATED_SUBCOMMANDS = ["branch", "checkout", "switch", "merge", "pull", "rebase", "cherry-pick"];
const gated = GATED_SUBCOMMANDS.flatMap((sub) => findGitInvocations(cmd, sub));
if (allInPolicyExemptRepos(gated, cdCwd || getCwd(payload))) process.exit(0);

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
for (const sub of ["merge", "pull", "rebase", "cherry-pick"]) {
  for (const inv of findGitInvocations(cmd, sub)) {
    if (inv.args.some((t) => CONTROL.test(t))) continue;
    const invCwd = normalizeCwd(inv.cwd) || cdCwd;
    // 폴더를 못 정하면 통과시키지 않는다(policy-exempt-repos.mjs의 판정 불가 처리와 같은 방향).
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
    deny(MERGE_MSG);
  }
}

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

function flagValues(args, ...flags) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    if (flags.includes(args[i]) && args[i + 1] && !args[i + 1].startsWith("-")) out.push(args[i + 1]);
  }
  return out;
}
