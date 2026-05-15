const fs = require("fs");

function readPayload() {
  return JSON.parse(fs.readFileSync(0, "utf8"));
}

function getCommand(payload) {
  return payload.tool_input && typeof payload.tool_input.command === "string" ? payload.tool_input.command : "";
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

module.exports = {
  deny,
  getCommand,
  readPayload,
};
