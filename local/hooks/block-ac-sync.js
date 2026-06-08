// AC 프로젝트 로컬 정책 훅: 에이전트(Claude·Codex)가 `npm run sync:*`를 직접 실행하지
// 못하게 막는다. sync 스크립트는 사용자만 실행한다. 사용자는 `! npm run sync:...`로
// 직접 실행할 수 있다.
//
// 이 파일은 `local/hooks/`의 원본이며, `npm run sync:local-system`이 repo-local
// `.claude/hooks/`·`.codex/hooks/`로 배포한다. 직접 산출물을 수정하지 말 것.
const fs = require("fs");

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    return null;
  }
}

// Claude(tool_input.command) / Codex(toolCall.args.CommandLine 등) 페이로드 모양을 모두 커버.
function getCommand(payload) {
  if (!payload) return "";

  return (
    payload?.tool_input?.command ??
    payload?.tool_input?.args?.command ??
    payload?.toolCall?.args?.CommandLine ??
    payload?.toolCall?.args?.command ??
    ""
  );
}

const cmd = getCommand(readInput());

// 명령 경계(시작·연결자)에 앵커한다. echo·grep 등에 "npm run sync:" 문자열이 들어가도
// 그건 차단하지 않고, 실제로 명령으로 실행되는 경우만 막는다.
if (/(?:^|&&|\|\||[;|]|\$\(|`)\s*npm\s+run\s+sync:/.test(cmd)) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "npm run sync:* is reserved for the user only. The agent must not call sync scripts. The user runs them with `! npm run sync:...`.",
      },
    }),
  );
}

process.exit(0);
