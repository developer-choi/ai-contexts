const { execSync } = require("child_process");
const { readPayload } = require("./hook-utils");

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
          additionalContext: `New file auto-staged: ${filePath}`,
        },
      }),
    );
  } catch {}
}
