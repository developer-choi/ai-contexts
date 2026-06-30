// backlog [ready] 트래커 항목 양식 강제 — pre-commit이 쓰는 순수 판정 로직.
// 드리프트 방지를 위해 "무엇이 위반인가"는 여기 한 곳에서만 정의한다.
//
// 규칙 SSOT: deploy/skills/backlog/SKILL.md 「Ready 게이트 — 자가검증」.
//   트래커 항목(= `### 기대상황`을 갖는 `## [ready]` 섹션)은 `### 기대상황`·`### 현재상태`·
//   `### 현재 생각중인 방법`을 비어있지 않게 가져야 한다. 왜 고치는지(현재상태)와 작성 세션
//   의견(현재 생각중인 방법)이 없으면 나중에 실행하는 사람이 변경 근거·의견을 잃는다.
// 적용 범위: ai-contexts·private-playground의 active/ 하위 .md.
//   `### 기대상황`이 없는 `[ready]`(개인 메모·완성형 노트 등)는 트래커가 아니라 면제한다.
// rules-as-code: "하위 섹션이 비어있지 않게 존재하는가"는 LLM 판단 0인 강제 칸. 내용 품질은
//   critic(리뷰 모드)이 본다 — hook은 존재만 결정론적으로 보장한다.

const TRACKER_DIRS = [
  "backlog/projects/ai-contexts/active/",
  "backlog/projects/private-playground/active/",
];

// 트래커 판별자(이게 있어야 fix·룰 항목). 강제 대상이기도 하다.
const EXPECTATION = "기대상황";
// 트래커 항목이 비어있지 않게 가져야 하는 하위 섹션 제목(접두 일치).
const REQUIRED = [EXPECTATION, "현재상태", "현재 생각중인 방법"];

// path가 트래커 강제 대상 .md인가.
function isTrackerPath(path) {
  const p = path.replace(/\\/g, "/");
  return p.endsWith(".md") && TRACKER_DIRS.some((d) => p.startsWith(d));
}

// `## [ready] ...` 섹션을 [{title, body}]로 끊는다. body는 다음 `## ` 전까지의 줄 배열.
// `### ` 등 하위 헤딩은 `## ` 매칭에 걸리지 않는다(3번째 글자가 공백이 아님).
function splitReadySections(content) {
  const sections = [];
  let cur = null;
  for (const line of content.split(/\r?\n/)) {
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      if (cur) sections.push(cur);
      const title = h2[1].trim();
      cur = /^\[ready\]/.test(title) ? { title, body: [] } : null;
      continue;
    }
    if (cur) cur.body.push(line);
  }
  if (cur) sections.push(cur);
  return sections;
}

// ready 섹션 body를 `### ` 하위 섹션 [{title, content}]으로 끊는다.
// 첫 `### ` 이전 줄(intro)은 버린다.
function subsections(bodyLines) {
  const subs = [];
  let cur = null;
  for (const line of bodyLines) {
    const h3 = /^###\s+(.*)$/.exec(line);
    if (h3) {
      if (cur) subs.push(cur);
      cur = { title: h3[1].trim(), content: [] };
      continue;
    }
    if (cur) cur.content.push(line);
  }
  if (cur) subs.push(cur);
  return subs;
}

// files: [{path, content}]. 반환: [{path, section, missing:[제목...]}] 위반 목록.
function findViolations(files) {
  const out = [];
  for (const { path, content } of files) {
    if (!isTrackerPath(path)) continue;
    const p = path.replace(/\\/g, "/");
    for (const sec of splitReadySections(content)) {
      const subs = subsections(sec.body);
      // 기대상황 헤딩이 없으면 트래커 항목이 아님(개인 메모 등) → 면제.
      if (!subs.some((s) => s.title.startsWith(EXPECTATION))) continue;
      const nonEmpty = (name) =>
        subs.some((s) => s.title.startsWith(name) && s.content.some((l) => l.trim() !== ""));
      const missing = REQUIRED.filter((name) => !nonEmpty(name));
      if (missing.length) out.push({ path: p, section: sec.title, missing });
    }
  }
  return out;
}

function formatViolations(violations) {
  const lines = [
    "✘ backlog [ready] 트래커 양식 위반:",
    "",
    "`### 기대상황`을 갖는 [ready] 항목(fix·룰 트래커)은 아래 하위 섹션을 비어있지 않게 채워야 합니다",
    "(왜 고치는지·작성 세션 의견이 없으면 실행자가 판단 근거를 잃습니다):",
    "",
  ];
  for (const v of violations) {
    lines.push(`  - ${v.path} › ${v.section}`);
    lines.push(`      누락: ${v.missing.join(", ")}`);
  }
  lines.push(
    "",
    "  → 「현재상태」(발생한 문제·위반·공백)와 「현재 생각중인 방법」(작성 세션 의견)을 채우세요.",
    "  → 개인 메모·완성형 노트면 `## [ready]` 라벨을 떼거나(또는 [ideation]/[draft]) `### 기대상황`을 두지 마세요.",
  );
  return lines.join("\n");
}

export { isTrackerPath, splitReadySections, subsections, findViolations, formatViolations };
