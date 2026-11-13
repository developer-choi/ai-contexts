// 사용법: added-comments.md (같은 폴더)
//
// unified diff에서 새로 추가된 주석 후보를 전부 뽑는다.
//
// 주석을 놓치면 리뷰가 그 주석을 판정조차 못 하지만, 주석이 아닌 줄을 더 뽑으면 리뷰어가
// 「주석 아님」으로 넘기면 된다. 그래서 문자열·정규식을 해석하지 않고 넉넉하게 뽑는다 —
// 해석하는 쪽은 따옴표 하나를 잘못 읽는 순간 뒤의 주석을 통째로 삼킨다.
//
// 추가 줄(+) 중 `//`·`/*`·`*/`·`<!--`·`-->`가 들었거나 `*`로 시작하는 줄이 후보다. `/*`·`<!--`로
// 열린 블록은 닫힐 때까지 한 행으로 묶는다(가짜 블록 처리는 closeBlock).
import fs from "node:fs";

const CODE_EXT = /\.(?:[cm]?[jt]sx?|s?css|less|vue|svelte)$/;
const BLOCK_PAIRS = [
  { open: "/*", close: "*/" },
  { open: "<!--", close: "-->" },
];
// `<!--` 블록은 템플릿 주석이 있는 파일에서만 연다. 다른 파일에선 문자열 속 `<!--`가 가짜 블록을 열어
// 뒤 코드 줄을 한 행에 뭉친다.
const HTML_COMMENT_EXT = /\.(?:vue|svelte)$/;

const USAGE_DOC = `${import.meta.dirname.replace(/\\/g, "/")}/added-comments.md`;

let input;
try {
  input = fs.readFileSync(process.argv[2] ?? 0, "utf8");
} catch (error) {
  console.error(`diff 입력을 읽지 못했다: ${error.message}\n사용법: ${USAGE_DOC}`);
  process.exit(1);
}
const inputLines = input.split(/\r?\n/);

// 앞 명령(git diff 등)이 실패하면 파이프에는 빈 입력만 온다. 「후보 없음」으로 끝내면 리뷰어가
// 주석이 없다고 판정하므로, diff가 아니면 실패로 끝낸다.
if (!inputLines.some((raw) => raw.startsWith("diff --git "))) {
  console.error(`diff 입력이 비었다 — diff 명령을 바꿔 다시 돌리지 말고, 받은 명령과 이 오류를 그대로 보고한다\n사용법: ${USAGE_DOC}`);
  process.exit(1);
}

const rows = [];
const skippedFiles = new Set();

let file = null;
let newLine = 0;
let block = null;
// `+++ `·`--- `는 파일 헤더 구간에서만 경로로 읽는다. 헝크 안의 추가 줄 내용이 `++ `로 시작해도
// 헤더로 오인하지 않게.
let inHeader = false;

for (const raw of inputLines) {
  if (raw.startsWith("diff --git ")) {
    closeBlock();
    file = null;
    inHeader = true;
    continue;
  }
  if (inHeader && raw.startsWith("+++ ")) {
    const path = parsePath(raw.slice(4));
    file = path === "/dev/null" ? null : path;
    if (file && !CODE_EXT.test(file)) {
      skippedFiles.add(file);
      file = null;
    }
    continue;
  }
  const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (hunk) {
    closeBlock();
    inHeader = false;
    newLine = Number(hunk[1]);
    continue;
  }
  if (inHeader || !file) continue;

  const marker = raw[0] ?? " ";
  if (marker !== "+" && marker !== " ") continue;

  scanLine(raw.slice(1), newLine, marker === "+");
  newLine += 1;
}
closeBlock();

function scanLine(text, line, added) {
  if (block) {
    const closeAt = text.indexOf(block.close);
    // 가짜 블록 판정(closeBlock)은 닫는 기호까지만 본다 — 그 뒤에서 다시 여는 기호를 보고 진짜 블록을 풀지 않게.
    const probe = closeAt === -1 ? text : text.slice(0, closeAt);
    block.lines.push({ line, added, text: text.trim(), probe });
    if (closeAt === -1) return;
    closeBlock();
    // 같은 줄에서 닫고 다시 여는 경우(`*/ call(); /* 다음 블록`) 뒤 블록의 본문을 놓치지 않게.
    openBlock(text.slice(closeAt), text, line, added);
    return;
  }
  if (openBlock(text, text, line, added)) return;
  if (added && isCandidate(text)) rows.push({ file, line, text: text.trim() });
}

// segment 안에서 마지막으로 열리고 닫히지 않은 블록이 있으면 연다.
function openBlock(segment, text, line, added) {
  let found = null;
  for (const pair of BLOCK_PAIRS) {
    if (pair.open === "<!--" && !HTML_COMMENT_EXT.test(file)) continue;
    const openAt = segment.lastIndexOf(pair.open);
    if (openAt === -1 || segment.indexOf(pair.close, openAt + pair.open.length) !== -1) continue;
    if (!found || openAt > found.openAt) found = { openAt, close: pair.close };
  }
  if (!found) return false;
  block = { file, close: found.close, lines: [{ line, added, text: text.trim() }] };
  return true;
}

function isCandidate(text) {
  return (
    text.includes("//") ||
    BLOCK_PAIRS.some((pair) => text.includes(pair.open) || text.includes(pair.close)) ||
    text.trimStart().startsWith("*")
  );
}

// 문자열·정규식 속 `/*`가 가짜 블록을 열면 뒤 코드 줄이 한 행에 뭉쳐 행마다 판정할 수 없다.
// 이어지는 줄에 `//`나 다른 여는 기호가 보이면 블록으로 믿지 않고 추가 줄을 한 줄씩 낸다.
function closeBlock() {
  if (!block || !block.lines.some((blockLine) => blockLine.added)) {
    block = null;
    return;
  }
  const rest = block.lines.slice(1);
  const looksFake = rest.some(
    (blockLine) => blockLine.probe.includes("//") || BLOCK_PAIRS.some((pair) => blockLine.probe.includes(pair.open)),
  );
  if (looksFake) {
    for (const blockLine of block.lines) {
      if (blockLine.added) rows.push({ file: block.file, line: blockLine.line, text: blockLine.text });
    }
  } else {
    // 위치는 첫 추가 줄 — 기존 블록에 줄을 더한 경우 손대지 않은 여는 줄을 가리키지 않게.
    const firstAdded = block.lines.find((blockLine) => blockLine.added);
    rows.push({ file: block.file, line: firstAdded.line, text: block.lines.map((blockLine) => blockLine.text).join(" ") });
  }
  block = null;
}

// git은 공백 든 경로 뒤에 탭을 붙이고, 비ASCII 경로는 따옴표로 감싸 바이트를 8진수로 적는다.
function parsePath(value) {
  let path = value.replace(/\t.*$/, "");
  if (path.startsWith('"') && path.endsWith('"')) path = unquote(path.slice(1, -1));
  return path.replace(/^[ab]\//, "");
}

function unquote(quoted) {
  const bytes = [];
  const ESCAPES = { n: 10, t: 9, '"': 34, "\\": 92 };
  for (let i = 0; i < quoted.length; i++) {
    if (quoted[i] !== "\\") {
      bytes.push(...Buffer.from(quoted[i], "utf8"));
      continue;
    }
    const octal = quoted.slice(i + 1, i + 4);
    if (/^[0-7]{3}$/.test(octal)) {
      bytes.push(parseInt(octal, 8));
      i += 3;
    } else {
      bytes.push(ESCAPES[quoted[i + 1]] ?? quoted.charCodeAt(i + 1));
      i += 1;
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

if (rows.length === 0) console.log("추가된 주석 후보 없음");
// 건너뛴 파일의 주석은 리뷰어가 이 표에 직접 채우므로, 후보가 없어도 그런 파일이 있으면 표 머리를 찍는다.
if (rows.length > 0 || skippedFiles.size > 0) {
  console.log("| # | 위치 | 주석 원문 | 판정 |");
  console.log("|---|---|---|---|");
  rows.forEach((row, index) => {
    console.log(`| ${index + 1} | ${row.file}:${row.line} | ${row.text.replaceAll("|", "\\|")} | |`);
  });
}
if (skippedFiles.size > 0) {
  console.log(
    `\n주석을 뽑지 않은 파일 ${skippedFiles.size}개: ${[...skippedFiles].join(", ")}\n` +
      "파일마다 허용 목록 규칙이 그 파일 종류에 걸리는지 먼저 본다. 걸리지 않으면 그 사유를 표 위에 한 줄 적고 넘긴다. " +
      "걸리면 그 파일의 diff를 직접 읽어 추가된 주석을 같은 표에 행으로 추가하고, 위치 칸 끝에 「(직접 추출)」을 붙인다.",
  );
}
