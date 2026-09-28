#!/usr/bin/env node
// AC `.githooks/pre-commit`에서 도는 차단 훅. 이 커밋이 md에 **새로 넣는 줄**에 `[CRITICAL]`
// 표기가 있으면 커밋을 막는다.
//
// 강조 라벨은 붙은 문장을 세게 만드는 게 아니라 안 붙은 문장을 상대적으로 약하게 만든다. 한 번
// 넣기 시작하면 "이것도 중요하다"며 더 붙어 라벨의 값이 계속 떨어진다. 산문 규칙
// (`deploy/contexts/prompt-standards/wording.md`)만 있을 때는 기준 문서가 이 표기를 허용하고
// 있어 scw가 못 잡은 전례가 있어 커밋 시점에 막는다.
//
// 추가 줄만 보는 이유: 기존 표기는 파일마다 따로 걷는 중이라 통째로 막으면 무관한 수정까지
// 커밋이 안 된다. 기존 표기가 있는 줄을 고치면 그 줄도 추가 줄로 잡히므로 손대는 김에 걷힌다.
//
// 코드 블록·인라인 코드 안은 보지 않는다 — 규칙 문서가 표기 자체를 호명하거나 아직 남은 헤딩을
// 인용하는 자리다. 펜스는 hunk 밖에서 열릴 수 있어 diff가 아니라 스테이징된 파일 전체를 따라가며
// 판정한다.
import { execFileSync } from "node:child_process";

const MARKER = /\[CRITICAL\]/i;
const GIT_OPTIONS = { encoding: "utf8", maxBuffer: 1024 * 1024 * 32 };

function main() {
  const hits = [];
  for (const [file, lineNos] of addedLinesByFile()) {
    const content = stagedContent(file);
    if (content === null) continue;
    const raws = content.split("\n");
    const prose = proseLines(raws);
    for (const lineNo of lineNos) {
      if (MARKER.test(prose[lineNo - 1] ?? "")) {
        hits.push(`  ${file}:${lineNo}: ${raws[lineNo - 1].trim()}`);
      }
    }
  }

  if (hits.length === 0) return 0;

  console.error("[CRITICAL 표기 차단] 이 커밋이 md에 새로 넣는 줄에 [CRITICAL] 표기가 있다:");
  for (const hit of hits) console.error(hit);
  console.error("");
  console.error("표기를 떼고 문장 자체로 지시한다. 순서가 중요하면 절차 안의 위치로, 조건이 중요하면 조건 문장으로 적는다.");
  console.error("기존 표기가 있던 줄을 고친 것이면 그 줄의 표기도 이번에 함께 뗀다.");
  console.error("표기 자체를 호명하는 문장이면 백틱으로 감싼다 — 인라인 코드 안은 검사하지 않는다.");
  return 1;
}

// 스테이징된 md별로 새 파일 기준 추가 줄 번호를 모은다. `-U0`이라 hunk 머리의 `+start,count`가
// 곧 추가 줄 범위다. 삭제(D)는 추가 줄이 없어 뺀다.
function addedLinesByFile() {
  const diff = execFileSync(
    "git",
    ["diff", "--cached", "--unified=0", "--no-color", "--no-ext-diff", "--diff-filter=ACMR", "--", "*.md"],
    GIT_OPTIONS
  );
  const result = new Map();
  let file = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      // 공백이 든 경로에는 git이 끝에 탭을 붙인다.
      const target = unquote(line.slice("+++ ".length).replace(/\t$/, ""));
      file = target.startsWith("b/") ? target.slice("b/".length) : null;
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!hunk || file === null) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    if (!result.has(file)) result.set(file, []);
    for (let i = 0; i < count; i += 1) result.get(file).push(start + i);
  }
  return result;
}

// git은 비ASCII 경로를 `core.quotePath`에 따라 `"b/..."`처럼 접두사째 따옴표로 감싸고 8진
// 이스케이프로 내보낸다. 한글 파일명이 흔한 레포라 풀어 둔다 — 안 풀면 그 파일이 조용히 빠진다.
function unquote(path) {
  if (!path.startsWith('"')) return path;
  const bytes = [];
  const body = path.slice(1, -1);
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] !== "\\") {
      bytes.push(...Buffer.from(body[i], "utf8"));
      continue;
    }
    const octal = body.slice(i + 1, i + 4);
    if (/^[0-7]{3}$/.test(octal)) {
      bytes.push(parseInt(octal, 8));
      i += 3;
    } else {
      const escaped = body[i + 1];
      bytes.push(...Buffer.from({ n: "\n", t: "\t" }[escaped] ?? escaped, "utf8"));
      i += 1;
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

// 작업 트리가 아니라 스테이징된 내용을 본다 — 커밋될 것이 판정 대상이다.
function stagedContent(file) {
  try {
    return execFileSync("git", ["show", `:${file}`], GIT_OPTIONS);
  } catch {
    return null;
  }
}

// 줄마다 코드 블록·인라인 코드를 걷어낸 본문을 돌려준다. 펜스 줄과 펜스 안은 빈 문자열이다.
function proseLines(raws) {
  let fence = null;
  return raws.map((raw) => {
    const fenceMark = raw.match(/^\s*(```|~~~)/);
    if (fenceMark) {
      if (fence === null) fence = fenceMark[1];
      else if (fenceMark[1] === fence) fence = null;
      return "";
    }
    if (fence !== null) return "";
    return raw.replace(/`[^`\n]*`/g, " ");
  });
}

// 내부 오류로 커밋을 막으면 이 검사와 무관한 작업이 멈춘다. 알리고 통과시킨다.
let exitCode = 0;
try {
  exitCode = main();
} catch (error) {
  console.error(`[CRITICAL 표기 훅 내부 오류, 건너뜀] ${error.message}`);
}
process.exit(exitCode);
