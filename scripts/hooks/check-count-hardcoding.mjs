#!/usr/bin/env node
// 전역 git pre-commit 훅. 이 커밋이 건드린 프롬프트 md를 통째로 훑어 개수 하드코딩을
// 감지해 경고한다(차단하지 않는다) — `projects/ai-contexts/active/rules/개수-하드코딩-강제수단.md`
// 확정 설계(갈래 B). ~/.ai-contexts/에 그대로 복사돼 어느 레포에서든 돌므로 AC의 다른
// 모듈을 import하지 않는다.
//
// 추가분이 아니라 파일 전체를 보는 이유: 추가분만 보면 옛 위반이 그 줄을 직접 건드리기 전까지
// 남는다. 그렇다고 규칙을 새로 만들 때마다 전 파일을 훑으면 규칙 수만큼 비용이 곱해진다.
// 건드린 파일만 통째로 보면 손대는 김에 걷히면서, 규칙이 늘어도 커밋당 비용은 안 는다.
//
// 탐지 폭은 실측(같은 백로그 항목)에서 검증된 조합만 켠다 — 한글 수량어는 `한`(부정관사 용법이라
// 정탐 0건)과 `줄`·`곳`(계측·관용구가 대부분)을 뺀 변형, 아라비아형(N개·N가지)을 더한다.
// `둘`·`셋`·`넷` 단독형(정탐률 약 3%)은 소음이 너무 커 상시로 켜지 않는다.
import { execFileSync } from "node:child_process";

// 프롬프트 문서만 본다 — 일반 문서까지 걸면 소음이 된다.
const PROMPT_DOC = /\/(skills|rules|contexts|meta\/guides)\//;
const CLAUDE_LIKE = /^(CLAUDE|AGENTS|GEMINI)\.md$/i;

// 남의 본문을 예시로 인용하는 자리 — 실측 오탐의 큰 덩어리.
const EXCLUDE = /\/(writing-guide\/examples|recruitment\/pr-body)\//;

// backlog 레포의 백로그 데이터. `projects/{repo}/active/rules/` 처럼 경로에 `/rules/`가 들어가
// 프롬프트 문서로 오인되지만, 여기 적히는 개수는 그날 센 측정값(`V2 적중 40줄 / 26개 파일`)이라
// 일반화하면 기록 자체가 망가진다. 구조적으로 정탐이 나올 수 없는 자리이므로 들어오지 않게 한다.
// 같은 레포의 `local/skills/`는 진짜 프롬프트 문서이므로 계속 검사한다.
const BACKLOG_REPO = "backlog";
const BACKLOG_DATA = /^\/(projects|articles|roadmaps|archives|side-income|finance)\//;

const KOREAN_QUANTIFIER = /(두|세|네|다섯|여섯)\s*(가지|계약|항목|축|갈래|단계|개)/g;
const ARABIC_QUANTIFIER = /\d+\s*(개|가지)/g;

// 파일 하나가 옛 위반을 많이 안고 있어도 출력이 화면을 덮지 않게 자른다.
const MAX_REPORTS = 20;

function main() {
  const reports = [];

  for (const file of stagedMarkdownFiles()) {
    if (!isPromptDoc(file)) continue;
    const content = stagedContent(file);
    if (content === null) continue;
    reports.push(...detectInFile(file, content));
  }

  if (reports.length === 0) return;

  console.log("[개수 하드코딩 의심] 이 커밋이 건드린 프롬프트 md에서 구체적 개수가 감지됐다:");
  for (const { file, lineNo, line, hits } of reports.slice(0, MAX_REPORTS)) {
    console.log(`  ${file}:${lineNo}: ${line}  (${hits.join(", ")})`);
  }
  if (reports.length > MAX_REPORTS) {
    console.log(`  ... 그 밖에 ${reports.length - MAX_REPORTS}건 더`);
  }
  console.log("");
  console.log("이번에 고친 줄이 아니어도 같은 파일이면 손대는 김에 함께 정리한다.");
  console.log(
    "판단: 이 개수가 늘거나 줄 목록을 가리키면 일반화한다 (예: `5문항` → `자가검증 문항`, `3개 단계` → `각 단계`)."
  );
  console.log("      앞서 열거된 집합을 가리키면 위치 참조로 (`세 영역` → `위 영역들`).");
  console.log("      설계상 고정된 쌍·닫힌 열거(바로 뒤에 전부 나열됨)면 그대로 둔다.");
}

// 삭제(D)는 제외한다 — 사라진 파일에 경고할 자리가 없다.
function stagedMarkdownFiles() {
  const out = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z", "--", "*.md"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 32 }
  );
  return out.split("\0").filter(Boolean);
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

// 레포 이름. 워크트리에서도 원본 레포 이름이 나오도록 `--git-common-dir`을 쓴다 — 링크된
// 워크트리는 폴더명이 `<레포>-<식별>`이라 폴더명만 보면 갈리지 않는다.
// 경로 판정에서만 쓰이므로 한 번 구해 재사용한다.
let cachedRepoName;
function repoName() {
  if (cachedRepoName !== undefined) return cachedRepoName;
  try {
    const commonDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      encoding: "utf8",
    }).trim();
    cachedRepoName = commonDir.replace(/\\/g, "/").replace(/\/\.git\/?$/, "").split("/").pop();
  } catch {
    cachedRepoName = "";
  }
  return cachedRepoName;
}

// 코드블록·인라인코드는 걷어낸 뒤 본다 — 금지 예시·인용 코드에 있는 개수까지 잡으면 소음이 된다.
// 파일을 통째로 받으므로 펜스 열림·닫힘을 줄 단위로 따라가며, 보고에 쓸 줄번호를 함께 남긴다.
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
    const hits = [
      ...clean.matchAll(KOREAN_QUANTIFIER),
      ...clean.matchAll(ARABIC_QUANTIFIER),
    ].map((m) => m[0]);
    if (hits.length === 0) return;

    found.push({ file, lineNo: index + 1, line: raw.trim(), hits });
  });

  return found;
}

try {
  main();
} catch (error) {
  console.error(`[개수 하드코딩 훅 내부 오류, 건너뜀] ${error.message}`);
}
// 정탐률이 낮은 알림이라 사람의 커밋을 막으면 안 된다 — 항상 통과시킨다.
process.exit(0);
