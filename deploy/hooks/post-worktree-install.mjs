import { readPayload, getCommand } from "./hook-utils.mjs";
import { installMissingWorktreeDeps } from "./worktree-install-core.mjs";

// Bash·PowerShell·Monitor 로 워크트리를 만든 직후 의존성을 채운다.
//
// 명령 문자열은 "워크트리를 만들었는가"를 가리는 방아쇠로만 쓴다. 대상 경로는 파싱하지 않고
// git 에게 묻는다 (worktree-install-core.mjs). 그래서 git -C·셸 변수·cd 어느 형태로 만들어도
// 결과가 같다. 방아쇠가 넓게 잡혀 헛돌아도 설치는 멱등이라 해가 없다.
const command = getCommand(readPayload());
if (!command || !/worktree\s+add/.test(command)) process.exit(0);

const messages = installMissingWorktreeDeps();
if (messages.length === 0) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: messages.join("\n"),
    },
  }),
);
process.exit(0);
