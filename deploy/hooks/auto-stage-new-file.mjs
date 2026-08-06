import { execSync } from "node:child_process";
import path from "node:path";
import { readPayload } from "./hook-utils.mjs";

const payload = readPayload();
const filePath = payload.tool_input && typeof payload.tool_input.file_path === "string" ? payload.tool_input.file_path : "";

if (!filePath || /[/\\](evals|workspace)[/\\]/.test(filePath)) process.exit(0);

// 파일이 속한 폴더에서 실행한다. cwd를 안 주면 세션이 열려 있는 레포에서 돌아, 다른 레포에
// 만든 파일은 "이 레포 밖 경로"로 실패하고 그 실패가 아래 catch에 삼켜진다 — 자동 staging이
// 통째로 안 걸린 채 조용히 넘어간다(2026-08-06 backlog 레포 새 파일 6개가 커밋에서 누락).
const cwd = path.dirname(filePath);

try {
  execSync(`git ls-files --error-unmatch "${filePath}"`, { stdio: "pipe", cwd });
} catch {
  try {
    execSync(`git add "${filePath}"`, { stdio: "pipe", cwd });
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `새 파일 자동 staged: ${filePath}`,
        },
      }),
    );
  } catch {}
}
