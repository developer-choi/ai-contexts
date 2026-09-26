import { readPayload, addContext } from "./hook-utils.mjs";

// claude-in-chrome 도구가 "Browser extension is not connected"를 돌려주면 사용자에게 확인할 두 원인을 붙여 준다.
//
// 에러 원문도 원인 이름("running", "logged into claude.ai")은 담고 있지만 무엇을 하면 풀리는지는 없어서,
// 규칙 없이 받은 AI는 원문을 번역해 전하는 데서 멈춘다 — 크롬 재시작은 "처음 설치했다면"에 묶여 평소
// 사용자에게 해당 없는 말로 읽히고, 로그인은 "같은 계정인가"만 물어 계정이 같은데 세션이 풀린 경우를 못 잡는다.
// AI는 크롬 상태를 들여다볼 수단이 없으므로(record-browser-tab-url.mjs 머리말의 실측) 원인을 가리게 하지
// 않고 둘 다 묻게 한다.
//
// 이 에러는 실패가 아니라 정상 응답으로 온다 — PostToolUseFailure가 아니라 PostToolUse가 불린다(2026-09-26 실측).

const DISCONNECTED = "Browser extension is not connected";

const payload = readPayload();
if (typeof payload?.tool_name !== "string" || !payload.tool_name.startsWith("mcp__claude-in-chrome__")) process.exit(0);
// 응답 모양이 도구마다 달라(문자열·{content:[…]}·배열) 통째로 문자열로 만들어 찾는다. 찾는 문구에 따옴표가 없어
// 이스케이프에 안 걸린다.
if (!JSON.stringify(payload.tool_response ?? payload.tool_result ?? "").includes(DISCONNECTED)) process.exit(0);

addContext(
  "[크롬 연결 끊김] 이 에러의 흔한 원인은 둘이고, AI는 크롬 상태를 볼 수단이 없다. 어느 쪽인지 가리려 하지 말고 " +
    "사용자에게 둘 다 조치와 함께 확인해 달라고 한다. " +
    "① 크롬이 완전히 꺼져 있다 → 크롬을 다시 켠다. " +
    "② claude.ai 로그인이 풀렸다(구독을 해지했다가 재구독한 뒤 흔하다) → claude.ai에서 로그아웃 후 다시 로그인한다. " +
    "에러 원문을 옮겨 전하는 것으로 끝내지 않는다.",
  "PostToolUse",
);
