import { installMissingWorktreeDeps } from "./worktree-install-core.mjs";

// EnterWorktree 툴로 워크트리를 만들거나 들어간 직후 의존성을 채운다.
// 이 툴은 명령 문자열이 없으므로 방아쇠 없이 바로 훑는다 — 대상 판정은 Bash 쪽과 동일하게
// git 워크트리 목록에서 나온다 (worktree-install-core.mjs).
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
