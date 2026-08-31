// 글쓰기 패키지(frontmatter + 본문 단일 .md)를 저장할 때 필수 필드가 비어 있으면 막는다.
//
// 필수 필드 규정은 deploy/contexts/writing-guide/package-format.md에 있었으나 강제 장치가
// 프롬프트 지시뿐이었다 — write-refine 입구 검사는 (1) refine을 불러야만 발동하고
// (2) 실행 AI가 우회할 수 있다(2026-07-25 KA digest 호출에서 실제 우회). 저장 시점 기계
// 검사가 그 지연·우회를 함께 없앤다.
//
// 패키지 감지는 경로가 아니라 내용 기반이다 — 패키지는 아무 레포에서나 만들어져 고정 경로가
// 없다. 저장 결과 텍스트의 맨 앞 frontmatter에 type이 있고 값이 패키지 어휘일 때만 발동한다.
// 코드펜스 안의 예시(package-format.md의 샘플)는 맨 앞이 아니므로 걸리지 않는다.
//
// 어휘의 단일 출처: type 목록과 subtype 필수 여부는 deploy/skills/write-init/SKILL.md
// 「입력」 표, 필드 목록은 package-format.md. 둘이 바뀌면 여기도 함께 고친다.
//
// 필수 셋에서 subtype을 뺀 이유: write-init 「입력」 표에서 subtype이 필수인 type은
// pr-comment뿐이고(나머지는 미사용), write-refine 입구 정규화도 subtype은 유도하지 않는다.
// 전 type에 강요하면 정상 패키지가 막힌다 — 그래서 pr-comment에만 건다.
//
// deny(ask 아님)인 이유: 필수 필드가 빈 패키지는 다음 세션의 write-refine이 출발할 수 없어
// 어떤 맥락에서도 정상이 아니다. codex는 PreToolUse를 '*'로 통합하므로 tool_name으로
// self-filter한다.
import fs from "node:fs";
import { deny, getToolName, readPayload } from "./hook-utils.mjs";

const EDIT_TOOLS = new Set(["Edit", "Write"]);
const PACKAGE_TYPES = new Set([
  "pr-body",
  "readme",
  "pr-comment",
  "resume-intro",
  "resume-item",
  "decision",
  "article",
]);
const REQUIRED_FIELDS = ["type", "audience", "purpose", "key_message"];
const SUBTYPE_REQUIRED_TYPES = new Set(["pr-comment"]);

const payload = readPayload();
if (EDIT_TOOLS.has(getToolName(payload))) {
  const input = payload.tool_input && typeof payload.tool_input === "object" ? payload.tool_input : {};
  const filePath = typeof input.file_path === "string" ? input.file_path : "";
  if (/\.md$/i.test(filePath)) {
    const fields = parseFrontmatter(resultingText(input));
    if (fields && PACKAGE_TYPES.has(fields.type)) {
      const missing = missingFields(fields);
      if (missing.length) {
        deny(
          `글쓰기 패키지(type: ${fields.type})인데 필수 frontmatter 필드가 비어 있습니다: ${missing.join(", ")}. ` +
            `값을 채운 뒤 다시 저장하세요 — 이 필드들은 다음 세션의 write-refine이 대화 기억 없이 출발하는 유일한 단서입니다. ` +
            `필드 의미는 deploy/contexts/writing-guide/package-format.md 참조.`,
        );
      }
    } else if (fields && looksLikePackage(fields)) {
      // 어휘를 벗어난 type은 위 self-filter를 그냥 빠져나간다 — 즉 **오타일수록 검사가 느슨해지는**
      // 방향으로 실패한다(`pr_body`·`pr-review`로 적으면 아무 검사도 안 받는다). 그런데 입구
      // 정규화가 붙인 frontmatter는 사용자가 볼 일이 없어 더 안 드러난다.
      // 나머지 필수 필드가 함께 있으면 그건 글쓰기 패키지가 맞고 type만 어긋난 것이다.
      deny(
        `글쓰기 패키지로 보이는데 type이 어휘 밖입니다: ${fields.type ? `"${fields.type}"` : "(없음)"}. ` +
          `허용 값: ${[...PACKAGE_TYPES].join(", ")}. ` +
          `어휘를 벗어난 값은 필수 필드 검사를 통째로 빠져나가므로 여기서 막습니다.`,
      );
    }
  }
}
process.exit(0);

// type 말고 나머지 필수 필드가 둘 이상 있으면 글쓰기 패키지로 본다. 하나만으로는
// 무관한 md(`purpose:` 하나 쓰는 문서 등)가 걸리므로 둘을 요구한다.
function looksLikePackage(fields) {
  return REQUIRED_FIELDS.filter((f) => f !== "type" && fields[f]).length >= 2;
}

// 저장 후 파일이 갖게 될 텍스트. Edit은 new_string이 본문 조각일 수 있어 디스크 내용에
// 치환을 적용해야 frontmatter를 볼 수 있다 — 그래야 "값을 지우는 Edit"도 잡힌다.
function resultingText(input) {
  if (typeof input.content === "string") return input.content; // Write
  if (typeof input.new_string !== "string") return "";
  const current = readFileSafe(input.file_path);
  const oldString = typeof input.old_string === "string" ? input.old_string : "";
  if (current === null || !oldString || !current.includes(oldString)) return input.new_string;
  return input.replace_all
    ? current.split(oldString).join(input.new_string)
    : current.replace(oldString, () => input.new_string);
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

// 맨 앞 frontmatter 블록의 최상위 key만 읽는다. 값이 없거나 공백뿐이면 빈 문자열로 둔다
// (리스트·중첩 블록은 들여쓰기·대시로 시작하므로 최상위 key로 잡히지 않는다).
// 블록이 없으면 null.
function parseFrontmatter(text) {
  const body = text.replace(/^﻿/, "");
  const lines = body.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end === -1) return null;
  const fields = {};
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (match) fields[match[1]] = match[2].trim();
  }
  return fields;
}

function missingFields(fields) {
  const required = [...REQUIRED_FIELDS];
  if (SUBTYPE_REQUIRED_TYPES.has(fields.type)) required.push("subtype");
  return required.filter((name) => !fields[name]);
}
