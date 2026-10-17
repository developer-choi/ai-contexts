#!/usr/bin/env node
// [반려된 표현](../../../contexts/writing-guide/rejected.md#반려된-표현) 줄을 읽는 파서와 줄 꼴 검사.
// 줄 꼴의 정본은 [줄 꼴](../../../contexts/writing-guide/rejected.md#줄-꼴) 절이다.
//
// 채점기(score.mjs)가 파서를 import해 쓴다. 줄 꼴이 틀리면 채점기는 그 줄을 조용히 경고로 읽거나 못 찾고,
// 같은 표현이 두 줄에 올라가도 아무 데서도 안 걸린다 — 그래서 커밋 때 검사한다(.githooks/pre-commit).
//
// 사용: node rejected-lines.mjs --check <rejected.md>   어긋난 줄을 내고 exit 1
//   잡는 것: 알 수 없는 레인, 날짜(` — YYYY-MM-DD`) 없는 줄, 같은 따옴표 표현이 여러 줄에 있는 것.
//   레인 없는 줄과 따옴표 없는 줄은 「줄 꼴」이 허용하므로 걸지 않는다.
import fs from "node:fs";
import { pathToFileURL } from "node:url";

// 「반려된 표현」 한 줄: `- [합계:|경고:] "<표현>"[·"<활용형>"…] → <대신 쓸 말> — <날짜> <근거>`.
// 레인 표시가 없으면 경고로 읽는다 — 레인을 정하기 전에 쌓인 줄이라 쓰임을 가렸는지 모른다.
// 큰따옴표 안 글자만 찾는다. 근거 발화에도 큰따옴표가 있어 `→` 앞에서만 꺼낸다.
// 활용형은 늘리지 않는다 — `부르다 → 불러`처럼 불규칙이 흔해 기계가 만든 꼴은 틀리기 쉽다. 줄이 꼴을 하나씩 적는다.
const REJECTED_LINE = /^-\s+(?:(합계|경고):\s*)?(.*?)\s+→\s+(.*?)(?:\s+—\s+\d{4}-\d{2}-\d{2}.*)?$/;

// 「반려된 표현」 절의 `- ` 줄을 [파일 줄 번호, 줄]로 낸다.
function sectionLines(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const at = lines.findIndex((ln) => /^##\s+반려된 표현\s*$/.test(ln));
  if (at === -1) return [];
  const out = [];
  for (let i = at + 1; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i])) break;
    if (/^-\s/.test(lines[i])) out.push([i + 1, lines[i]]);
  }
  return out;
}

const laneOf = (ln) => ln.match(/^-\s+([^\s"]+):/)?.[1] ?? null;
const quotedBeforeArrow = (m) => (m ? [...m[2].matchAll(/"([^"]+)"/g)].map((q) => q[1]) : []);

export function parseRejectedLines(text) {
  const entries = [];
  let unreadable = 0;
  // 레인을 빠뜨리거나 잘못 적은 줄은 경고로 읽혀, 「게시 막힘」으로 승인한 줄이 조용히 경고가 된다 — 따로 세서 알린다.
  let noLane = 0;
  let badLane = 0;
  for (const [, ln] of sectionLines(text)) {
    const lane = laneOf(ln);
    if (!lane) noLane += 1;
    else if (lane !== "합계" && lane !== "경고") badLane += 1;
    const m = ln.match(REJECTED_LINE);
    const words = quotedBeforeArrow(m);
    if (!words.length) {
      unreadable += 1;
      continue;
    }
    // 대신 쓸 말도 같은 수만큼 따옴표로 적었으면 꼴마다 짝짓는다(`"부르는"` → `"호출하는"`).
    const swaps = [...m[3].matchAll(/"([^"]+)"/g)].map((q) => q[1]);
    const paired = words.length > 1 && swaps.length === words.length;
    words.forEach((w, i) => entries.push({ word: w, lane: m[1] ?? "경고", swap: paired ? `"${swaps[i]}"` : m[3] }));
  }
  return { entries, unreadable, noLane, badLane };
}

export function checkRejectedLines(text) {
  const problems = [];
  const seen = new Map();
  for (const [lineno, ln] of sectionLines(text)) {
    const lane = laneOf(ln);
    if (lane && lane !== "합계" && lane !== "경고") problems.push(`L${lineno}: 알 수 없는 레인 「${lane}:」 — 합계:·경고: 중 하나로 고친다`);
    if (!/\s—\s\d{4}-\d{2}-\d{2}/.test(ln)) problems.push(`L${lineno}: 날짜가 없다 — 줄 끝에 \` — YYYY-MM-DD "<근거 발화>"\`를 붙인다`);
    for (const word of quotedBeforeArrow(ln.match(REJECTED_LINE))) {
      if (seen.has(word)) problems.push(`L${lineno}: "${word}"가 L${seen.get(word)}에도 있다 — 한 줄로 합친다`);
      else seen.set(word, lineno);
    }
  }
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [flag, file] = process.argv.slice(2);
  if (flag !== "--check" || !file) {
    console.error("사용: node rejected-lines.mjs --check <rejected.md>");
    process.exit(1);
  }
  const problems = checkRejectedLines(fs.readFileSync(file, "utf8"));
  for (const p of problems) console.error(`${file} ${p}`);
  process.exit(problems.length ? 1 : 0);
}
