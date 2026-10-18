#!/usr/bin/env node
// 다듬기 단계의 리뷰어 팀원에게 줄 프롬프트를 패키지에서 조립한다. 출력을 그대로 Agent 프롬프트나 SendMessage에 붙인다.
//
// 메인이 손으로 조립하면 틀려도 아무 데서도 안 걸린다. `[//]: #` 주석이 남으면 리뷰어가 사용자 지시문을 본문 표현으로
// 보고 문다. 독자 리뷰어에게 audience_knowledge 말고 하나라도 더 넘기면(나머지 frontmatter·규칙 파일 경로)
// 그 리뷰어도 사정을 아는 독자가 되어, 사정을 아는 사람만 읽히는 문장을 못 본다.
//
// 사용: node reviewer-input.mjs --from <패키지.md> --for expression|reader
//   expression  표현 리뷰어 지시 파일 경로, frontmatter 전체, 읽을 파일 경로, 주석을 뺀 본문
//   reader      독자 리뷰어 지시([리뷰어에게 주는 지시](../reviewers/reader.md#리뷰어에게-주는-지시) 인용), audience_knowledge, 주석을 뺀 본문
// 표현 리뷰어는 user_phrases 구절을 면제하므로, 출처 없는 항목이 있으면 멈춘다 — 경고만 내면 메인이 무엇을 정하든 그대로 면제된다.
import fs from "node:fs";
import path from "node:path";
import { guideFiles } from "./guide-files.mjs";
import { COMMENT_LINE, fenceTracker, readPackageMeta } from "./package-meta.mjs";

const REVIEWERS = path.resolve(import.meta.dirname, "..", "reviewers");
const REPLY = "결과는 `SendMessage`로 `to: \"main\"`에 보낸다. 평문 출력으로만 끝내지 않는다.";

function split(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  return m ? { fm: m[1], body: text.slice(m[0].length) } : { fm: "", body: text };
}

// 코드펜스 밖의 주석 줄만 뺀다. 펜스 안의 `[//]: #`은 본문이 보여 주는 코드다.
function stripComments(body) {
  const inFence = fenceTracker();
  return body
    .split("\n")
    .filter((ln) => inFence(ln) || !COMMENT_LINE.test(ln))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// 최상위 키 한 개의 줄과 그 아래 들여쓴 줄(여러 줄 값·목록)을 원문대로 돌려준다.
function fmField(fm, key) {
  const lines = fm.split("\n");
  const at = lines.findIndex((ln) => ln.startsWith(`${key}:`));
  if (at === -1) return null;
  const end = lines.findIndex((ln, i) => i > at && /^\S/.test(ln) && !ln.startsWith("-"));
  return lines.slice(at, end === -1 ? undefined : end).join("\n");
}

// 출처 `(…)`가 없는 user_phrases 항목. 인라인 배열은 항목을 못 가르므로 통째로 낸다.
function phrasesWithoutSource(fm) {
  const [head, ...rest] = (fmField(fm, "user_phrases") ?? "").split("\n");
  if (/^user_phrases:\s*\[\s*\]\s*$/.test(head)) return [];
  if (/^user_phrases:\s*\[/.test(head)) return [`${head.trim()} — 목록 꼴(줄마다 - )로 적는다`];
  // `"구절" (출처)` — 출처 안에 괄호가 있어도 따옴표 구절 뒤 ` (`로 가른다(채점기 readUserPhrases와 같은 꼴).
  return rest
    .map((ln) => ln.match(/^\s*-\s+(.*)$/)?.[1])
    .filter((item) => item && !/^['"]?".*?"\s*\(.+\)\s*['"]?\s*$/.test(item));
}

// [리뷰어에게 주는 지시](../reviewers/reader.md#리뷰어에게-주는-지시) 절의 `> ` 인용. 비면 멈춘다 — 빈 지시로 띄우면 리뷰어가 아무 기준 없이 읽는다.
function readerInstruction() {
  const file = path.join(REVIEWERS, "reader.md");
  const lines = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
  const at = lines.findIndex((ln) => /^##\s+리뷰어에게 주는 지시\s*$/.test(ln));
  const quote = [];
  for (const ln of at === -1 ? [] : lines.slice(at + 1)) {
    if (/^##\s/.test(ln)) break;
    if (ln.startsWith(">")) quote.push(ln.replace(/^>\s?/, ""));
  }
  const text = quote.join("\n").trim();
  if (!text) {
    console.error(`${file} 「리뷰어에게 주는 지시」 절에 > 인용이 없다`);
    process.exit(1);
  }
  return text;
}

function expression(file, fm, body) {
  const { type, subtype } = readPackageMeta(file);
  const { always, conditional } = guideFiles(type, subtype, "reviewer");
  const unsourced = phrasesWithoutSource(fm);
  if (unsourced.length) {
    for (const item of unsourced) console.error(`출처 없는 user_phrases 항목: ${item}`);
    console.error("출처를 채우거나 user_phrases에서 뺀 뒤 다시 돌린다");
    process.exit(1);
  }
  return [
    `${path.join(REVIEWERS, "expression.md")}를 Read하고 그대로 따른다.`,
    "",
    "## 읽을 파일",
    ...always.map((f) => `- ${f}`),
    ...(conditional.length ? ["", "## 조건에 맞으면 더 읽을 파일", ...conditional.map(({ when, file: f }) => `- ${when}: ${f}`)] : []),
    "",
    "## 패키지 frontmatter",
    "---",
    fm,
    "---",
    "",
    "## 본문",
    body,
    "",
    REPLY,
  ].join("\n");
}

function reader(fm, body) {
  const fields = ["audience_knowledge"].map((k) => fmField(fm, k));
  // 키만 있고 값이 비면 리뷰어가 무엇을 아는 독자인지 모른 채 읽는다.
  if (fields.some((f) => !f || /^[\w-]+:\s*(""|'')?\s*$/.test(f.trim()))) {
    console.error("패키지 frontmatter에 audience_knowledge가 값과 함께 있어야 한다");
    process.exit(1);
  }
  return [readerInstruction(), "", REPLY, "", ...fields, "", "## 본문", body].join("\n");
}

const argv = process.argv.slice(2);
const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);
const from = opt("--from");
const role = opt("--for");
if (!from || !["expression", "reader"].includes(role)) {
  console.error("사용: node reviewer-input.mjs --from <패키지.md> --for expression|reader");
  process.exit(1);
}
const { fm, body: raw } = split(fs.readFileSync(from, "utf8").replace(/\r\n/g, "\n"));
const body = stripComments(raw);
console.log(role === "expression" ? expression(from, fm, body) : reader(fm, body));
