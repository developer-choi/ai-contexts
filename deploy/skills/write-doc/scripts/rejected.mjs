#!/usr/bin/env node
// 모든 글에 거는 반려 표현 데이터(writing-guide/rejected.json)를 읽고, 검사하고, 고친다.
// 항목 꼴의 정본은 [항목 꼴](../../../contexts/writing-guide/rejected.md#항목-꼴) 절이다.
//
// 목록은 스크립트(이 파일·채점기·리뷰어 입력 조립)만 읽는다. 세션이 목록을 통째로 Read하면 반려가 쌓일수록
// 모든 회차의 맥락이 늘어난다 — 그래서 겹침 확인과 넣고 빼기도 여기서 하고, 리뷰어에게는 본문에 걸린 항목만 넘긴다.
// 사용법은 인자 없이 돌리면 나온다(아래 USAGE).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// 소스(deploy/skills/write-doc/scripts)와 배포본(<타겟>/skills/write-doc/scripts) 둘 다 세 단계 위가 contexts의 부모다.
export const AC_REJECTED = path.resolve(import.meta.dirname, "..", "..", "..", "contexts", "writing-guide", "rejected.json");

const USAGE = `사용 (파일 경로는 늘 적는다 — 기본값을 두면 배포본을 고친다. 고칠 체크아웃의 rejected.json을 적는다):
  node rejected.mjs --check  <rejected.json>              꼴이 어긋난 항목을 내고 exit 1
  node rejected.mjs --find   <rejected.json> <표현>...     새 표현이 기존 항목의 찾는 말·대신 쓸 말과 한쪽이 다른 쪽 속에 든 꼴로 걸리면 그 항목을 낸다
  node rejected.mjs --add    <rejected.json> '<항목 JSON>'  꼴이 어긋나거나 같은 찾는 말이 이미 있으면 넣지 않고 까닭을 낸다.
                                                          한 말이 다른 말 속에 든 겹침은 막지 않으니 --find로 먼저 본다
  node rejected.mjs --remove <rejected.json> <찾는 말>      그 말을 찾는 항목을 통째로 지운다
--find·--remove는 항목마다 사람용 한 줄과 항목 JSON 한 줄을 낸다. 기존 항목에 꼴·근거를 더할 때는
--remove가 낸 JSON을 고쳐 --add로 다시 넣는다.
--add·--remove는 한 번에 하나만 받는다 — 여러 건이면 건마다 돌린다.`;

export const LANES = ["ALWAYS_BANNED", "NEEDS_REVIEW"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// 채점기가 쓰는 꼴: 찾는 말 하나마다 {word, lane, swap}. 대신 쓸 말이 찾는 말과 같은 수의 배열이면 꼴마다 짝짓는다.
export function rejectedEntries(data) {
  return data.flatMap((e) =>
    e.words.map((word, i) => ({
      word,
      lane: e.lane,
      swap: Array.isArray(e.instead) ? `"${e.instead[i]}"` : e.instead,
    })),
  );
}

export function loadRejected(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// 본문 줄([줄 번호, 줄])에서 찾는 말이 든 자리. 채점기와 리뷰어 입력 조립이 함께 쓴다.
export function findRejectedHits(lines, entries) {
  const hits = [];
  for (const e of entries) {
    for (const [lineno, ln] of lines) if (ln.includes(e.word)) hits.push({ ...e, lineno, line: ln.trim() });
  }
  return hits;
}

function entryProblems(e) {
  const p = [];
  if (!e || typeof e !== "object" || Array.isArray(e)) return ["항목이 객체가 아니다"];
  const allowed = new Set(["lane", "words", "instead", "evidence"]);
  for (const k of Object.keys(e)) if (!allowed.has(k)) p.push(`모르는 필드 「${k}」 — lane·words·instead·evidence만 둔다`);
  if (!LANES.includes(e.lane)) p.push(`lane이 「${e.lane}」 — ${LANES.join("·")} 중 하나로 적는다`);
  const wordsOk = Array.isArray(e.words) && e.words.length > 0 && e.words.every((w) => typeof w === "string" && w.trim());
  if (!wordsOk) p.push("words가 빈 글자 없는 문자열 배열이 아니다 — 잡을 꼴을 하나씩 적는다");
  if (Array.isArray(e.instead)) {
    if (wordsOk && e.instead.length !== e.words.length) {
      p.push(`instead 배열이 ${e.instead.length}개, words는 ${e.words.length}개 — 꼴마다 하나씩 짝짓거나, 짝이 안 맞으면 문자열 하나로 적는다`);
    }
    if (!e.instead.every((w) => typeof w === "string" && w.trim())) p.push("instead 배열에 빈 값이 있다");
  } else if (typeof e.instead !== "string" || !e.instead.trim()) {
    p.push("instead가 없다 — 대신 쓸 말이나 고치는 법을 적는다");
  }
  if (!Array.isArray(e.evidence) || !e.evidence.length) {
    p.push("evidence가 없다 — {date, said} 또는 {date, source}를 하나 이상 적는다");
  } else {
    for (const ev of e.evidence) {
      if (!DATE.test(ev?.date ?? "")) p.push(`evidence 날짜 「${ev?.date}」가 YYYY-MM-DD가 아니다`);
      const has = ["said", "source"].filter((k) => typeof ev?.[k] === "string" && ev[k].trim());
      if (has.length !== 1) p.push("evidence마다 said(발화 원문)와 source(원문이 없을 때 어디서 왔나) 중 하나만 적는다");
    }
  }
  return p;
}

export function checkRejected(data) {
  if (!Array.isArray(data)) return ["최상위가 배열이 아니다"];
  const problems = [];
  const seen = new Map();
  data.forEach((e, i) => {
    const tag = `#${i + 1}(${Array.isArray(e?.words) ? e.words[0] : "?"})`;
    for (const p of entryProblems(e)) problems.push(`${tag}: ${p}`);
    for (const w of Array.isArray(e?.words) ? e.words : []) {
      if (seen.has(w)) problems.push(`${tag}: "${w}"가 ${seen.get(w)}에도 있다 — 한 항목으로 합친다`);
      else seen.set(w, tag);
    }
  });
  return problems;
}

const show = (e) => {
  const instead = Array.isArray(e.instead) ? e.instead.map((w) => `"${w}"`).join("·") : e.instead;
  const ev = e.evidence.map((v) => `${v.date} ${v.said ? `"${v.said}"` : `(${v.source})`}`).join(" / ");
  return `${e.lane}: ${e.words.map((w) => `"${w}"`).join("·")} → ${instead} — ${ev}`;
};
// 사람용 줄은 배열·문자열 instead나 said·source를 거꾸로 가를 수 없어, 고쳐 다시 넣을 JSON을 함께 낸다.
const showWithJson = (e) => `${show(e)}\n${JSON.stringify(e)}`;

function find(data, queries) {
  const sides = (e) => [...e.words, ...(Array.isArray(e.instead) ? e.instead : [e.instead])];
  const hit = (e) => queries.some((q) => sides(e).some((s) => s.includes(q) || q.includes(s)));
  return data.filter(hit);
}

const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [flag, file, ...rest] = process.argv.slice(2);
  if (!file || !["--check", "--find", "--add", "--remove"].includes(flag)) fail(USAGE);
  // 남는 인자를 말없이 버리면 여러 건 중 일부만 반영된 채 다 넣었다고 보고된다.
  if ((flag === "--add" || flag === "--remove") && rest.length !== 1) fail(USAGE);
  if (flag === "--find" && !rest.length) fail(USAGE);
  const data = loadRejected(file);

  if (flag === "--check") {
    const problems = checkRejected(data);
    for (const p of problems) console.error(`${file} ${p}`);
    process.exit(problems.length ? 1 : 0);
  }
  if (flag === "--find") {
    const found = find(data, rest);
    console.log(found.length ? found.map(showWithJson).join("\n") : "걸린 항목 없음");
  }
  if (flag === "--add") {
    let entry;
    try {
      entry = JSON.parse(rest[0]);
    } catch {
      fail("항목 JSON을 못 읽었다 — 작은따옴표로 감싼 JSON 한 개를 넘긴다");
    }
    const problems = checkRejected([...data, entry]);
    if (problems.length) fail(problems.join("\n"));
    write(file, [...data, entry]);
    console.log(`더함: ${show(entry)}`);
  }
  if (flag === "--remove") {
    const at = data.findIndex((e) => e.words.includes(rest[0]));
    if (at === -1) fail(`"${rest[0]}"를 찾는 항목이 없다`);
    const [gone] = data.splice(at, 1);
    write(file, data);
    console.log(`지움: ${showWithJson(gone)}`);
  }
}
