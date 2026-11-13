#!/usr/bin/env node
// 사용법: blocked-expressions.md (같은 폴더)
//
// 사용자가 반려한 말을 금지 표현 목록(`blocked-expressions.json`)에 등재하고, 고치고, 검사한다. 목록은 이
// 스크립트로만 고친다. 손으로 행을 붙이면 칸이 빠지거나 오타가 나도 아무도 안 잡고, 그 말은
// 조용히 안 걸린다. 언제 목록에 올리는지는 `deploy/rules/global.md`
// 「사용자가 못 알아본 말은 금지 표현 목록에 올릴지 묻는다」와 write-doc 마무리 단계가 정한다.
//
// 이 목록 하나를 세 곳이 읽는다. 프롬프트 md 커밋 훅(check-wording.mjs), write-doc 채점과 리뷰어 입력
// (`deploy/skills/write-doc/scripts/rejected.mjs`), Claude 커밋 메시지 훅(check-git-commit-policy.mjs).
// 목적은 모두 사람이 읽기 쉬운 글이고, 어느 글에 거는지는 행의 `scope`가 정한다.
//
// 행의 꼴 (키는 이 일곱 개뿐이다):
//   words      찾을 글자. 활용형은 저절로 늘지 않으니 잡을 꼴을 하나씩 적는다.
//   match      PREFIX = 낱말 앞에 다른 글자가 붙지 않은 자리만 잡는다(뒤의 조사는 함께 잡힌다).
//              SUBSTRING = 앞에 붙여 쓴 꼴까지 문자열이 들어 있으면 잡는다.
//   exclusions 걸려도 넘길 정상 쓰임. 각 꼴은 그 행의 낱말 하나를 품어야 한다.
//   scope      PROMPT = 프롬프트 md(커밋 훅), DOC = write-doc 글과 커밋 메시지, BOTH = 둘 다.
//              출신이 아니라 막는 까닭이 어느 글에서 성립하는지로 정한다(예: 물결표는 GitHub 렌더링 때문이라 DOC).
//   lane       ALWAYS_BANNED = 어떤 쓰임이든 틀린 말. 커밋 훅은 건드린 파일 전체에서, 채점은 합계에 넣어 게시를 막는다.
//              NEEDS_REVIEW = 쓰임에 따라 맞기도 한 말. 커밋 훅은 이번 커밋에서 추가·수정한 줄에서만, 채점은 알리기만 한다.
//              쓰임을 봐야 갈리는 말을 ALWAYS_BANNED에 넣으면 적발을 0건으로 맞추려고 멀쩡한 문장을 깎는다.
//              커밋 메시지 훅은 두 레인 모두 막는다.
//   why        왜 막는가. 경고에 함께 찍혀, 다른 뜻으로 쓴 자리인지 가르는 재료가 된다.
//   instead    대신 쓸 말. 배열이면 words와 꼴마다 짝짓고(길이가 같아야 한다), 아니면 문자열 하나로 적는다.
// 누가 언제 반려했는지는 목록에 두지 않는다. 등재 커밋 메시지 본문에 사용자 발화를 적어 git에 남긴다(목록의 낱말은 커밋 메시지 훅이 막으므로 뜻풀이로 바꿔 적는다).
//
// 등재 전에 scope가 PROMPT·BOTH인 행은 이 레포(AC)와 호출한 곳의 레포의 스킬·규칙 md에 실제로 대 본다.
// 한 줄도 안 걸리면 종류나 꼴을 잘못 적은 것이라 거부한다. 아직 아무 데도 안 쓰인 말을 미리 막으려는
// 때는 `--allow-zero`로 넘기고, DOC 행은 대 보지 않는다. 대 보는 매칭은 훅(check-wording.mjs)의 것을 그대로 가져다 쓴다.
//
// 등재·필수 인자 검사의 모양은 PP `local/contexts/recruitment/scripts/cringe-corpus.mjs`에서
// 옮겨 왔다. 코드는 공유하지 않는다. 그쪽은 채용 전용 종류가 섞여 있고, 겹치는 핵심이 작다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANES, LIST_FILE, MATCH_TYPES, SCOPES, blockedHits, isPromptDoc, proseLines } from "./check-wording.mjs";

const AC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// 훅·채점이 실제로 읽는 사본. sync가 만들어 둔 뒤면 함께 고쳐, 다음 sync 전에도 바로 걸리게 한다.
const DEPLOYED_LIST = path.join(os.homedir(), ".ai-contexts", path.basename(LIST_FILE));

const KEYS = ["words", "match", "exclusions", "scope", "lane", "why", "instead"];

function loadList(file = LIST_FILE) {
  if (!fs.existsSync(file)) return [];
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(rows)) throw new Error(`${file}가 배열이 아니다. 손으로 고쳤는지 본다`);
  return rows;
}

function saveList(rows) {
  const problems = checkList(rows);
  if (problems.length) throw new Error(`저장하지 않았다. 꼴이 어긋난다:\n${problems.join("\n")}`);
  const body = `${JSON.stringify(rows, null, 2)}\n`;
  fs.writeFileSync(LIST_FILE, body, "utf8");
  if (fs.existsSync(DEPLOYED_LIST)) fs.writeFileSync(DEPLOYED_LIST, body, "utf8");
}

const splitList = (value) => (value ?? "").split("·").map((part) => part.trim()).filter(Boolean);
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
  else if (wordsOk) {
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
  if (!Array.isArray(rows)) return ["최상위가 배열이 아니다"];
  const problems = [];
  const seen = [];
  rows.forEach((row, index) => {
    const tag = `#${index + 1}(${Array.isArray(row?.words) ? row.words[0] : "?"})`;
    for (const p of rowProblems(row)) problems.push(`${tag}: ${p}`);
    const words = Array.isArray(row?.words) ? row.words : [];
    for (const word of words) {
      const hit = seen.find(([other]) => overlaps(word, other));
      if (hit) problems.push(`${tag}: "${word}"가 ${hit[1]}의 "${hit[0]}"와 겹친다. 같은 자리가 두 번 걸린다`);
    }
    // 한 행 안에서도 한 꼴이 다른 꼴이 이미 잡는 자리를 또 잡으면 두 번 걸린다. PREFIX는 앞이 같은 꼴만 겹친다.
    words.forEach((word, wordIndex) => {
      const covering = words.find((other, otherIndex) => otherIndex !== wordIndex && (row.match === "PREFIX" ? word.startsWith(other) : word.includes(other)));
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

function addRow(rows, entry) {
  for (const field of ["why", "instead"]) {
    if (!entry[field]?.trim()) throw new Error(`--${field}가 비었다`);
  }
  const row = {
    words: entry.words,
    match: entry.match,
    exclusions: entry.exclusions,
    scope: entry.scope,
    lane: entry.lane,
    why: entry.why.trim(),
    instead: entry.instead.trim(),
  };
  const problems = checkList([...rows, row]);
  if (problems.length) throw new Error(problems.join("\n"));
  return [...rows, row];
}

function rowOf(rows, word) {
  const row = rows.find((candidate) => candidate.words.some((w) => w.toLowerCase() === word.toLowerCase()));
  if (!row) throw new Error(`"${word}"는 등재돼 있지 않다`);
  return row;
}

function excludeInRow(rows, word, exclusions) {
  const row = rowOf(rows, word);
  if (exclusions.length === 0) throw new Error("--exclusions가 비었다");
  const merged = [...new Set([...row.exclusions, ...exclusions])];
  return rows.map((candidate) => (candidate === row ? { ...row, exclusions: merged } : candidate));
}

function gitOut(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function repoRootOf(cwd) {
  try {
    return gitOut(cwd, ["rev-parse", "--show-toplevel"]);
  } catch {
    return null;
  }
}

// 워크트리에서도 원본 레포 이름이 나오게 `--git-common-dir`로 구한다(check-wording.mjs와 같은 방식).
function repoNameOf(root) {
  const commonDir = gitOut(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  return commonDir.replace(/\\/g, "/").replace(/\/\.git\/?$/, "").split("/").pop();
}

// 그 행이 걸리는 줄. 커밋된 md만 본다. 작업 중 파일까지 보면 그 자리의 세션 사정에 따라 결과가 갈린다.
function sampleHits(row, roots) {
  const hits = [];
  for (const root of roots) {
    const repo = repoNameOf(root);
    const files = gitOut(root, ["ls-files", "-z", "--", "*.md"]).split("\0").filter(Boolean);
    for (const file of files) {
      if (!isPromptDoc(file, repo)) continue;
      const abs = path.join(root, file);
      if (!fs.existsSync(abs)) continue;
      for (const { lineNo, raw, clean } of proseLines(fs.readFileSync(abs, "utf8"))) {
        if (blockedHits([row], clean).length > 0) hits.push(`${repo}/${file}:${lineNo}: ${raw.trim()}`);
      }
    }
  }
  return hits;
}

function main(args) {
  const takeOption = (name) => {
    const i = args.indexOf(`--${name}`);
    if (i === -1) return null;
    const value = args[i + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`--${name} 뒤에 값이 없다`);
    return value;
  };

  if (args.includes("--check")) {
    const file = args[args.indexOf("--check") + 1] ?? LIST_FILE;
    const problems = checkList(loadList(path.resolve(file)));
    for (const p of problems) console.error(`${file} ${p}`);
    process.exit(problems.length ? 1 : 0);
  }

  const rows = loadList();

  if (args.includes("--find")) {
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
    const hitsWord = (row, query) => row.words.some((word) => overlaps(word, query));
    const hitsInstead = (row, query) => alternatives(row).includes(query.toLowerCase());
    const touches = (row, query) => hitsWord(row, query) || hitsInstead(row, query);
    const found = rows.filter((row) => queries.some((query) => touches(row, query)));
    // 겹친다고 다 잡히는 것은 아니다. PREFIX 행은 낱말 앞에 글자가 붙은 꼴을 놓치는데, --add는 그 꼴도 겹침으로 거부한다.
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
            return weak.length
              ? `  "${query}": 잡지만 약함(이 행은 ${weak.join(", ")}). 더 세게 막으려면 --remove로 꺼내 고쳐 다시 넣는다`
              : `  "${query}": 이미 잡음`;
          }
          if (hitsWord(row, query)) {
            return `  "${query}": 겹치지만 안 잡음. --add는 겹침으로 거부하니, 이 행을 --remove로 꺼내 고쳐 다시 넣는다`;
          }
          return `  "${query}": 이 행의 대신 쓸 말과 겹친다(기존 것과 반대). 이 행의 instead를 고치는 안을 낸다`;
        });
    console.log(
      found.length
        ? found.map((row) => [show(row), ...verdict(row), JSON.stringify(row)].join("\n")).join("\n")
        : "겹치는 행 없음",
    );
    return;
  }

  if (args.includes("--remove")) {
    const word = takeOption("word");
    if (!word) throw new Error("--word가 없다");
    const row = rowOf(rows, word);
    saveList(rows.filter((candidate) => candidate !== row));
    console.log(`지웠다: ${show(row)}\n${JSON.stringify(row)}`);
    return;
  }

  if (args.includes("--exclude")) {
    const word = takeOption("word");
    if (!word) throw new Error("--word가 없다");
    saveList(excludeInRow(rows, word, splitList(takeOption("exclusions"))));
    console.log(`"${word}" 행에 예외 꼴을 추가했다: ${LIST_FILE}`);
    return;
  }

  if (!args.includes("--add")) throw new Error("--add·--exclude·--find·--remove·--check 중 하나를 준다");

  const entry = {
    // 손으로 치기 쉽게 소문자로도 받고, 저장은 대문자로 한다.
    match: takeOption("match")?.toUpperCase(),
    scope: takeOption("scope")?.toUpperCase(),
    lane: takeOption("lane")?.toUpperCase(),
    words: splitList(takeOption("words")),
    why: takeOption("why"),
    instead: takeOption("instead"),
    exclusions: splitList(takeOption("exclusions")),
  };
  const next = addRow(rows, entry);
  const row = next.at(-1);

  // DOC 행은 프롬프트 md에 안 걸리는 게 정상이라 대 보지 않는다.
  const hits =
    row.scope === "DOC"
      ? []
      : sampleHits(row, [...new Set([AC_ROOT, repoRootOf(process.cwd())].filter(Boolean).map((root) => path.resolve(root)))]);
  if (row.scope !== "DOC" && hits.length === 0 && !args.includes("--allow-zero")) {
    throw new Error(
      `"${row.words.join("·")}"(${row.match})가 스킬·규칙 md 어디에도 안 걸린다. 꼴이나 match를 잘못 적었는지 본다.\n` +
        "  아직 안 쓰인 말을 미리 막으려는 것이면 --allow-zero를 붙인다.",
    );
  }

  saveList(next);
  console.log(`등재했다: ${show(row)} → ${LIST_FILE}`);
  if (row.scope !== "DOC") {
    console.log(`지금 걸리는 줄 ${hits.length}개${hits.length > 0 ? ":" : ""}`);
    for (const hit of hits.slice(0, 10)) console.log(`  ${hit}`);
    if (hits.length > 10) console.log(`  ... 그 밖에 ${hits.length - 10}줄`);
  }
  // 새로 막은 말을 다른 행이 대신 쓸 말로 권하고 있으면 그 행은 이제 금지된 말을 권한다. 넣기는 막지 않고 알린다.
  const recommending = rows.filter((other) =>
    (Array.isArray(other.instead) ? other.instead : [other.instead]).some((text) =>
      row.words.some((word) => text.toLowerCase().includes(word.toLowerCase())),
    ),
  );
  for (const other of recommending) {
    console.log(`알림: ${show(other)}\n  이 행의 대신 쓸 말이 새로 막은 말을 담고 있다. 반대 결정인지와 이 행의 instead를 고칠지는 사용자에게 묻는다`);
  }
  console.log("AC에서 이 JSON 파일만 지정해 커밋한다. 커밋 메시지 본문에 반려한 사용자 발화를 적되, 목록의 낱말은 뜻풀이로 바꾼다.");
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`[금지 표현 목록] ${error.message}\n사용법: ${import.meta.dirname.replace(/\\/g, "/")}/blocked-expressions.md`);
  process.exit(1);
}
