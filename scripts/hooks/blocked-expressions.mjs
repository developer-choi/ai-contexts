#!/usr/bin/env node
// 사용법: blocked-expressions.md (같은 폴더)
//
// 사용자가 반려한 말을 모은 금지 표현 목록(`blocked-expressions.json`)의 검사·겹침 찾기 스크립트다.
//
// 이 목록 하나를 세 곳이 읽는다. 프롬프트 md 커밋 훅(check-wording.mjs), write-doc 채점과 리뷰어 입력
// (`plugins/ac/skills/write-doc/scripts/rejected.mjs`), Claude 커밋 메시지 훅(check-git-commit-policy.mjs).
// 목적은 모두 사람이 읽기 쉬운 글이고, 어느 글에 거는지는 행의 `scope`가 정한다.
//
// 행의 꼴 (키는 아래뿐이다):
//   words      찾을 글자. 활용형은 저절로 늘지 않으니 잡을 꼴을 하나씩 적는다.
//   match      PREFIX = 낱말 앞에 다른 글자가 붙지 않은 자리만 잡는다(뒤의 조사는 함께 잡힌다).
//              SUBSTRING = 앞에 붙여 쓴 꼴까지 문자열이 들어 있으면 잡는다.
//              SENTENCE_START = 문장 첫머리에서만 잡는다(경계는 check-wording.mjs `SENTENCE_START_BOUNDARY`).
//              REGEX = words가 정규식 원문이다(`giu` 플래그). 글자를 하나씩 적을 수 없는 규칙(이모지 전부 등)에만 쓴다.
//              문자열 행과의 겹침 검사는 하지 않는다.
//   exclusions 걸려도 넘길 정상 쓰임. 각 꼴은 그 행의 낱말 하나를 품어야 한다(REGEX 행이면 정규식 하나에 통째로 맞아야 한다).
//   scope      PROMPT = 프롬프트 md(커밋 훅), DOC = write-doc 글과 커밋 메시지, BOTH = 둘 다.
//              출신이 아니라 막는 까닭이 어느 글에서 성립하는지로 정한다(예: 물결표는 GitHub 렌더링 때문이라 DOC).
//   lane       ALWAYS_BANNED = 어떤 쓰임이든 틀린 말. 커밋 훅은 건드린 파일 전체에서, 채점은 합계에 넣어 게시를 막는다.
//              NEEDS_REVIEW = 쓰임에 따라 맞기도 한 말. 커밋 훅은 이번 커밋에서 추가·수정한 줄에서만, 채점은 알리기만 한다.
//              쓰임을 봐야 갈리는 말을 ALWAYS_BANNED에 넣으면 적발을 0건으로 맞추려고 멀쩡한 문장을 깎는다.
//              커밋 메시지 훅은 두 레인 모두 막는다.
//   why        왜 막는가. 경고에 함께 찍혀, 다른 뜻으로 쓴 자리인지 가르는 재료가 된다.
//   instead    대신 쓸 말. 배열이면 words와 꼴마다 짝짓고(길이가 같아야 한다), 아니면 문자열 하나로 적는다.
import fs from "node:fs";
import path from "node:path";
import { LANES, LIST_FILE, MATCH_TYPES, SCOPES, blockedHits } from "./check-wording.mjs";

const KEYS = ["words", "match", "exclusions", "scope", "lane", "why", "instead"];

// 없는 경로를 빈 목록으로 읽으면 경로 오타가 검사 통과로 보인다.
function loadList(file) {
  if (!fs.existsSync(file)) throw new Error(`파일이 없다: ${file}`);
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(rows)) throw new Error(`${file}가 배열이 아니다`);
  return rows;
}

const isText = (value) => typeof value === "string" && value.trim().length > 0;
const overlaps = (a, b) => a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());

function rowProblems(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return ["행이 객체가 아니다"];
  const problems = [];
  for (const key of Object.keys(row)) if (!KEYS.includes(key)) problems.push(`모르는 키 "${key}". ${KEYS.join("·")}만 둔다`);
  for (const key of KEYS) if (!(key in row)) problems.push(`"${key}"가 없다`);
  const wordsOk = Array.isArray(row.words) && row.words.length > 0 && row.words.every(isText);
  if (!wordsOk) problems.push("words가 빈 글자 없는 문자열 배열이 아니다");
  if (!MATCH_TYPES.includes(row.match)) problems.push(`match가 "${row.match}". ${MATCH_TYPES.join("·")} 중 하나`);
  if (!SCOPES.includes(row.scope)) problems.push(`scope가 "${row.scope}". ${SCOPES.join("·")} 중 하나`);
  if (!LANES.includes(row.lane)) problems.push(`lane이 "${row.lane}". ${LANES.join("·")} 중 하나`);
  if (!isText(row.why)) problems.push("why가 비었다");
  if (Array.isArray(row.instead)) {
    if (!row.instead.every(isText)) problems.push("instead 배열에 빈 값이 있다");
    if (wordsOk && row.instead.length !== row.words.length) {
      problems.push(`instead 배열이 ${row.instead.length}개, words는 ${row.words.length}개. 꼴마다 짝짓거나 문자열 하나로 적는다`);
    }
  } else if (!isText(row.instead)) {
    problems.push("instead가 비었다");
  }
  if (!Array.isArray(row.exclusions)) problems.push("exclusions가 배열이 아니다");
  else if (wordsOk && row.match === "REGEX") {
    // 깨진 정규식이 목록에 들어가면 커밋 훅이 내부 오류로 통째로 건너뛰어 다른 범주까지 꺼진다.
    const compiled = row.words.flatMap((word) => {
      try {
        return [new RegExp(`^(?:${word})$`, "iu")];
      } catch (error) {
        problems.push(`정규식 "${word}"가 안 된다: ${error.message}`);
        return [];
      }
    });
    if (compiled.length === row.words.length) {
      for (const phrase of row.exclusions) {
        if (!compiled.some((regex) => regex.test(phrase))) problems.push(`예외 "${phrase}"가 어느 정규식에도 통째로 안 맞는다. 아무것도 안 빼준다`);
      }
    }
  } else if (wordsOk) {
    for (const phrase of row.exclusions) {
      if (!row.words.some((word) => phrase.toLowerCase().includes(word.toLowerCase()))) {
        problems.push(`예외 "${phrase}"가 낱말을 안 품는다. 아무것도 안 빼준다`);
      }
    }
  }
  return problems;
}

// 행마다의 꼴과, 행 사이에 한 꼴이 다른 꼴을 품는 겹침(같은 자리가 두 번 찍힌다)을 낸다.
function checkList(rows) {
  const problems = [];
  const seen = [];
  rows.forEach((row, index) => {
    const tag = `#${index + 1}(${Array.isArray(row?.words) ? row.words[0] : "?"})`;
    for (const p of rowProblems(row)) problems.push(`${tag}: ${p}`);
    // REGEX 행의 낱말은 정규식 원문이라 글자 포함으로 겹침을 볼 수 없다.
    const words = Array.isArray(row?.words) && row.match !== "REGEX" ? row.words : [];
    for (const word of words) {
      const hit = seen.find(([other]) => overlaps(word, other));
      if (hit) problems.push(`${tag}: "${word}"가 ${hit[1]}의 "${hit[0]}"와 겹친다. 같은 자리가 두 번 걸린다`);
    }
    // 한 행 안에서도 한 꼴이 다른 꼴이 이미 잡는 자리를 또 잡으면 두 번 걸린다. PREFIX·SENTENCE_START는 앞이 같은 꼴만 겹친다.
    words.forEach((word, wordIndex) => {
      const covering = words.find((other, otherIndex) => otherIndex !== wordIndex && (row.match === "SUBSTRING" ? word.includes(other) : word.startsWith(other)));
      if (covering) problems.push(`${tag}: "${word}"는 같은 행의 "${covering}"가 이미 잡는다. 빼거나 "${covering}"만 둔다`);
    });
    for (const word of words) seen.push([word, tag]);
  });
  return problems;
}

const show = (row) => {
  const instead = Array.isArray(row.instead) ? row.instead.join("·") : row.instead;
  return `[${row.lane}·${row.scope}·${row.match}] ${row.words.join("·")} → ${instead} / 까닭: ${row.why}`;
};

function main(args) {
  const takeOption = (name) => {
    const i = args.indexOf(`--${name}`);
    if (i === -1) return null;
    const value = args[i + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`--${name} 뒤에 값이 없다`);
    return value;
  };

  if (args.includes("--check")) {
    const given = args[args.indexOf("--check") + 1];
    const file = given === undefined || given.startsWith("--") ? LIST_FILE : path.resolve(given);
    const problems = checkList(loadList(file));
    for (const p of problems) console.error(`${file} ${p}`);
    process.exit(problems.length ? 1 : 0);
  }

  if (!args.includes("--find")) throw new Error("--find·--check 중 하나를 준다");

  const rows = loadList(LIST_FILE);
  // 이번 반려에 정한 scope·lane을 주면, 기존 행이 그만큼 막을 때만 이미 잡음으로 본다.
  const wantScope = takeOption("scope")?.toUpperCase();
  const wantLane = takeOption("lane")?.toUpperCase();
  if (wantScope && !SCOPES.includes(wantScope)) throw new Error(`--scope는 ${SCOPES.join("·")} 중 하나`);
  if (wantLane && !LANES.includes(wantLane)) throw new Error(`--lane은 ${LANES.join("·")} 중 하나`);
  const optionValues = new Set([wantScope, wantLane].filter(Boolean).map((value) => value.toLowerCase()));
  const queries = args
    .slice(args.indexOf("--find") + 1)
    .filter((arg) => !arg.startsWith("--") && !optionValues.has(arg.toLowerCase()));
  if (queries.length === 0) throw new Error("--find 뒤에 표현을 하나 이상 준다");
  // 대신 쓸 말은 긴 설명 문장이 많아 품는지로 보면 흔한 낱말마다 걸린다. 대안 하나와 똑같을 때만 겹침으로 본다.
  const alternatives = (row) =>
    (Array.isArray(row.instead) ? row.instead : [row.instead])
      .flatMap((text) => text.split(/[/·,]| 또는 /))
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
  // REGEX 행은 원문 글자로 겹침을 볼 수 없어, 예외를 빼고 정규식이 표현에 맞는지로 본다.
  const hitsWord = (row, query) =>
    row.match === "REGEX"
      ? blockedHits([{ ...row, exclusions: [] }], query).length > 0
      : row.words.some((word) => overlaps(word, query));
  const hitsInstead = (row, query) => alternatives(row).includes(query.toLowerCase());
  const touches = (row, query) => hitsWord(row, query) || hitsInstead(row, query);
  const found = rows.filter((row) => queries.some((query) => touches(row, query)));
  // 겹친다고 다 잡히는 것은 아니다. PREFIX 행은 낱말 앞에 글자가 붙은 꼴을 놓치는데, --check는 그 꼴을 새 행에 넣어도 겹침으로 막는다.
  // 그래서 표현마다 그 행이 실제로 잡는지를 매칭으로 대 보고 함께 낸다.
  // 이미 잡아도 이 행이 막는 세기(scope·lane)가 이번 반려보다 약할 수 있다. --scope·--lane을 주면 그것과 비교하고,
  // 안 주면 BOTH·ALWAYS_BANNED보다 약한 한계를 모두 적는다.
  const scopeCovers = (row) => row.scope === "BOTH" || row.scope === (wantScope ?? "BOTH");
  const laneCovers = (row) => row.lane === "ALWAYS_BANNED" || (wantLane ?? "ALWAYS_BANNED") === "NEEDS_REVIEW";
  const limits = (row) =>
    [
      scopeCovers(row) ? null : `${row.scope}(${row.scope === "DOC" ? "글·커밋 메시지" : "프롬프트 md"})에만 적용`,
      laneCovers(row) ? null : "NEEDS_REVIEW(알리기만 함)",
    ].filter(Boolean);
  const verdict = (row) =>
    queries
      .filter((query) => touches(row, query))
      .map((query) => {
        if (blockedHits([row], query).length > 0) {
          const weak = limits(row);
          // 표현 하나를 한 줄로 대 보므로, 표현이 낱말로 시작하면 첫머리 행은 늘 걸린다. 문장 중간 쓰임까지 막는다고 읽히지 않게 알린다.
          const startOnlyNotice =
            row.match === "SENTENCE_START" ? ". 이 행은 문장 첫머리에서만 잡는다. 문장 중간에 쓴 말이면 앞말을 붙여 다시 --find한다" : "";
          return weak.length
            ? `  "${query}": 잡지만 약함(이 행은 ${weak.join(", ")}). 더 세게 막으려면 이 행의 scope·lane을 고친다${startOnlyNotice}`
            : `  "${query}": 이미 잡음${startOnlyNotice}`;
        }
        if (hitsWord(row, query) && row.match === "REGEX") {
          return `  "${query}": 정규식에는 맞지만 이 행의 exclusions가 허용한다. 막으려면 exclusions에서 뺀다`;
        }
        if (hitsWord(row, query)) {
          // 첫머리 행이 문장 중간 쓰임을 안 잡는 것은 의도한 구분이다. 고치라고만 하면 행을 PREFIX로 넓혀 그 구분이 사라진다.
          return row.match === "SENTENCE_START"
            ? `  "${query}": 겹치지만 안 잡음. 이 행은 문장 첫머리에서만 잡으니 이 쓰임은 안 막힌다. 새 행은 겹침으로 막히므로, 이 쓰임까지 막을지(이 행의 match를 바꾼다) 사용자에게 묻는다`
            : `  "${query}": 겹치지만 안 잡음. 새 행은 겹침으로 막히니, 이 행의 words·match를 고친다`;
        }
        return `  "${query}": 이 행의 대신 쓸 말과 겹친다(기존 것과 반대). 이 행의 instead를 고치는 안을 낸다`;
      });
  console.log(
    found.length
      ? found.map((row) => [show(row), ...verdict(row), JSON.stringify(row)].join("\n")).join("\n")
      : "겹치는 행 없음",
  );
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`[금지 표현 목록] ${error.message}\n사용법: ${import.meta.dirname.replace(/\\/g, "/")}/blocked-expressions.md`);
  process.exit(1);
}
