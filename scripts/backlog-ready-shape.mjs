// backlog frontmatter 양식 강제 — pre-commit이 쓰는 순수 판정 로직.
// 드리프트 방지를 위해 "무엇이 위반인가"는 여기 한 곳에서만 정의한다.
//
// 규칙 SSOT: deploy/skills/backlog/SKILL.md 「frontmatter 규칙」·「Ready 게이트 — 자가검증」.
//
// 서로 다른 판별자 두 게이트를 한 모듈에 담되 게이트를 분리한다(경로≠상태보유라 합치면 오작동):
//   [title 게이트] frontmatter에 `status:` 키가 있는 항목(= 상태 있는 백로그, 프로젝트 무관)은
//     frontmatter `title:`이 비어있지 않아야 한다. status 없는 무상태 노트는 면제(제목은 본문 `# H1` 유지).
//     → 발동을 디렉토리가 아니라 status 존재로 걸어야 opt-in [ready](외부 레포)도 커버하고,
//       AC/PP active/ 의 무상태 개인메모를 과강제하지 않는다.
//   [shape 게이트] ai-contexts·private-playground active/ 의 트래커(본문에 `## 기대상황` H2)이고
//     status: ready 이면 `## 기대상황`·`## 현재상태`·`## 현재 생각중인 방법` H2가 비어있지 않아야 한다.
//     왜 고치는지(현재상태)·작성 세션 의견(현재 생각중인 방법)이 없으면 실행자가 판단 근거를 잃는다.
//     `## 기대상황`이 없는 status:ready(개인 메모·완성형 노트)는 트래커가 아니라 면제한다.
//   [focus 게이트] frontmatter에 `focus:` 키가 있으면 값이 low|high여야 한다(프로젝트 무관, opt-in 필드).
//     내 집중력 요구량을 표기해 저집중 배치를 선별하는 축. 값 오타(medium 등)를 커밋 시점에 막는다.
//
// 정규식은 frontmatter 블록(첫 `---`~다음 `---`)·H2 앵커로 스코프한다 — 본문 코드블록·인용의
//   `status:`/`title:` 문자열이나 `### 기대상황`(H3)에 오매치하지 않게.
// rules-as-code: "키·H2 섹션이 비어있지 않게 존재하는가"는 LLM 판단 0인 강제 칸. 내용 품질은
//   critic(리뷰 모드)이 본다 — hook은 존재만 결정론적으로 보장한다.

const TRACKER_DIRS = [
  "backlog/projects/ai-contexts/active/",
  "backlog/projects/private-playground/active/",
];
const PROJECTS_PREFIX = "backlog/projects/";

// 트래커 shape 판별 앵커(`## 기대상황` H2). 강제 대상 하위 섹션이기도 하다.
const EXPECTATION = "기대상황";
const SHAPE_REQUIRED = [EXPECTATION, "현재상태", "현재 생각중인 방법"];

// focus 게이트 허용 값. 내 집중력 요구량 — low=적게, high=많이.
const FOCUS_VALUES = ["low", "high"];

function normalize(path) {
  return path.replace(/\\/g, "/");
}

// path가 이 개편의 대상(backlog/projects 하위 .md)인가. title 게이트 수집 범위.
function isProjectMd(path) {
  const p = normalize(path);
  return p.endsWith(".md") && p.startsWith(PROJECTS_PREFIX);
}

// path가 shape 게이트(AC/PP active 트래커) 대상 .md인가.
function isTrackerPath(path) {
  const p = normalize(path);
  return p.endsWith(".md") && TRACKER_DIRS.some((d) => p.startsWith(d));
}

// frontmatter 상태를 판정한다.
//   kind: "none"(첫 줄이 `---` 아님) | "unclosed"(열렸으나 닫는 `---` 없음 — malformed) | "ok"
//   lines: ok일 때 블록 내부 줄 배열, 아니면 []
//   body: frontmatter 이후 본문 줄(none이면 전체, unclosed면 []).
// 안 닫힌 frontmatter를 "none"과 구분해야 findViolations가 malformed로 잡는다(조용히 면제 방지).
function frontmatterInfo(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") return { kind: "none", lines: [], body: lines };
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return { kind: "ok", lines: lines.slice(1, i), body: lines.slice(i + 1) };
  }
  return { kind: "unclosed", lines: [], body: [] };
}

// frontmatter 블록에 top-level 키가 있는가(값 유무 무관).
function hasFrontmatterKey(fmLines, key) {
  const re = new RegExp(`^${key}:`);
  return fmLines.some((l) => re.test(l));
}

// frontmatter 블록의 top-level 스칼라 값(트림). 없으면 "".
// YAML 최소 정규화: 따옴표 벗기기 + 미따옴표 인라인 주석(` #...`·전체 주석) 제거.
// `status: ready # 메모`나 `status: "ready"`가 값 불일치로 shape를 조용히 빠져나가지 않게,
// `title: ""`·`title: #x`가 빈 값인데 통과하지 않게.
function frontmatterScalar(fmLines, key) {
  const re = new RegExp(`^${key}:\\s*(.*)$`);
  for (const l of fmLines) {
    const m = re.exec(l);
    if (!m) continue;
    let v = m[1].trim();
    if (v[0] === '"' || v[0] === "'") {
      const q = v.match(/^(['"])(.*?)\1/); // 따옴표 안이 값(그 안엔 주석 없음)
      return q ? q[2].trim() : v.slice(1).trim();
    }
    v = v.replace(/\s+#.*$/, ""); // 미따옴표: ` #주석` 제거
    if (v.startsWith("#")) v = ""; // 값 전체가 주석 → 빈 값
    return v.trim();
  }
  return "";
}

// 본문을 `## ` H2 섹션 [{title, body}]로 끊는다. `^##\s+`라 `### `(H3)는 안 걸린다(3번째가 공백 아님).
function splitH2Sections(lines) {
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      if (cur) sections.push(cur);
      cur = { title: h2[1].trim(), body: [] };
      continue;
    }
    if (cur) cur.body.push(line);
  }
  if (cur) sections.push(cur);
  return sections;
}

// files: [{path, content}]. 반환: [{path, gate, missing?, detail?}] 위반 목록.
function findViolations(files) {
  const out = [];
  for (const { path, content } of files) {
    const p = normalize(path);
    if (!isProjectMd(p)) continue;
    const fm = frontmatterInfo(content);

    // [malformed 게이트] frontmatter가 열렸는데 안 닫힌 파일은 두 게이트가 조용히 면제된다
    // (마이그레이션 프로그램 생성에서 가장 나기 쉬운 오형식) → 명시적 위반으로 잡는다.
    if (fm.kind === "unclosed") {
      out.push({ path: p, gate: "malformed", detail: "frontmatter가 `---`로 열렸으나 닫는 `---`가 없음" });
      continue;
    }

    // [title 게이트] status 키가 있으면 title이 비어있지 않아야 한다(프로젝트 무관).
    if (hasFrontmatterKey(fm.lines, "status") && !frontmatterScalar(fm.lines, "title")) {
      out.push({ path: p, gate: "title", detail: "status 있는 항목은 frontmatter `title:`이 비어있으면 안 됨" });
    }

    // [focus 게이트] focus 키가 있으면 값이 low|high여야 한다(프로젝트 무관, opt-in 필드).
    if (hasFrontmatterKey(fm.lines, "focus")) {
      const v = frontmatterScalar(fm.lines, "focus");
      if (!FOCUS_VALUES.includes(v)) {
        out.push({ path: p, gate: "focus", detail: `focus 값은 ${FOCUS_VALUES.join("|")}여야 함 (현재: ${v || "(빈 값)"})` });
      }
    }

    // [shape 게이트] AC/PP active 트래커 + status: ready + `## 기대상황` H2 → triple 비어있지 않아야 한다.
    if (isTrackerPath(p) && frontmatterScalar(fm.lines, "status") === "ready") {
      const sections = splitH2Sections(fm.body);
      const isAnchor = (t) => t === EXPECTATION || t.startsWith(`${EXPECTATION} `) || t.startsWith(`${EXPECTATION}(`);
      const isTracker = sections.some((s) => isAnchor(s.title));
      if (isTracker) {
        const nonEmpty = (name) =>
          sections.some((s) => s.title.startsWith(name) && s.body.some((l) => l.trim() !== ""));
        const missing = SHAPE_REQUIRED.filter((name) => !nonEmpty(name));
        if (missing.length) out.push({ path: p, gate: "shape", missing });
      }
    }
  }
  return out;
}

function formatViolations(violations) {
  const lines = ["✘ backlog frontmatter 양식 위반:", ""];
  const malformedV = violations.filter((v) => v.gate === "malformed");
  const titleV = violations.filter((v) => v.gate === "title");
  const focusV = violations.filter((v) => v.gate === "focus");
  const shapeV = violations.filter((v) => v.gate === "shape");

  if (malformedV.length) {
    lines.push("[malformed] frontmatter가 `---`로 열렸으나 닫히지 않았습니다(검증이 조용히 면제됩니다):");
    for (const v of malformedV) lines.push(`  - ${v.path}`);
    lines.push("  → 닫는 `---`를 추가하세요.", "");
  }
  if (titleV.length) {
    lines.push("[title] status(상태) 있는 항목은 frontmatter `title:`을 비어있지 않게 채워야 합니다:");
    for (const v of titleV) lines.push(`  - ${v.path}`);
    lines.push(
      "  → frontmatter에 `title: <제목>`을 채우세요. 무상태 노트면 `status:`를 빼세요(제목은 `# H1` 유지).",
      "",
    );
  }
  if (focusV.length) {
    lines.push("[focus] `focus:`는 low|high만 허용합니다:");
    for (const v of focusV) lines.push(`  - ${v.path}\n      ${v.detail}`);
    lines.push("  → focus 값을 low 또는 high로 고치거나, 안 쓰면 키를 빼세요.", "");
  }
  if (shapeV.length) {
    lines.push(
      "[shape] `## 기대상황`을 갖는 status:ready 트래커 항목은 아래 H2 섹션을 비어있지 않게 채워야 합니다",
      "(왜 고치는지·작성 세션 의견이 없으면 실행자가 판단 근거를 잃습니다):",
    );
    for (const v of shapeV) lines.push(`  - ${v.path}\n      누락: ${v.missing.join(", ")}`);
    lines.push(
      "  → 「현재상태」(발생한 문제·위반·공백)와 「현재 생각중인 방법」(작성 세션 의견)을 채우세요.",
      "  → 개인 메모·완성형 노트면 status를 [ideation]/[draft]로 두거나 `## 기대상황`을 두지 마세요.",
    );
  }
  return lines.join("\n");
}

export { isProjectMd, isTrackerPath, frontmatterInfo, frontmatterScalar, splitH2Sections, findViolations, formatViolations };
