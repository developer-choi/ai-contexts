import { deny, isWorkflowTeammate, readPayload } from "./hook-utils.mjs";

// check-agent-stop-policy.mjs와 한 쌍이다. 한쪽만 있으면 먼저 알리고 끝내는 경로와 강제로 끝내는
// 경로 중 하나가 열린 채 남는다.
const input = readPayload().tool_input ?? {};
const message = input.message;

if (typeof message === "object" && message !== null && message.type === "shutdown_request" && isWorkflowTeammate(input.to)) {
  deny(`workflow 팀원 shutdown 금지(SendMessage → ${input.to}). 팀원을 끝내면 그 팀원이 쥔 대화 맥락이 사라집니다. 끝낼지는 사용자가 정합니다 — 필요하면 사용자에게 알리고 /tasks에서 직접 종료하도록 안내하세요.`);
}
