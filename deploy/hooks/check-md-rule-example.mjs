// 프롬프트·스킬 md에 규칙 옆 예시(before/after 쌍, 세션 사건 서술)를 새로 넣으려 하면 그 자리에
// 판정 질문을 띄운다 (차단하지 않는다).
//
// 예시는 사용자가 지목한 것만 붙인다. 그런데 이 판정은 쓰고 난 뒤에 하면 이미 늦다 — 규칙마다
// 붙일지 말지를 그때그때 판단하면 판단이 붙이는 쪽으로만 기울어, 규칙이 늘수록 문서가 예시로
// 덮인다. 형제 훅 check-md-rule-as-code.mjs와 같은 이유로 의도가 아니라 파일을 건드리는 행위가
// 불러내게 한다.
//
// 커밋 시점(git pre-commit)이 아니라 편집 시점인 이유: 커밋 때 보면 이번에 안 건드린 옛 예시까지
// 함께 걸려, 한 줄 고치러 들어간 커밋에 무관한 삭제가 크게 붙는다. 편집 시점은 이번에 새로 넣는
// 것만 보므로 옛 예시가 시야에 안 들어온다.
//
// 차단이 아니라 알림인 이유: 사용자가 지목해 넣는 예시와 AI가 스스로 붙이는 예시는 텍스트가 같아
// 결정론으로 안 갈린다. 인용·재배치처럼 예시를 옮기기만 하는 정상 편집도 막히면 안 된다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { addContext, getToolName, isPromptDoc, prose, readPayload, repoNameOf } from "./hook-utils.mjs";

const EDIT_TOOLS = new Set(["Edit", "Write"]);

// 형제 훅과 같은 목록 — 남이 읽지 않는 개인 메모라 예시를 남겨도 손해가 적다.
const SKIP_REPOS = new Set(["backlog"]);

// 사용자가 승인한 형태는 코드·문장 두 개를 나란히 놓은 짧은 대조다(deploy/contexts/coding-standards).
// 사건 서술이 없어 아래 어느 패턴에도 안 걸리므로 경로로 뺄 필요가 없다.
const PATTERNS = [
  // before/after 쌍. 규칙마다 하나씩 붙어 문서를 덮은 그 형태다.
  { re: /^[\s>*\-]*\*\*(?:before|after)\*\*/im, why: "before/after 예시 쌍" },
  // 날짜가 붙은 판정 블록 — `❌ 위반 (…, 2026-08-14)` 꼴.
  { re: /^[\s>*\-]*(?:\*\*)?[❌✅⚠](?=.*20\d\d[-.]\d{1,2}[-.]\d{1,2})/m, why: "날짜가 붙은 위반 사례 블록" },
  // 날짜로 여는 강조 문단 — `**2026-08-15 개정.** 그전에는 …` 꼴.
  { re: /^[\s>*\-]*\*\*20\d\d[-.]\d{1,2}[-.]\d{1,2}/m, why: "날짜로 여는 개정 이력" },
  // 세션에서 사용자가 무슨 말을 했는지 되짚는 서술.
  { re: /사용자\s*(?:교정|반려|지시|지적)\s*[*"“:]/, why: "사용자 발화를 되짚는 서술" },
];

const GUIDE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "skills",
  "scw",
  "specialized",
  "lean-prompt.md",
);

const payload = readPayload();
if (!EDIT_TOOLS.has(getToolName(payload))) process.exit(0);

const input = payload.tool_input ?? {};
const filePath = typeof input.file_path === "string" ? input.file_path : "";
if (!filePath || path.extname(filePath).toLowerCase() !== ".md") process.exit(0);
if (!isPromptDoc(filePath)) process.exit(0);
if (SKIP_REPOS.has(repoNameOf(filePath))) process.exit(0);

const written = typeof input.content === "string" ? input.content : typeof input.new_string === "string" ? input.new_string : "";
const body = prose(written);

const hits = PATTERNS.filter((p) => p.re.test(body)).map((p) => p.why);
if (!hits.length) process.exit(0);

addContext(
  [
    `[규칙 옆 예시] ${path.basename(filePath)} 에 ${hits.join(" · ")}을(를) 넣으려 한다.`,
    `예시는 사용자가 지목한 것만 붙인다. 스스로 "있어야 이해된다"고 판단해 붙이는 길은 없다.`,
    ``,
    ...guideExcerpt(),
    ``,
    `세션에서 얻은 조건은 사례가 아니라 규칙 문장에 담는다. 사건을 빼면 규칙이 안 선다면,`,
    `그 조건이 아직 문장에 안 들어간 것이다 — 문장으로 옮긴 뒤 사건은 적지 않는다.`,
    `사용자가 지목했거나, 외부 1차 소스 인용·검수 입력으로 넘어가는 판정 재료면 그대로 넣는다.`,
  ].join("\n"),
  "PreToolUse",
);

// 적지 않는 꼴 목록을 lean-prompt.md에서 읽어온다. 여기 옮겨 적으면 사본이 되어 그 문서가 바뀔 때
// 훅만 낡는다 — rules-as-code.md 「정본이 코드에 있으면 산문은 옮겨 적지 않는다」의 반대 방향이다.
function guideExcerpt() {
  let src;
  try {
    src = fs.readFileSync(GUIDE, "utf8");
  } catch {
    return [`판정 기준은 ${GUIDE} 「규칙 옆에 예시를 붙이지 않는다」에 있다. 지금 열어서 대입한다.`];
  }

  const section = src.match(/^###\s*사건은 규칙 문장으로 옮기고 지운다\s*$([\s\S]*?)^###\s/m);
  const bullets = (section?.[1] ?? "").split("\n").filter((line) => /^-\s+\S/.test(line));
  if (!bullets.length) return [`판정 기준은 ${GUIDE} 「규칙 옆에 예시를 붙이지 않는다」에 있다. 지금 열어서 대입한다.`];

  return [`적지 않는 꼴:`, ...bullets];
}
