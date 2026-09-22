import { deny, getToolName, readPayload } from "./hook-utils.mjs";

// 회사 분석은 `name`을 준 팀원에게 맡긴다(PP step3.2). 이름을 빼먹어도 분석은 멀쩡히 나오고,
// 사용자가 산출물을 고치라고 해서 `SendMessage`로 되돌려 보내려는 순간에야 주소가 없다는 걸
// 안다 — 그때는 그 팀원이 무엇을 어디서 떠왔는지가 이미 사라진 뒤다. 틀린 채로 조용히 지나가는
// 자리라 산문이 아니라 여기서 막는다(rules-as-code 게이트 2).
//
// 도구 이름을 함께 보는 이유: codex 어댑터는 PreToolUse를 매처 '*'로 뭉쳐 모든 도구 호출에
// 이 훅을 태운다. codex엔 Agent 도구가 없으므로 이 검사는 거기서 한 번도 발동하지 않는다.
const SKILL = "company-analysis";

const payload = readPayload();
const input = payload.tool_input ?? {};
const prompt = typeof input.prompt === "string" ? input.prompt : "";

if (getToolName(payload) === "Agent" && prompt.includes(SKILL) && !String(input.name ?? "").trim()) {
  deny(
    `회사 분석 에이전트에는 \`name\`이 필요합니다. 이름 없이 띄우면 일회성 서브에이전트가 되어, ` +
      `사용자가 산출물을 고치라고 할 때 \`SendMessage\`로 돌려보낼 주소가 없습니다. ` +
      `\`name\`(예: 회사 슬러그)을 붙여 다시 호출하세요.`,
  );
}
