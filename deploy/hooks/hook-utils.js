const fs = require("fs");

function readPayload() {
  return JSON.parse(fs.readFileSync(0, "utf8"));
}

function getCommand(payload) {
  if (!payload.tool_input) return "";
  if (typeof payload.tool_input.command === "string") return payload.tool_input.command;
  if (typeof payload.tool_input.CommandLine === "string") return payload.tool_input.CommandLine;
  return "";
}

function getCwd(payload) {
  return typeof payload.cwd === "string" ? payload.cwd : "";
}

function getSessionId(payload) {
  return typeof payload.session_id === "string" ? payload.session_id : "";
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
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
  addContext,
  getCommand,
  getCwd,
  getSessionId,
  readPayload,
};
