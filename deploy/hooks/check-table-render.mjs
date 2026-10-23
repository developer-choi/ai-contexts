import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readPayload } from "./hook-utils.mjs";

// 턴을 마치는 응답에 터미널에서 세로 목록으로 깨질 마크다운 표가 있으면 표를 고쳐 다시 쓰게 돌려보낸다.
//
// Claude Code는 표를 박스(┌─┬─┐)로 그리다가 조건을 넘으면 행마다 「열이름: 값」을 늘어놓고 ───로 가르는
// 세로 목록으로 바꾼다. 표로 정리해 달라는 보고가 표로 안 보여 사용자가 다시 시킨다
// (backlog projects/ai-contexts/dev-active/hooks/세로로-깨질-표를-Stop-훅이-다시-쓰게-한다.md).
//
// 판정식 출처: Claude Code 2.1.299 바이너리의 표 컴포넌트가 부르는 레이아웃 함수(minified 이름 `Kr`,
// 상수 `_e=4, Ne=3, ns=4`). Claude Code가 렌더러를 바꾸면 이 파일의 judgeTable과 상수를 다시 맞춘다.
//   - 칸에 줄 폭 E = max(폭 − (1 + 열수×3) − 4, 열수×3)
//   - 열마다 이상폭(칸 전문 표시폭 최대)·최소폭(가장 긴 낱말 표시폭 최대), 둘 다 하한 3
//   - 이상폭 합 ≤ E면 이상폭. 아니고 최소폭 합 ≤ E면 최소폭에 남는 폭을 (이상−최소) 비율로 나눠 더함.
//     그것도 넘으면 최소폭을 E/합 비율로 줄이고(하한 3) 낱말까지 쪼개 줄바꿈(hard)
//   - 어느 칸이든 줄바꿈 뒤 4줄을 넘거나, 그린 박스 한 줄이 폭 − 4를 넘으면 세로 목록
// 줄바꿈은 렌더러의 wrap-ansi를 단어 단위로 흉내 낸 것이라 문턱(정확히 4~5줄) 근처에서 한 줄 어긋날 수 있다.
//
// 훅은 터미널 폭을 못 읽는다(자식 프로세스라 COLUMNS·stdout.columns가 비고 콘솔 핸들도 없다).
// 그래서 폭은 가정값이다. 이 가정이 실사용에서 맞는지는 걸릴 때마다 남기는 로그로 따로 판정한다
// (backlog projects/ai-contexts/dev-active/hooks/표-훅-실사용-5건으로-결론.md).
//
// 통과시키는 것:
//   - 어느 Stop 훅이든 턴을 이어가는 중(stop_hook_active) — 한 번만 되돌린다
//   - 코드블록 안의 표 모양 텍스트, 목록·인용 안의 표(렌더러가 박스로 그리지 않는다)

export const WIDTH = 100;
const MARGIN = 4;
const MIN_COL = 3;
const MAX_LINES = 4;
const REPORT_AT = 5;

const LOG_FILE =
  process.env.CHECK_TABLE_RENDER_LOG ||
  path.join(os.homedir(), "WebstormProjects", "main", "ai-contexts", "cache", "hooks", "check-table-render.jsonl");

function charWidth(ch) {
  const c = ch.codePointAt(0);
  if (
    (c >= 0x1100 && c <= 0x115f) || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) ||
    (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60) ||
    (c >= 0xffe0 && c <= 0xffe6) || (c >= 0x1f300 && c <= 0x1faff) || (c >= 0x3000 && c <= 0x303f)
  ) return 2;
  return 1;
}

function displayWidth(s) {
  let w = 0;
  for (const ch of s) w += charWidth(ch);
  return w;
}

// 단어 단위 줄바꿈. hard면 폭보다 긴 낱말을 쪼개고, 아니면 그 낱말이 줄을 넘친 채 한 줄을 차지한다.
function wrap(text, width, hard) {
  const out = [];
  for (const para of text.split("\n")) {
    let line = "";
    let lw = 0;
    for (const word of para.split(" ")) {
      const ww = displayWidth(word);
      const need = lw === 0 ? ww : lw + 1 + ww;
      if (need <= width) {
        line = lw === 0 ? word : `${line} ${word}`;
        lw = need;
        continue;
      }
      if (lw > 0) {
        out.push(line);
        line = "";
        lw = 0;
      }
      if (ww <= width || !hard) {
        line = word;
        lw = ww;
        continue;
      }
      let chunk = "";
      let cw = 0;
      for (const ch of word) {
        const w = charWidth(ch);
        if (cw + w > width) {
          out.push(chunk);
          chunk = "";
          cw = 0;
        }
        chunk += ch;
        cw += w;
      }
      line = chunk;
      lw = cw;
    }
    out.push(line);
  }
  const lines = out.filter((l) => l.length > 0);
  return lines.length ? lines : [""];
}

// 칸 텍스트는 인라인 마크다운을 벗긴 렌더 결과로 잰다.
function cellText(raw) {
  return raw
    .replace(/\\\|/g, "|")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim();
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map(cellText);
}

// 구분행: 칸마다 `:?-+:?`만 있는 줄. 수평선 `---`나 `-- 설명`은 여기 안 걸리도록 파이프를 하나 이상 요구한다.
const DELIMITER_ROW = /^ {0,3}\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$|^ {0,3}\|\s*:?-+:?\s*\|?\s*$/;

// 최상위 표만 뽑는다. 코드블록은 먼저 걷는다 — 닫히지 않은 펜스는 렌더러처럼 끝까지 코드로 본다.
export function extractTables(markdown) {
  const text = markdown
    .replace(/\r/g, "")
    .replace(/^ {0,3}(```|~~~)[\s\S]*?^ {0,3}\1[^\n]*$/gm, "")
    .replace(/^ {0,3}(```|~~~)[\s\S]*$/m, "");
  const lines = text.split("\n");
  const tables = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^ {0,3}\|/.test(lines[i]) || !DELIMITER_ROW.test(lines[i + 1])) continue;
    const header = splitRow(lines[i]);
    // GFM은 구분행 칸 수가 머리행과 다르면 표로 보지 않는다.
    if (splitRow(lines[i + 1]).length !== header.length) continue;
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^ {0,3}\|/.test(lines[j])) rows.push(splitRow(lines[j++]));
    tables.push({ header, rows });
    i = j - 1;
  }
  return tables;
}

// 세로 목록으로 바뀌면 { vertical: true, column, lines } — column은 가장 많이 줄바꿈된 열 이름.
export function judgeTable(header, rows, width = WIDTH) {
  const n = header.length;
  const all = [header, ...rows];
  const cell = (r, i) => r[i] ?? "";
  const minW = header.map((_, i) =>
    Math.max(MIN_COL, ...all.map((r) => Math.max(0, ...cell(r, i).split(/\s+/).filter(Boolean).map(displayWidth)))),
  );
  const ideal = header.map((_, i) => Math.max(MIN_COL, ...all.map((r) => displayWidth(cell(r, i)))));
  const avail = Math.max(width - (1 + n * 3) - MARGIN, n * MIN_COL);
  const sumMin = minW.reduce((a, b) => a + b, 0);
  const sumIdeal = ideal.reduce((a, b) => a + b, 0);
  let cols;
  let hard = false;
  if (sumIdeal <= avail) cols = ideal;
  else if (sumMin <= avail) {
    const extra = avail - sumMin;
    const diff = ideal.map((v, i) => v - minW[i]);
    const dsum = diff.reduce((a, b) => a + b, 0);
    cols = minW.map((v, i) => (dsum === 0 ? v : v + Math.floor((diff[i] / dsum) * extra)));
  } else {
    hard = true;
    const k = avail / sumMin;
    cols = minW.map((v) => Math.max(Math.floor(v * k), MIN_COL));
  }

  let lines = 1;
  let column = header[0] ?? "";
  let boxWidth = 0;
  for (const r of all) {
    let rowWidth = 1;
    header.forEach((_, i) => {
      const wrapped = wrap(cell(r, i), cols[i], hard);
      if (wrapped.length > lines) {
        lines = wrapped.length;
        column = header[i];
      }
      rowWidth += Math.max(cols[i], ...wrapped.map(displayWidth)) + 3;
    });
    boxWidth = Math.max(boxWidth, rowWidth);
  }
  if (lines > MAX_LINES) return { vertical: true, column, lines };
  if (boxWidth > width - MARGIN) return { vertical: true, column, lines, boxWidth };
  return { vertical: false, column, lines };
}

// 로그에 한 줄 덧붙이고 덧붙인 뒤 줄 수를 돌려준다. 실패하면 null — 판정은 그대로 낸다.
function appendLog(entry) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`);
    return fs.readFileSync(LOG_FILE, "utf8").split("\n").filter((l) => l.trim()).length;
  } catch (e) {
    process.stderr.write(`check-table-render: 로그를 못 남겼다 — ${e.message}\n`);
    return null;
  }
}

function verdict(payload) {
  if (payload.stop_hook_active) return null;
  // 필드가 없으면 판정할 게 없어 통과하지만, 이름이 바뀐 것이면 이 훅이 영영 꺼진 것이다 — 조용히 넘기지 않는다.
  if (typeof payload.last_assistant_message !== "string") {
    process.stderr.write("check-table-render: Stop 페이로드에 last_assistant_message가 없다 — 필드 이름이 바뀌었으면 이 훅은 아무것도 판정하지 못한다\n");
    return null;
  }
  const width = Number(process.env.CHECK_TABLE_RENDER_WIDTH) || WIDTH;
  const broken = extractTables(payload.last_assistant_message)
    .map((t, i) => ({ index: i + 1, header: t.header, ...judgeTable(t.header, t.rows, width) }))
    .filter((t) => t.vertical);
  if (broken.length === 0) return null;

  const lines = broken.map((t) =>
    t.lines > MAX_LINES
      ? `- 표 ${t.index}(${t.header.join(" | ")})의 '${t.column}' 칸이 ${t.lines}줄`
      : `- 표 ${t.index}(${t.header.join(" | ")})의 폭이 ${t.boxWidth}칸`,
  );
  // 응답 하나에 한 줄 — 실사용 「5건」은 표 수가 아니라 되돌린 응답 수다.
  const count = appendLog({
    ts: new Date().toISOString(),
    session_id: payload.session_id ?? "",
    cwd: payload.cwd ?? "",
    tables: broken.map((t) => ({ header: t.header, column: t.column, lines: t.lines })),
  });
  let reason =
    `방금 응답의 마크다운 표가 터미널에서 박스 표가 아니라 「열이름: 값」 세로 목록으로 깨져 보입니다(폭 ${width}칸 기준, 칸 하나가 줄바꿈 뒤 ${MAX_LINES}줄을 넘으면 깨짐).\n` +
    `${lines.join("\n")}\n` +
    "칸을 짧게 줄이거나, 표를 둘로 나누거나, 긴 문구를 표 밖 각주(①②…)로 빼서 같은 내용을 다시 내고 턴을 마치세요. " +
    "정보는 빼지 않습니다. 사과나 경위 설명은 붙이지 않습니다.";
  if (count === REPORT_AT) {
    reason +=
      `\n\n표 훅 실사용 기록이 ${REPORT_AT}건 찼습니다 — 턴을 마칠 때 사용자에게 backlog ` +
      "`projects/ai-contexts/dev-active/hooks/표-훅-실사용-5건으로-결론.md`를 처리할 때라고 알립니다.";
  }
  return reason;
}

// settings.json은 `node -e "import(...)"`로 불러 argv[1]이 비므로 그때도 본체를 돈다.
// 테스트가 import하면 argv[1]이 러너 스크립트라 돌지 않는다.
if (!process.argv[1] || import.meta.url === pathToFileURL(process.argv[1]).href) {
  const reason = verdict(readPayload());
  if (reason) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "Stop", additionalContext: reason } }));
  }
  process.exit(0);
}
