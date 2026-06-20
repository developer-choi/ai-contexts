const fs = require("fs");

function readPayload() {
  return JSON.parse(fs.readFileSync(0, "utf8"));
}

function getCommand(payload) {
  return payload.tool_input && typeof payload.tool_input.command === "string" ? payload.tool_input.command : "";
}

function getCwd(payload) {
  return typeof payload.cwd === "string" ? payload.cwd : "";
}

function getSessionId(payload) {
  return typeof payload.session_id === "string" ? payload.session_id : "";
}

function decide(permissionDecision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision,
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

function deny(reason) {
  decide("deny", reason);
}

// allowlist에 Bash/PowerShell이 있어도 사용자에게 권한 프롬프트를 띄운다(ask가 allow를 덮음).
function ask(reason) {
  decide("ask", reason);
}

function addContext(context, hookEventName = "UserPromptSubmit") {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName,
        additionalContext: context,
      },
    }),
  );
  process.exit(0);
}

module.exports = {
  deny,
  ask,
  addContext,
  getCommand,
  getCwd,
  getSessionId,
  readPayload,
};
