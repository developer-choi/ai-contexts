// 차단 도메인(금융 사이트 등)에 떠 있는 탭에는 브라우저 자동화의 쓰기 동작을 거부한다.
// 읽기(스크린샷·read_page·get_page_text·console·network·navigate)는 그대로 통과시킨다 —
// 화면을 같이 보며 해설받는 것이 목적이고, 되돌리기 어려운 클릭·입력·주문만 사람이 직접 한다.
// 서브에이전트에게는 사용자의 로그인 쿠키가 붙은 `localhost`·`127.0.0.1`을 읽기·이동까지 막는다.
//
// 판정은 tabId가 아니라 "그 순간 그 탭의 URL"로 한다. 차단 도메인에 있던 탭이 다른 사이트로
// 옮겨가면 즉시 다시 쓰기가 열린다.
//
// 기록이 없거나 낡았으면 통과가 아니라 거부다. 사용자가 주소창에 직접 금융 사이트를 띄우면
// 도구 호출이 없어 기록이 갱신되지 않는데, 그때 통과시키면 원천 차단이 제일 흔한 경로에서
// 열린다. 거부 메시지가 "먼저 화면을 읽어라"로 안내하고, 읽기는 이 검사를 안 거치므로 회복은
// 호출 한 번이다(클릭 좌표를 얻으려면 어차피 직전에 화면을 본다).
import fs from "node:fs";
import { deny } from "./hook-utils.mjs";
import { MAX_AGE_MS, isBlockedUrl, isUserLoopbackUrl, stateFilePath } from "./browser-tab-state.mjs";

const PREFIX = "mcp__claude-in-chrome__";

// computer는 한 도구 안에 읽기·쓰기가 섞여 있다. 매처는 도구 이름까지만 가르므로 action으로 가른다.
const COMPUTER_WRITE_ACTIONS = new Set([
  "left_click",
  "right_click",
  "double_click",
  "triple_click",
  "type",
  "key",
  "left_click_drag",
]);

// 호출 자체가 페이지를 건드리는 도구. shortcuts_execute는 무엇을 하는지가 단축 정의에 달려 있어
// 훅이 미리 알 수 없으므로 쓰기로 본다. browser_batch는 이 도구들을 담는 그릇이라 따로 푼다.
const WRITE_TOOLS = new Set(["form_input", "javascript_tool", "file_upload", "shortcuts_execute", "upload_image"]);

// 배치 안에서 탭의 URL을 바꾸는 도구. 배치는 "차단 도메인으로 이동 → 클릭"을 한 호출에 담을 수
// 있어서, 기록만 보면 이동 전 URL로 판정해 통과시킨다.
//
// 반대로 배치가 "스크린샷 → 클릭"이면, 판정은 배치 전체에 한 번 돌아 그 스크린샷이 기록을
// 갱신하기 전에 끝난다. 기록이 낡아 있으면 거부되는데 이게 맞다 — 아직 안 찍은 화면으로
// 현재 주소를 알 수는 없다. 거부되면 스크린샷을 따로 부른 뒤 클릭을 보내면 된다.
const NAVIGATE_TOOLS = new Set(["navigate", "tabs_create_mcp"]);

main();

function main() {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    process.exit(0);
  }
  const toolName = typeof payload.tool_name === "string" ? payload.tool_name : "";
  if (!toolName.startsWith(PREFIX)) process.exit(0);
  const short = toolName.slice(PREFIX.length);
  const input = payload.tool_input && typeof payload.tool_input === "object" ? payload.tool_input : {};

  const state = readState();
  // 배치는 앞 항목이 탭을 옮길 수 있으므로 걸어가며 URL을 갱신한다. 단건은 항목 하나짜리 배치다.
  const items = short === "browser_batch" ? normalizeBatch(input.actions) : [{ name: short, input }];
  const moved = new Map();

  const subagent = Boolean(payload.agent_id);

  for (const item of items) {
    if (NAVIGATE_TOOLS.has(item.name)) {
      const tabId = tabIdOf(item.input);
      const url = typeof item.input.url === "string" ? item.input.url : "";
      if (subagent && isUserLoopbackUrl(url)) denyUserLoopback(item.name, url);
      // 뒤로·앞으로는 어디로 갈지 모른다 — 빈 값으로 두어 그 뒤 쓰기를 "주소 모름"으로 거부한다.
      if (tabId && url) moved.set(tabId, url === "back" || url === "forward" ? "" : url);
      continue;
    }
    // 서브에이전트는 사용자 세션 화면을 읽어 판정해도 안 되므로 읽기까지 막는다(닫기는 둔다).
    if (subagent && item.name !== "tabs_close_mcp") {
      const tabId = tabIdOf(item.input);
      const url = tabId ? (moved.get(tabId) ?? freshUrl(state, tabId)) : "";
      if (url && isUserLoopbackUrl(url)) denyUserLoopback(describe(item), url);
    }
    if (!isWrite(item)) continue;

    const tabId = tabIdOf(item.input);
    const what = describe(item);
    if (!tabId) denyUnknown(what, "호출에 tabId가 없습니다");

    const url = moved.get(tabId) ?? freshUrl(state, tabId);
    if (!url) {
      denyUnknown(
        what,
        `tabId ${tabId}의 현재 주소를 모릅니다(기록 없음 또는 ${Math.round(MAX_AGE_MS / 1000)}초 초과)`,
      );
    }
    if (isBlockedUrl(url)) {
      deny(
        `[브라우저 쓰기 차단] ${what} 거부 — 이 탭(${tabId})은 ${url} 에 있습니다. ` +
          "이 도메인에서는 클릭·입력·스크립트 실행 같은 되돌리기 어려운 동작을 하네스가 막습니다. " +
          "화면을 읽고 설명하는 것(screenshot·read_page·get_page_text)은 그대로 됩니다. " +
          "실제 조작은 사용자가 직접 하세요. 이 제한을 풀려면 사용자가 " +
          "AC deploy/hooks/browser-tab-state.mjs의 BLOCKED_DOMAINS에서 도메인을 빼야 합니다.",
      );
    }
  }
  process.exit(0);
}

// 서브에이전트(agent_id)만 막는다. 메인이 혼자 확인할 때는 사용자와 같은 화면을 쓰는 게 맞고,
// 여럿이 나눠 돌 때는 로그인 뒤 리다이렉트가 앱에 의해 `localhost`로 튕겨 프롬프트로는 못 막는다.
// 한계: 한 배치 안에서 클릭이 리다이렉트를 일으키면 그 뒤 항목은 옛 주소로 판정된다(사전 훅은 아직
// 안 일어난 이동을 모른다). 호출이 나뉘면 기록 훅이 바뀐 주소를 적어 다음 호출부터 막힌다.
function denyUserLoopback(what, url) {
  deny(
    `[브라우저 차단] ${what} 거부 — 서브에이전트가 ${url} 를 쓰려 합니다. ` +
      "localhost·127.0.0.1은 사용자의 실제 로그인 세션이라 서브에이전트는 열지도, 보고 판정하지도, 누르지도 않습니다. " +
      "로그인 뒤 리다이렉트로 이 주소에 왔다면 같은 경로를 받은 자기 호스트(`<이름>.localhost:<포트>`)로 다시 여세요. " +
      "자기 호스트를 받지 못했으면 메인에게 물으세요.",
  );
}

function denyUnknown(what, why) {
  deny(
    `[브라우저 쓰기 차단] ${what} 거부 — ${why}. ` +
      "차단 도메인 여부를 판정할 수 없어 안전 쪽으로 막았습니다. " +
      "같은 탭에 screenshot이나 read_page를 먼저 호출해 현재 주소를 확인한 뒤 다시 시도하세요.",
  );
}

// 배치 항목은 {name, input} 꼴이다. 모양이 어긋난 항목은 이름 없는 쓰기로 보지 않고 넘긴다 —
// 실행 자체가 실패할 입력이라 여기서 막을 것이 없다.
function normalizeBatch(actions) {
  if (!Array.isArray(actions)) return [];
  return actions
    .filter((a) => a && typeof a === "object" && typeof a.name === "string")
    .map((a) => ({ name: a.name.startsWith(PREFIX) ? a.name.slice(PREFIX.length) : a.name, input: a.input && typeof a.input === "object" ? a.input : {} }));
}

function isWrite(item) {
  if (item.name === "computer") return COMPUTER_WRITE_ACTIONS.has(item.input.action);
  return WRITE_TOOLS.has(item.name);
}

function describe(item) {
  return item.name === "computer" ? `computer(${item.input.action})` : item.name;
}

function tabIdOf(input) {
  const raw = input.tabId;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "";
}

function freshUrl(state, tabId) {
  const rec = state[tabId];
  if (!rec || typeof rec.url !== "string" || typeof rec.at !== "number") return "";
  if (Date.now() - rec.at > MAX_AGE_MS) return "";
  return rec.url;
}

function readState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFilePath(), "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
