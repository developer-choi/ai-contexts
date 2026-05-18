const { deny, readPayload } = require("./hook-utils");

const payload = readPayload();
const message = payload.tool_input && payload.tool_input.message;

if (typeof message === "object" && message !== null && message.type === "shutdown_request") {
  deny("팀 에이전트 shutdown 금지. 사용자가 /exit으로 직접 세션을 종료하므로 AI가 shutdown을 보낼 필요가 없습니다.");
}
