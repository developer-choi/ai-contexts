import { execSync } from "node:child_process";
import { readPayload } from "./hook-utils.mjs";

const payload = readPayload();
const filePath = payload.tool_input && typeof payload.tool_input.file_path === "string" ? payload.tool_input.file_path : "";

if (!filePath || /[/\\](evals|workspace)[/\\]/.test(filePath)) process.exit(0);

try {
  execSync(`git ls-files --error-unmatch "${filePath}"`, { stdio: "pipe" });
} catch {
  try {
    execSync(`git add "${filePath}"`, { stdio: "pipe" });
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
