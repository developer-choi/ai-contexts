import { readPayload, getCwd } from "./hook-utils.mjs";
import { installWorktreeDeps } from "./worktree-install-core.mjs";

// EnterWorktree 툴은 세션 cwd를 새 워크트리(.claude/worktrees/<name>)로 전환한다.
// 그래서 PostToolUse payload.cwd가 곧 새 워크트리 경로다. 거기에 의존성을 설치해
// AI가 새 워크트리에서 바로 커밋할 수 있게 한다(DX). 훅 발동 자체는 추적되는 .githooks가
// 보장하므로 이 설치는 안전이 아니라 편의다.
const payload = readPayload();
const cwd = getCwd(payload);
if (!cwd) process.exit(0);

const result = installWorktreeDeps(cwd);
if (!result.ran) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: result.message,
    },
  }),
);
process.exit(0);
