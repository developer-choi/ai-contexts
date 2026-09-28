#!/usr/bin/env node
// 전역 git pre-commit 훅. 이 커밋이 건드린 프롬프트 md를 통째로 훑어 `wording.md`(문장 다듬기)가
// 금하는 낱말 — 강조 라벨·약한 어휘·군더더기 — 을 감지해 처방과 함께 경고한다(차단하지 않는다).
// ~/.ai-contexts/에 그대로 복사돼 어느 레포에서든 돌므로 AC의 다른 모듈을 import하지 않는다.
// 경로 판정·staged 읽기는 check-count-hardcoding.mjs와 같은 모양이다.
//
// 낱말 목록과 처방은 문서가 아니라 이 메시지가 정본이다. 문서에도 두면 두 곳을 함께 고쳐야 하고,
// 처방은 줄을 짚는 이 자리에서 쓰인다.
//
// 낱말은 실측(2026-09-28, AC·PP·BL 전 프롬프트 md 291개)에서 정탐이 대부분인 것만 켠다.
// `필요하면`(27건)은 거의 다 정상 조건문이고, `옵션`(12건)은 명사, `항상`·`절대`는
// "항상 실리는 자리"·"절대 경로" 같은 비강조 쓰임이 많아 뺐다.
//
// `[CRITICAL]`은 AC가 아닌 레포에서만 강조 라벨로 경고한다. AC에서는 레포 훅
// (`scripts/check-critical-marker.mjs`)이 새로 넣는 줄을 막고, 그 훅은 AC `.githooks`에만 걸려
// 있어 다른 레포에서는 이 경고가 유일한 표면이다.
//
// `--report <md>`로 파일 하나를 지목해 물을 수도 있다. 커밋 없이 문서를 훑는 회차는 훅이 안 뜨는데
// 낱말 목록은 이 스크립트에만 있어서, 이 출구가 없으면 대조할 재료가 없다.
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

// 프롬프트 문서만 본다 — 일반 문서까지 걸면 소음이 된다.
const PROMPT_DOC = /\/(skills|rules|contexts|meta\/guides)\//;
const CLAUDE_LIKE = /^(CLAUDE|AGENTS|GEMINI)\.md$/i;

// 남의 본문을 예시로 인용하는 자리.
const EXCLUDE = /\/(writing-guide\/examples|recruitment\/pr-body)\//;

// backlog 레포의 백로그 데이터는 경로에 `/rules/`가 들어가도 프롬프트 문서가 아니다.
const BACKLOG_REPO = "backlog";
const BACKLOG_DATA = /^\/(projects|articles|roadmaps|archives|side-income|finance)\//;

// 한글 낱말 경계. `무조건`이 `근무조건`에, `즉`이 `즉시`에 걸리지 않게 앞뒤를 막는다.
const H = "(?<![가-힣])";
const E = "(?![가-힣])";

const AC_REPO = "ai-contexts";
const CRITICAL = /\[CRITICAL\]/gi;

const CATEGORIES = [
  {
    kind: "emphasis",
    tag: "[강조 라벨 의심]",
    noun: "강조 라벨이",
    patterns: [/\(필수\)/g, /반드시/g, new RegExp(`${H}무조건`, "g")],
    advice: [
      "판단: 라벨을 떼고 문장만 남긴다 (예: `반드시 X한다` → `X한다`, `확인 (필수)` → `확인한다`).",
      "      라벨은 붙은 문장을 세게 만들지 못하고 안 붙은 문장을 약하게 만든다.",
      "      순서가 중요하면 절차 안의 위치로, 조건이 중요하면 조건 문장으로 적는다.",
      "      표 칸 값으로 쓰인 필수/금지면 그대로 둔다.",
    ],
  },
  {
    kind: "weak",
    tag: "[약한 어휘 의심]",
    noun: "약한 어휘가",
    patterns: [/\(선택\)/g, new RegExp(`필요\\s?시${E}`, "g"), /선택적으로/g, /여부와 무관하게/g],
    advice: [
      "판단: 고를 여지만 남기는 게이트는 걷어 평범한 단언문으로 만든다 (예: `(선택) X한다` → `X한다`).",
      "      정말 경우에 따라 갈리면 무엇이 오면 하고 무엇이 오면 안 하는지를 조건 문장으로 적는다.",
      '      산출물 정의에 쓰면 그 산출물을 받는 다음 단계가 "쓸 수도 안 쓸 수도"로 읽고, 압박이 오면 줄인다.',
      "      디폴트(작성 필수/금지)를 명시한다.",
    ],
  },
  {
    kind: "filler",
    tag: "[군더더기 낱말 의심]",
    noun: "뜻을 더하지 않는 낱말이",
    patterns: [
      /기본적으로/g,
      /사실상/g,
      new RegExp(`${H}즉${E}`, "g"),
      new RegExp(`${H}또한${E}`, "g"),
      /이러한/g,
      /의 경우/g,
      /[을를] 통해/g,
      /미리 사전에/g,
      /에 대한 [가-힣]+[을를] 수행/g,
    ],
    advice: [
      "판단: 지워도 뜻이 같으면 지운다 (`기본적으로`·`사실상`·`즉`·`또한`·`이러한`).",
      "      늘어진 꼴은 줄인다: `A의 경우 B한다` → `A면 B한다`, `X를 통해 Y한다` → `X로 Y한다`,",
      "      `~에 대한 검증을 수행한다` → `~를 검증한다`, `미리 사전에` → `미리`.",
      '      지우면 뜻이 달라지는 자리면 그대로 둔다 (예: `사실상`이 "공식은 아니지만 실제로는"을 뜻할 때).',
    ],
  },
];

// 파일 하나가 옛 위반을 많이 안고 있어도 출력이 화면을 덮지 않게 자른다.
const MAX_REPORTS = 20;

function main() {
  const reports = new Map(CATEGORIES.map((c) => [c.kind, []]));

  for (const file of stagedMarkdownFiles()) {
    if (!isPromptDoc(file)) continue;
    const content = stagedContent(file);
    if (content === null) continue;
    for (const report of detectInFile(file, content)) reports.get(report.kind).push(report);
  }

  const found = CATEGORIES.filter((c) => reports.get(c.kind).length > 0);
  if (found.length === 0) return;

  for (const category of found) {
    printReports(category, reports.get(category.kind), "이 커밋이 건드린 프롬프트 md");
  }

  // 안내는 "정리해도 된다"가 아니라 "지금 정리한다"로 적는다 — 고를 여지를 남기면 읽고도
  // 사용자에게 되넘긴다(check-count-hardcoding.mjs의 같은 문구 참고).
  console.log("이번에 고친 줄이 아니어도 같은 파일이면 이 커밋에서 함께 정리한다.");
  console.log('      "따로 다룰까요"로 사용자에게 넘기지 않는다. 줄마다 위 판단으로 고칠 것은 고치고,');
  console.log("      그대로 둘 것은 둔 뒤 몇 건을 어떤 사유로 뒀는지만 보고에 한 줄로 적는다.");
  console.log("");
}

function printReports({ tag, noun, advice }, reports, where) {
  console.log(`${tag} ${where}에서 ${noun} 감지됐다:`);
  for (const { file, lineNo, line, hits } of reports.slice(0, MAX_REPORTS)) {
    console.log(`  ${file}:${lineNo}: ${line}  (${hits.join(", ")})`);
  }
  if (reports.length > MAX_REPORTS) {
    console.log(`  ... 그 밖에 ${reports.length - MAX_REPORTS}건 더`);
  }
  for (const line of advice) console.log(line);
  console.log("");
}

// 삭제(D)는 제외한다 — 사라진 파일에 경고할 자리가 없다. 내용 변경 없이 이름만 바뀐 파일(R100)도
// 뺀다 — 재구성처럼 대량 이동하는 커밋에서 경고가 쏟아지고, "함께 정리한다"는 지시가 이동만
// 담아야 하는 커밋과 부딪힌다. 내용도 바뀐 rename(R100 미만)은 검사한다.
function stagedMarkdownFiles() {
  const out = execFileSync(
    "git",
    ["diff", "--cached", "--name-status", "-M", "--diff-filter=ACMR", "-z", "--", "*.md"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 32 }
  );
  const fields = out.split("\0").filter(Boolean);
  const files = [];
  for (let i = 0; i < fields.length; ) {
    const status = fields[i];
    // R·C는 옛 경로와 새 경로 두 칸이 따라온다.
    if (status.startsWith("R") || status.startsWith("C")) {
      if (status !== "R100") files.push(fields[i + 2]);
      i += 3;
    } else {
      files.push(fields[i + 1]);
      i += 2;
    }
  }
  return files;
}

// 작업 트리가 아니라 스테이징된 내용을 본다 — 커밋될 것이 판정 대상이다.
function stagedContent(file) {
  try {
    return execFileSync("git", ["show", `:${file}`], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 32,
    });
  } catch {
    return null;
  }
}

function isPromptDoc(file) {
  // 앞에 슬래시를 붙여, 레포 루트 바로 아래(`meta/guides/...`)도 `/meta/guides/`로 잡히게 한다.
  const posix = `/${file.replace(/\\/g, "/").replace(/^\/+/, "")}`;
  if (EXCLUDE.test(posix)) return false;
  if (BACKLOG_DATA.test(posix) && repoName() === BACKLOG_REPO) return false;
  if (PROMPT_DOC.test(posix)) return true;
  return CLAUDE_LIKE.test(posix.split("/").pop());
}

// 레포 이름. 워크트리에서도 원본 레포 이름이 나오도록 `--git-common-dir`을 쓴다.
let cachedRepoName;
function repoName() {
  if (cachedRepoName !== undefined) return cachedRepoName;
  try {
    // 레포 밖이면 git이 stderr에 fatal을 찍는다 — `--report`가 레포 밖 파일을 받을 수 있어 숨긴다.
    const commonDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    cachedRepoName = commonDir.replace(/\\/g, "/").replace(/\/\.git\/?$/, "").split("/").pop();
  } catch {
    cachedRepoName = "";
  }
  return cachedRepoName;
}

// 코드블록·인라인코드는 걷어낸 뒤 본다 — 규칙 문서가 낱말 자체를 호명하는 자리다.
function detectInFile(file, content) {
  const found = [];
  let fence = null;

  content.split("\n").forEach((raw, index) => {
    const fenceMark = raw.match(/^\s*(```|~~~)/);
    if (fenceMark) {
      if (fence === null) fence = fenceMark[1];
      else if (fenceMark[1] === fence) fence = null;
      return;
    }
    if (fence !== null) return;

    const clean = raw.replace(/`[^`\n]*`/g, " ");
    for (const category of CATEGORIES) {
      const hits = patternsOf(category).flatMap((pattern) => [...clean.matchAll(pattern)].map((m) => m[0]));
      if (hits.length > 0) found.push({ kind: category.kind, file, lineNo: index + 1, line: raw.trim(), hits });
    }
  });

  return found;
}

function patternsOf({ kind, patterns }) {
  return kind === "emphasis" && repoName() !== AC_REPO ? [...patterns, CRITICAL] : patterns;
}

// 파일 하나를 지목해 낱말을 묻는다. 작업 트리의 내용을 보고, 프롬프트 문서 범위 밖이어도 지목한
// 파일이면 본다 — 부른 쪽이 이미 대상을 골랐다. 그 파일이 있는 레포 기준으로 판정한다.
function reportFile(target) {
  if (!target) {
    console.error("사용법: check-wording.mjs --report <md 경로>");
    process.exitCode = 1;
    return;
  }
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) {
    console.error(`파일이 없다: ${abs}`);
    process.exitCode = 1;
    return;
  }
  process.chdir(path.dirname(abs));

  const found = detectInFile(target, fs.readFileSync(abs, "utf8"));
  const where = target;
  for (const category of CATEGORIES) {
    const reports = found.filter((r) => r.kind === category.kind);
    if (reports.length > 0) printReports(category, reports, where);
  }
  if (found.length === 0) console.log(`${where} — 적중 없음.`);
  console.log(
    "한계: 정탐이 대부분인 대표 낱말만 본다. 정상 쓰임이 많은 낱말(조건문으로 더 자주 쓰이는 `필요하면`, " +
      "명사로 쓰이는 `옵션` 등)과 목록에 없는 모양은 안 잡히므로 스스로 살핀다.",
  );
}

try {
  const reportAt = process.argv.indexOf("--report");
  if (reportAt !== -1) reportFile(process.argv[reportAt + 1]);
  else main();
} catch (error) {
  console.error(`[낱말 검사 훅 내부 오류, 건너뜀] ${error.message}`);
}
// 문자열만으로는 정탐이 안 갈리는 알림이라 사람의 커밋을 막으면 안 된다 — 검사(main)는 늘 0이다.
// 사람이 부른 `--report`가 파일을 못 찾았을 때만 그 실패가 그대로 나간다.
process.exit(process.exitCode ?? 0);
