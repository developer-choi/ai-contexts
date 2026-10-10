import { readPayload, addContext } from "./hook-utils.mjs";

// claude-in-chrome 도구가 "Browser extension is not connected"를 돌려주면 사용자에게 확인할 두 원인을 붙여 준다.
//
// 에러 원문도 원인 이름("running", "logged into claude.ai")은 담고 있지만 무엇을 하면 풀리는지는 없어서,
// 규칙 없이 받은 AI는 원문을 번역해 전하는 데서 멈춘다 — 크롬 재시작은 "처음 설치했다면"에 묶여 평소
// 사용자에게 해당 없는 말로 읽히고, 로그인은 "같은 계정인가"만 물어 계정이 같은데 세션이 풀린 경우를 못 잡는다.
// AI는 크롬 상태를 들여다볼 수단이 없으므로(record-browser-tab-url.mjs 머리말의 실측) 원인을 가리게 하지
// 않고 둘 다 묻게 한다.
//
// 두 원인만 안내하면 AI가 묻기 전에 다른 수단(헤드리스 크롬·Playwright 등)으로 화면을 보려 든다(2026-10-10 실제
// 세션에서 Playwright로 캡처까지 했다). 그래서 문구는 크롬이 유일한 확인 수단이고 연결 복구가 지금 할 일이라고
// 강조하고 사용자 답을 기다리게 한다. 우회 수단은 이름으로 들지 않는다 — 이름을 들면 그 수단을 떠올리게 한다.
// 실을 자리와 문구는 벤치로 골랐다(2026-10-10, opus, 화면 대조 요청 중 끊김 응답, 변형당 5회, 끊김 뒤 크롬 아닌
// 수단으로 페이지를 찌르거나 대체 브라우저를 찾은 run 수): 이전 문구 4/5, 이 문구를 additionalContext로 0/5,
// 같은 문구를 updatedToolOutput으로 결과 앞에 붙임 2/5, 둘 다 5/5. 결과 안에 넣은 지시는 따르는 비율이 오히려
// 낮아 additionalContext 하나만 쓴다. sonnet은 이전 문구로도 우회가 재현되지 않았다.
//
// 이 에러는 실패가 아니라 정상 응답으로 온다 — PostToolUseFailure가 아니라 PostToolUse가 불린다(2026-09-26 실측).

const DISCONNECTED = "Browser extension is not connected";

const payload = readPayload();
if (typeof payload?.tool_name !== "string" || !payload.tool_name.startsWith("mcp__claude-in-chrome__")) process.exit(0);
// 응답 모양이 도구마다 달라(문자열·{content:[…]}·배열) 통째로 문자열로 만들어 찾는다. 찾는 문구에 따옴표가 없어
// 이스케이프에 안 걸린다.
if (!JSON.stringify(payload.tool_response ?? payload.tool_result ?? "").includes(DISCONNECTED)) process.exit(0);

addContext(
  "[크롬 연결 끊김] 이 작업에서 화면을 확인하는 수단은 사용자의 크롬 하나뿐이다. 지금 할 일은 연결을 되살리는 것이다 — " +
    "이번 응답에서 사용자에게 아래 두 가지를 조치와 함께 확인해 달라고 하고, 브라우저가 필요한 확인은 사용자가 다시 연결했다고 알려 줄 때까지 기다린다. " +
    "① 크롬이 완전히 꺼져 있다 → 크롬을 다시 켠다. " +
    "② claude.ai 로그인이 풀렸다(구독을 해지했다가 재구독한 뒤 흔하다) → claude.ai에서 로그아웃 후 다시 로그인한다. " +
    "AI는 크롬 상태를 볼 수단이 없으니 어느 쪽인지 가리려 하지 않는다. 브라우저와 무관한 작업은 그동안 이어가도 된다.",
  "PostToolUse",
);
