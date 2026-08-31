import { allInPolicyExemptRepos } from "./policy-exempt-repos.mjs";
import { findGitInvocations } from "./git-command-parser.mjs";
import { deny, getCommand, getCwd, readPayload } from "./hook-utils.mjs";

// git reset --hard / --mixed 금지. --soft만 허용한다. AI는 무조건 차단하고, 정말 필요하면
// 사용자가 직접 실행한다 (hook은 AI 도구 호출만 게이트하므로 사용자 터미널 명령엔 영향 없음).
// 두 플래그의 사유는 다르다:
//   --hard  → 워킹 디렉터리 미커밋 변경 + reset으로 건너뛴 미푸시 커밋을 되돌릴 수 없게 지움 (파괴적).
//   --mixed → 유실은 아니지만 staged 변경을 모두 unstage. --soft만 허용하는 이유.
// 이 훅이 reset 정책의 단일 창구다 (git -C·chain까지 파싱). 거친 정규식 차단은 두지 않는다 —
// check-shell-policy.js에 같은 차단을 또 두면 한 명령에 deny 메시지가 두 번 뜬다.
// git 상태와 무관한 정적 패턴 매칭이라 PreToolUse 타이밍 갭이 없다.
const payload = readPayload();
const cmd = getCommand(payload);
if (typeof cmd !== "string" || !/\breset\b/.test(cmd)) process.exit(0);

const resets = findGitInvocations(cmd, "reset");
// 면제 레포(policy-exempt-repos.mjs)에서는 이 정책을 통째로 걷는다.
if (allInPolicyExemptRepos(resets, getCwd(payload))) process.exit(0);

const hard = resets.some((inv) => inv.args.includes("--hard"));
const mixed = resets.some((inv) => inv.args.includes("--mixed"));

if (hard || mixed) {
  const used = [hard && "--hard", mixed && "--mixed"].filter(Boolean).join(" / ");
  const reasons = [];
  if (hard) reasons.push("--hard는 워킹 디렉터리의 미커밋 변경과 reset으로 건너뛴 미푸시 커밋을 되돌릴 수 없게 지웁니다");
  if (mixed) reasons.push("--mixed는 staged 변경을 모두 unstage합니다");
  deny(
    `git reset ${used} 금지, --soft만 사용하세요 — 단 git 정책 면제 레포(policy-exempt-repos.mjs의 POLICY_EXEMPT_REPOS)는 면제입니다. ` +
      `${reasons.join(". ")}. 정말 필요하면 사용자에게 직접 실행을 요청하세요.`,
  );
}

process.exit(0);
