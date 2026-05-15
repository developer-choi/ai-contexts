const { deny, readPayload } = require("./hook-utils");

const payload = readPayload();
const message = payload.tool_input && payload.tool_input.message;

if (typeof message === "object" && message !== null && message.type === "shutdown_request") {
  deny("Team agent shutdown is not allowed. The user ends sessions with /exit.");
}
