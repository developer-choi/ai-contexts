// claude-in-chrome 도구 응답에 실려 오는 탭 URL을 상태 파일에 받아 적는다.
// check-browser-write-policy.mjs가 "이 tabId가 지금 어느 사이트인가"를 판정할 때 쓰는 유일한 근거다.
//
// 왜 받아 적는가: PreToolUse는 tool_input만 받고 탭의 현재 URL은 못 본다. 훅은 브라우저 밖에서
// 도는 node 프로세스라 크롬에 직접 물을 수도 없다 — 2026-09-18 실측: 실행 중 크롬 프로세스에
// --remote-debugging-port가 하나도 없고 127.0.0.1:9222는 연결 거부, 크롬·node가 연 로컬 대기
// 포트도 0건이라 확장↔Claude Code 통로에 끼어들 수단이 없다. URL이 보이는 유일한 순간이
// 도구 응답이므로 그때 적어 둔다.
//
// 응답 원문(2026-09-18 navigate 결과)에서 뽑는 꼴:
//   Tab Context:
//   - Executed on tabId: 2031789807
//   - Available tabs:
//     • tabId 2031789807: "securities.miraeasset.com" ("https://securities.miraeasset.com/")
//
// 목록에 실린 탭을 전부 적는다(실행 탭만 적지 않는다). 다른 탭을 읽는 호출도 이 탭의 기록을
// 갱신해 주므로, 판정 쪽의 "기록이 낡았다"는 거부가 그만큼 덜 뜬다.
import fs from "node:fs";
import path from "node:path";
import { stateFilePath } from "./browser-tab-state.mjs";

// 기록이 무한정 쌓이지 않게 하는 상한. 판정 쪽 신선도(2분)보다 훨씬 길게 둔다 — 여기서 지우는
// 것은 "닫힌 지 오래된 탭"이지 "낡아서 못 믿을 기록"이 아니다(후자는 판정 쪽이 거부한다).
const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000;

// `tabId <숫자>: "<제목>" ("<url>")`
const TAB_LINE = /tabId\s+(\d+)\s*:\s*"[^"]*"\s*\(\s*"([^"]+)"\s*\)/g;

main();

function main() {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    process.exit(0);
  }
  const toolName = typeof payload.tool_name === "string" ? payload.tool_name : "";
  if (!toolName.startsWith("mcp__claude-in-chrome__")) process.exit(0);

  // 응답 모양이 도구마다 다르다(문자열·{content:[…]}·배열). 필드 이름을 짚지 않고 문자열을 전부
  // 긁어 본다 — JSON.stringify로 훑으면 따옴표가 이스케이프돼 위 정규식이 안 걸린다.
  const text = collectText(payload.tool_response ?? payload.tool_result);
  const found = [...text.matchAll(TAB_LINE)];
  if (found.length === 0) process.exit(0);

  const now = Date.now();
  const file = stateFilePath();
  const state = readState(file);
  for (const [, tabId, url] of found) state[tabId] = { url, at: now };
  for (const [tabId, rec] of Object.entries(state)) {
    if (!rec || typeof rec.at !== "number" || now - rec.at > PRUNE_AFTER_MS) delete state[tabId];
  }
  writeState(file, state);
  process.exit(0);
}

function collectText(value, acc = []) {
  if (typeof value === "string") acc.push(value);
  else if (Array.isArray(value)) for (const v of value) collectText(v, acc);
  else if (value && typeof value === "object") for (const v of Object.values(value)) collectText(v, acc);
  return acc.join("\n");
}

function readState(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// 같은 세션이 병렬로 도구를 부르면 이 훅도 겹쳐 돈다. 임시 파일에 쓰고 rename하면 읽는 쪽이
// 반쯤 쓰인 JSON을 보는 일이 없다(rename은 원자적).
function writeState(file, state) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, file);
  } catch {
    // 기록 실패는 조용히 넘긴다 — 판정 쪽이 "기록 없음"을 거부로 처리하므로 조용히 열리지 않는다.
  }
}
