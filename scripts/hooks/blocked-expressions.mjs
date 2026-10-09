#!/usr/bin/env node
// 사용자가 못 알아본 말을 금지 표현 목록(`blocked-expressions.json`)에 등재한다. 금지 표현 목록은 이
// 스크립트로만 고친다 — 손으로 행을 붙이면 칸이 빠지거나 오타가 나도 아무도 안 잡고, 그 말은
// 조용히 안 걸린다. 무엇을 등재하는지(기준)는 `deploy/contexts/prompt-standards/wording.md`
// 「사용자가 못 알아본 말은 금지 표현 목록에 올린다」가 정본이다.
//
// usage:
//   node scripts/hooks/blocked-expressions.mjs --add --type <prefix|substring> --words 굽지·굽는
//        --why <왜 못 알아보는가> --instead <대신 쓸 말> [--exclusions 꼴·꼴] [--allow-zero]
//   node scripts/hooks/blocked-expressions.mjs --exclude --word <등재된 낱말> --exclusions 꼴·꼴
//
// 등재 전에 그 행을 이 레포(AC)와 호출한 곳의 레포의 스킬·규칙 md에 실제로 대 본다. 한 줄도 안
// 걸리면 종류나 꼴을 잘못 적은 것이라 거부한다 — 아직 아무 데도 안 쓰인 말을 미리 막으려는
// 때만 `--allow-zero`로 넘긴다. 대 보는 매칭은 훅(check-wording.mjs)의 것을 그대로 가져다 쓴다.
//
// 등재·필수 인자 검사의 모양은 PP `local/contexts/recruitment/scripts/cringe-corpus.mjs`에서
// 옮겨 왔다. 코드는 공유하지 않는다 — 그쪽은 채용 전용 갈래가 섞여 있고, 겹치는 핵심이 작다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LIST_FILE, MATCH_TYPES, isPromptDoc, proseLines, blockedHits } from "./check-wording.mjs";

const AC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// 훅이 실제로 읽는 사본. sync가 만들어 둔 뒤면 함께 고쳐, 다음 sync 전에도 바로 걸리게 한다.
const DEPLOYED_LIST = path.join(os.homedir(), ".ai-contexts", path.basename(LIST_FILE));

const USAGE = [
  "사용법:",
  "  --add --type <prefix|substring> --words 말·활용형 --why <왜 못 알아보는가> --instead <대신 쓸 말>",
  "        [--exclusions 꼴·꼴] [--allow-zero]",
  "  --exclude --word <등재된 낱말> --exclusions 꼴·꼴",
  "type: prefix = 낱말 앞에 다른 글자가 붙지 않은 자리만 잡는다(뒤의 조사는 함께 잡힌다).",
  "      substring = 앞에 붙어 쓴 꼴까지 문자열이 들어 있으면 잡는다.",
].join("\n");

function loadList(file = LIST_FILE) {
  if (!fs.existsSync(file)) return [];
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(rows)) throw new Error(`${file}가 배열이 아니다 — 손으로 고쳤는지 본다`);
  return rows;
}

function saveList(rows) {
  const body = `${JSON.stringify(rows, null, 2)}\n`;
  fs.writeFileSync(LIST_FILE, body, "utf8");
  if (fs.existsSync(DEPLOYED_LIST)) fs.writeFileSync(DEPLOYED_LIST, body, "utf8");
}

const splitList = (value) => (value ?? "").split("·").map((part) => part.trim()).filter(Boolean);

// 제외 꼴이 그 행의 낱말을 하나도 안 품으면 아무것도 안 빼준다. 오타가 조용히 앉는 자리다.
function checkExclusions(words, exclusions) {
  for (const phrase of exclusions) {
    if (!words.some((word) => phrase.toLowerCase().includes(word.toLowerCase()))) {
      throw new Error(`제외 「${phrase}」가 낱말(${words.join("·")})을 안 품는다 — 아무것도 안 빼준다`);
    }
  }
}

function addRow(rows, entry) {
  if (!MATCH_TYPES.includes(entry.type)) {
    throw new Error(`--type은 ${MATCH_TYPES.join(" 또는 ")}이어야 한다: ${entry.type}`);
  }
  for (const field of ["why", "instead"]) {
    if (!entry[field]?.trim()) throw new Error(`--${field}가 비었다`);
  }
  if (entry.words.length === 0) throw new Error("--words가 비었다");

  // 한 꼴이 다른 꼴을 품으면 같은 자리가 두 번 찍힌다(「오라클」·「오라클 독립성」). 이미 있는
  // 꼴을 품는 새 꼴은 그 행이 이미 잡고 있고, 새 꼴 안에 든 꼴은 범위가 겹친다.
  const overlaps = (a, b) => a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());
  const existing = rows.flatMap((row) => row.words);
  entry.words.forEach((word, i) => {
    const hit = [...existing, ...entry.words.filter((_, j) => j !== i)].find((other) => overlaps(word, other));
    if (hit) throw new Error(`「${word}」·「${hit}」 두 꼴이 겹친다 — 같은 자리가 두 번 걸린다. 이미 등재된 꼴이면 그대로 둔다`);
  });
  checkExclusions(entry.words, entry.exclusions);

  const row = {
    type: entry.type,
    words: entry.words,
    why: entry.why.trim(),
    instead: entry.instead.trim(),
    exclusions: entry.exclusions,
  };
  return [...rows, row];
}

function excludeInRow(rows, word, exclusions) {
  const row = rows.find((candidate) => candidate.words.some((w) => w.toLowerCase() === word.toLowerCase()));
  if (!row) throw new Error(`「${word}」는 등재돼 있지 않다`);
  if (exclusions.length === 0) throw new Error("--exclusions가 비었다");
  checkExclusions(row.words, exclusions);
  const merged = [...new Set([...(row.exclusions ?? []), ...exclusions])];
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

// 그 행이 걸리는 줄. 커밋된 md만 본다 — 작업 중 파일까지 보면 그 자리의 세션 사정에 따라 결과가 갈린다.
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

  const rows = loadList();

  if (args.includes("--exclude")) {
    const word = takeOption("word");
    if (!word) throw new Error("--word가 없다");
    saveList(excludeInRow(rows, word, splitList(takeOption("exclusions"))));
    console.log(`「${word}」 행에 예외 꼴을 더했다: ${LIST_FILE}`);
    return;
  }

  if (!args.includes("--add")) throw new Error("--add나 --exclude 중 하나를 준다");

  const entry = {
    type: takeOption("type"),
    words: splitList(takeOption("words")),
    why: takeOption("why"),
    instead: takeOption("instead"),
    exclusions: splitList(takeOption("exclusions")),
  };
  const next = addRow(rows, entry);
  const row = next.at(-1);

  const roots = [...new Set([AC_ROOT, repoRootOf(process.cwd())].filter(Boolean).map((r) => path.resolve(r)))];
  const hits = sampleHits(row, roots);
  if (hits.length === 0 && !args.includes("--allow-zero")) {
    throw new Error(
      `「${row.words.join("·")}」(${row.type})가 스킬·규칙 md 어디에도 안 걸린다 — 꼴이나 type을 잘못 적었는지 본다.\n` +
        "  아직 안 쓰인 말을 미리 막으려는 것이면 --allow-zero를 붙인다.",
    );
  }

  saveList(next);
  console.log(`등재했다: 「${row.words.join("·")}」(${row.type}) → ${LIST_FILE}`);
  console.log(`지금 걸리는 줄 ${hits.length}개${hits.length > 0 ? ":" : ""}`);
  for (const hit of hits.slice(0, 10)) console.log(`  ${hit}`);
  if (hits.length > 10) console.log(`  ... 그 밖에 ${hits.length - 10}줄`);
  console.log("AC에서 이 JSON 파일만 지정해 커밋한다.");
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`[금지 표현 목록] ${error.message}\n\n${USAGE}`);
  process.exit(1);
}
