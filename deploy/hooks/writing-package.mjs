// write-doc 글쓰기 패키지(frontmatter + 본문 단일 .md)를 알아보는 데 쓰는 어휘와 파서.
// 패키지를 보는 훅(check-package-frontmatter·score-writing-package)이 함께 쓴다 — 훅마다 어휘 사본을 두면 한쪽만 고쳐진다.
//
// 어휘의 정본은 [입력](../skills/write-doc/SKILL.md#입력) 표다. 훅은 배포돼 나가는 파일이라 스킬 md를 읽어 쓸 수 없어
// 여기에 사본을 둔다(meta/coupling.json 「글쓰기 패키지 type 어휘」).

export const PACKAGE_TYPES = new Set([
  "pr-body",
  "readme",
  "pr-comment",
  "decision",
  "article",
  "case-study",
  "note",
]);

// 맨 앞 frontmatter 블록의 최상위 key만 읽는다. 값이 없거나 공백뿐이면 빈 문자열로 둔다
// (리스트·중첩 블록은 들여쓰기·대시로 시작하므로 최상위 key로 잡히지 않는다).
// 블록이 없으면 null.
export function parseFrontmatter(text) {
  const body = text.replace(/^﻿/, "");
  const lines = body.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end === -1) return null;
  const fields = {};
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    // 따옴표로 감싼 값은 벗겨서 읽는다 — `audience: ""`가 채워진 값으로 통과하지 않게.
    if (match) fields[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2").trim();
  }
  return fields;
}
