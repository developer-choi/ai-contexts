// unified diff에서 새로 추가된 주석 후보를 전부 뽑는다.
//
// 주석을 놓치면 리뷰가 그 주석을 판정조차 못 하지만, 주석이 아닌 줄을 더 뽑으면 리뷰어가
// 「주석 아님」으로 넘기면 된다. 그래서 문자열·정규식을 해석하지 않고 넉넉하게 뽑는다 —
// 해석하는 쪽은 따옴표 하나를 잘못 읽는 순간 뒤의 주석을 통째로 삼킨다.
//
// 추가 줄(+) 중 `//`·`/*`·`*/`가 들었거나 `*`로 시작하는 줄이 후보다. `/*`로 열린 블록은
// 닫힐 때까지 한 행으로 묶는다(가짜 블록 처리는 closeBlock).
//
// 사용: git diff <base>...<head> | node added-comments.mjs
//       node added-comments.mjs <diff 파일>
import fs from "node:fs";

const CODE_EXT = /\.(?:[cm]?[jt]sx?|s?css|less|vue|svelte)$/;

const input = fs.readFileSync(process.argv[2] ?? 0, "utf8");
const rows = [];
const skippedFiles = new Set();

let file = null;
let newLine = 0;
let block = null;

for (const raw of input.split(/\r?\n/)) {
  if (raw.startsWith("diff --git ")) {
    closeBlock();
    file = null;
    continue;
  }
  if (raw.startsWith("+++ ")) {
    const path = parsePath(raw.slice(4));
    file = path === "/dev/null" ? null : path;
    if (file && !CODE_EXT.test(file)) {
      skippedFiles.add(file);
      file = null;
    }
    continue;
  }
  if (raw.startsWith("--- ")) continue;
  const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (hunk) {
    closeBlock();
    newLine = Number(hunk[1]);
    continue;
  }
  if (!file) continue;

  const marker = raw[0] ?? " ";
  if (marker === "-" || marker === "\\") continue;
  if (marker !== "+" && marker !== " ") continue;

  scanLine(raw.slice(1), newLine, marker === "+");
  newLine += 1;
}
closeBlock();

function scanLine(text, line, added) {
  if (block) {
    block.lines.push({ line, added, text: text.trim() });
    if (text.includes("*/")) closeBlock();
    return;
  }
  const opens = text.lastIndexOf("/*");
  if (opens !== -1 && text.indexOf("*/", opens + 2) === -1) {
    block = { file, lines: [{ line, added, text: text.trim() }] };
    return;
  }
  if (added && isCandidate(text)) rows.push({ file, line, text: text.trim() });
}

function isCandidate(text) {
  return text.includes("//") || text.includes("/*") || text.includes("*/") || text.trimStart().startsWith("*");
}

// 문자열·정규식 속 `/*`가 가짜 블록을 열면 뒤 코드 줄이 한 행에 뭉쳐 행마다 판정할 수 없다.
// 이어지는 줄에 `//`가 보이면 블록으로 믿지 않고 추가 줄을 한 줄씩 낸다.
function closeBlock() {
  if (!block || !block.lines.some((l) => l.added)) {
    block = null;
    return;
  }
  const [first, ...rest] = block.lines;
  if (rest.some((l) => l.text.includes("//"))) {
    for (const l of block.lines) if (l.added) rows.push({ file: block.file, line: l.line, text: l.text });
  } else {
    rows.push({ file: block.file, line: first.line, text: block.lines.map((l) => l.text).join(" ") });
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

if (rows.length === 0) {
  console.log("추가된 주석 후보 없음");
} else {
  console.log("| # | 위치 | 줄 |");
  console.log("|---|---|---|");
  rows.forEach((row, idx) => {
    console.log(`| ${idx + 1} | ${row.file}:${row.line} | ${row.text.replaceAll("|", "\\|")} |`);
  });
}
if (skippedFiles.size > 0) {
  console.log(`\n주석을 뽑지 않은 파일 ${skippedFiles.size}개: ${[...skippedFiles].join(", ")}`);
}
