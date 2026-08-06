// md 본문에 「대문자 + 숫자」 코드가 들어가려 하면 AI에게 알린다 (차단하지 않는다).
//
// `E1`·`K10`·`TC-A1` 같은 코드는 그 체계를 아는 사람에게만 뜻이 통한다. 뜻이 함께 나오지
// 않는 자리에 홀로 놓이면 읽는 사람에게 아무것도 전달하지 않는다 (writing-guide tone.md
// 「도구 식별자를 문서 마커로 쓰지 않는다」).
//
// 실측 사고 (2026-08-06, KA): 체크 목록 사본 표를 지우면서(26826f9) 그 표를 가리키던
// `린터(K10)가 본다`·`린터(K7)가 보지만`은 안 고쳐, 가리킬 곳 없는 코드만 남았다.
//
// 차단이 아니라 알림인 이유: `V8`·`L3`·`H1`처럼 코드 모양이지만 실존하는 기술 용어가 많고,
// 그 목록을 빠짐없이 유지하는 것은 불가능하다. 알림이면 빠뜨려도 AI가 그 자리에서 판단해
// 넘기면 되지만, 차단이면 정상 문서가 막힌다.
import fs from "node:fs";
import path from "node:path";

import { addContext, getToolName, readPayload } from "./hook-utils.mjs";

const EDIT_TOOLS = new Set(["Edit", "Write"]);

// 코드 모양이지만 실존하는 용어. 빠짐없이 채울 필요는 없다 — 빠뜨리면 알림 한 줄이 더 뜰 뿐이다.
// 실제로 쓰이는 것만 넣는다. "있을 법하다"로 채우면 쓰지도 않는 토큰이 목록을 불리고,
// 더 나쁘게는 잡아야 할 것을 풀어준다(`Q1`을 분기로 넣었다가 KA 질문 번호를 놓친 적 있다).
const KNOWN_TERMS = new Set([
  "H1", "H2", "H3", "H4", // 마크다운 제목 레벨
  "L1", "L2", "L3", "L4", "L7", // 네트워크 계층 — 「데이터링크 계층(L2)」처럼 이름과 함께 쓴다
  "V8", // 자바스크립트 엔진
  "S3", // AWS
]);

// 검사에서 통째로 빼는 레포. 남이 읽지 않는 개인 메모라 코드를 써도 손해가 적은 곳이다.
const SKIP_REPOS = new Set(["backlog"]);

const payload = readPayload();
if (!EDIT_TOOLS.has(getToolName(payload))) process.exit(0);

const input = payload.tool_input ?? {};
const filePath = typeof input.file_path === "string" ? input.file_path : "";
if (!filePath || path.extname(filePath).toLowerCase() !== ".md") process.exit(0);
if (SKIP_REPOS.has(repoName(filePath))) process.exit(0);

const written = typeof input.content === "string" ? input.content : typeof input.new_string === "string" ? input.new_string : "";
if (!written) process.exit(0);

const hits = findCodes(written);
if (!hits.length) process.exit(0);

addContext(
  [
    `[뜻 없는 코드] ${path.basename(filePath)} 에 코드 모양 토큰이 있다: ${hits.join(", ")}`,
    `이 문서를 처음 읽는 사람에게 저 토큰은 아무것도 전달하지 않는다. 하나씩 아래로 판정한다.`,
    ``,
    `1. 내가 항목에 붙인 번호인가 → 무엇을 가리키는지 풀어 쓴 이름으로 바꾼다.`,
    `   before: \`## TC-A1. 드래그로 닫기\` / \`- A3. 동료들도 그렇게 평가하나요?\``,
    `   after:  \`## 드래그로 닫기\` / \`- 동료들도 그렇게 평가하나요?\``,
    `   순서를 세야 해서 번호가 필요하면 마크다운 순서 목록을 쓴다 — 번호를 손으로 안 적어도 된다.`,
    ``,
    `2. 다른 곳이 정의한 식별자인가 (린터 체크 ID·규칙 코드) → 그 검사가 무엇을 보는지로 바꾼다.`,
    `   before: \`순서 1:1은 린터(K7)가 보지만\``,
    `   after:  \`순서 1:1은 목차-본문 순서 검사가 보지만\``,
    `   ID를 괄호로 남기고 싶어지지만, 그 ID의 정본은 코드(체크 등록부)다. 산문에 옮겨 적으면`,
    `   번호가 바뀌거나 검사가 합쳐져도 아무도 안 고쳐 조용히 낡는다 — 이 훅이 생긴 계기가 그 사고다.`,
    ``,
    `3. 파일의 몇째 줄을 가리키는가 → 클릭 가능한 형태로 쓴다.`,
    `   before: \`figma-spec.md L40에 …\``,
    `   after:  \`figma-spec.md:40 에 …\``,
    ``,
    `4. 버전인가 → 무엇의 몇 번인지 드러나게 풀어 쓴다.`,
    `   before: \`draggable 기본값이 V10에서 바뀜\``,
    `   after:  \`draggable 기본값이 react-toastify 10에서 바뀜\``,
    ``,
    `5. 어딘가에 그렇게 적혀 있어 글자 그대로 옮기는 자리인가 (금지 예시·오류 메시지·화면에 뜬 문구)`,
    `   → 지우지 말고 백틱으로 감싼다. 인용이라는 것이 드러나고 이 알림도 뜨지 않는다.`,
    `   before: \`- ❌ "Q1의 (A) 케이스를 primary로 저장할까요?"\``,
    `   after:  백틱으로 감싼 같은 문장`,
    ``,
    `6. 널리 쓰이는 기술 용어인가 (V8 엔진·S3·H1) → 그대로 두고 넘어간다.`,
    ``,
    `6번이라도 예외 목록(이 훅의 KNOWN_TERMS)에 넣지 않는다 — 한두 번 나오는 토큰은 등록`,
    `비용(훅 수정 + 배포)이 문서를 고치는 것보다 크고 목록은 영구히 남는다. 도구는 차단하지 않는다.`,
  ].join("\n"),
  "PreToolUse",
);

// 위로 올라가며 `.git`을 만나는 첫 폴더가 그 파일의 레포다. 경로에 이름이 들어있는지만
// 보면 다른 레포 안의 같은 이름 폴더까지 걸린다. (워크트리는 폴더명이 레포명과 달라
// 제외가 안 먹는다 — SKIP_REPOS에 넣을 레포가 워크트리를 쓰면 그때 다시 본다.)
function repoName(file) {
  let dir = path.dirname(path.resolve(file));
  for (;;) {
    if (fs.existsSync(path.join(dir, ".git"))) return path.basename(dir);
    const up = path.dirname(dir);
    if (up === dir) return "";
    dir = up;
  }
}

// 코드블록·인라인코드·URL·인코딩된 문자열을 걷어낸 뒤 남은 산문에서만 찾는다.
// base64 이미지와 퍼센트 인코딩 URL이 코드 모양 토큰의 최대 발생원이라(실측 backlog `A0` 77건)
// 걷어내지 않으면 알림이 오탐으로 뒤덮인다.
function findCodes(src) {
  const prose = src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/\S*(?::\/\/|data:|%[0-9A-Fa-f]{2})\S*/g, " ")
    // base64 blob은 여러 줄로 쪼개져 있어 둘째 줄부터는 `data:` 접두사가 없다. 길이로 잡는다.
    .replace(/[A-Za-z0-9+/]{40,}={0,2}/g, " ")
    // `TC_A1`은 밑줄이 단어 문자라 경계가 안 서서 `A1`이 안 걸린다. `TC-A1`과 같은 것이므로
    // 밑줄을 공백으로 바꿔 하이픈과 같은 경계로 만든다.
    .replace(/_/g, " ");

  const found = new Set();
  // 대문자는 한 글자만 본다. `NEW3`·`PS7`처럼 글자가 여럿 붙으면 그 접두사가 무엇인지
  // 말해주므로 체계를 몰라도 뜻이 선다. `TC-A1`·`TC_A1`은 구분자가 경계라 `A1`이 걸린다.
  //
  // 51 이상은 보지 않는다. 사람이 항목에 번호를 매길 때 그렇게까지 가는 일이 드물고,
  // 큰 숫자가 붙은 것은 대체로 진짜 이름이다(RE100·EWD447·S&P500). 이 경계 하나로
  // 그 부류가 예외 등록 없이 빠진다.
  for (const [token] of prose.matchAll(/\b[A-Z]([1-9]|[1-4][0-9]|50)\b/g)) {
    if (KNOWN_TERMS.has(token)) continue;
    found.add(token);
  }
  return [...found];
}
