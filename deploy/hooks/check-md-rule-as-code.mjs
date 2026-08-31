// 프롬프트·스킬 md에 규칙 절을 새로 세우려 하면, 그 규칙을 한 칸 왼쪽(도구)으로 내릴 수 있는지
// 묻는 판정 질문을 그 자리에 띄운다 (차단하지 않는다).
//
// 전역 룰이 「규칙을 새로 만들거나 손볼 때 rules-as-code.md를 로드하라」를 이미 적어뒀는데,
// 그 문장이 컨텍스트에 있는 채로 규칙을 신설한 세션이 그 문서를 안 읽었다 (2026-08-31, AC
// 38b38ab1 = scw SKILL.md에 「다른 파일의 단계는 번호로 가리키지 않는다」 신설). 원인은 판단력이
// 아니라 트리거다 — 그 룰은 **의도**로 트리는데("규칙을 만들 때"), 세션은 자기 작업을 "백로그
// 실행"·"스킬 문서 편집"으로 분류하고 있었다. 결과물이 규칙이었다는 것은 다 쓰고 나서야 보인다.
// 그래서 의도가 아니라 **파일을 건드리는 행위**가 불러내게 옮긴다.
//
// 차단이 아니라 알림인 이유: "이 편집이 규칙 신설인가"는 판단이라 결정론으로 안 갈린다. 규칙을
// 인용·예시로 싣거나 기존 규칙을 재배치하는 정상 편집이 막히면 안 된다 (형제 훅
// check-md-hook-restatement.mjs와 같은 사유).
//
// 판정 질문을 이 파일에 적어두지 않고 rules-as-code.md에서 읽어오는 이유: 적어두면 사본이 되어
// 그 문서가 바뀔 때 여기만 낡는다. 그 문서 자신의 「목록이 산문에 있어야 하면 방향을 뒤집는다 —
// md를 정본으로 두고 코드가 그 md를 읽게 한다」를 그대로 따른다.
//
// 발동 조건 실측 (2026-08-31, AC deploy/skills·contexts·rules를 건드린 최근 80커밋 = 223
// 커밋×파일): 절 신설 + 금지 어미로 26건이 걸렸고, 그중 14건이 실제 규칙 신설이었다. 나머지는
// 기존 규칙을 걷거나 재배치한 편집인데, 거기서도 "이 규칙을 도구로 내릴 수 있나"는 유효한
// 물음이라 소음으로 세지 않았다. 「반드시」·「항상」·「필수」를 조건에 넣으면 5건이 늘고 그 5건은
// 전부 재배치였다 — 그래서 금지 어미만 본다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { addContext, getToolName, isPromptDoc, prose, readPayload, repoNameOf } from "./hook-utils.mjs";

const EDIT_TOOLS = new Set(["Edit", "Write"]);

// 검사에서 통째로 빼는 레포. 형제 훅과 같은 목록을 쓴다 — 남이 읽지 않는 개인 메모라 규칙을
// 적어둬도 손해가 적다.
const SKIP_REPOS = new Set(["backlog"]);

// 절을 새로 세우는 편집만 본다. "md 편집 전부"로 잡으면 산문을 다듬을 때마다 떠서 무시된다.
const NEW_SECTION = /^#{2,6}\s+\S/m;

// 규칙 꼴 문장. 금지 어미만 본다 — 이 문서들은 전부 「~한다」체라 평서 어미로는 안 갈린다.
const PROHIBITIVE = /않는다|않도록|금지|말라|하지\s*마/;

const GUIDE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "contexts", "rules-as-code.md");

const payload = readPayload();
if (!EDIT_TOOLS.has(getToolName(payload))) process.exit(0);

const input = payload.tool_input ?? {};
const filePath = typeof input.file_path === "string" ? input.file_path : "";
if (!filePath || path.extname(filePath).toLowerCase() !== ".md") process.exit(0);
if (!isPromptDoc(filePath)) process.exit(0);
if (SKIP_REPOS.has(repoNameOf(filePath))) process.exit(0);

const written = typeof input.content === "string" ? input.content : typeof input.new_string === "string" ? input.new_string : "";
const body = prose(written);
if (!NEW_SECTION.test(body) || !PROHIBITIVE.test(body)) process.exit(0);

addContext(
  [
    `[규칙을 심기 전에] ${path.basename(filePath)} 에 규칙 절을 새로 세우려 한다.`,
    `산문으로 두기 전에 한 칸 왼쪽으로 내릴 수 있는지 본다.`,
    ``,
    ...guideExcerpt(),
    ``,
    `내릴 수 없으면(판단이 남거나 틀려도 그 자리에서 드러나면) 산문 그대로 둔다 — 억지로 안 내린다.`,
    `이 편집이 규칙 신설이 아니라 인용·재배치·삭제면 그대로 넘어간다.`,
  ].join("\n"),
  "PreToolUse",
);

// 사다리와 두 게이트만 뽑아 온다. 못 읽으면 파일을 지목하는 데서 멈춘다 — 사본을 두지 않으려는
// 것이므로, 여기에 대신 적어두면 애초의 목적이 사라진다.
function guideExcerpt() {
  let src;
  try {
    src = fs.readFileSync(GUIDE, "utf8");
  } catch {
    return [`판정 기준은 ${GUIDE} 에 있다. 지금 열어서 대입한다.`];
  }

  const out = [];
  const ladder = src.match(/^##\s*강제 사다리\s*$[\s\S]*?```\n([\s\S]*?)```/m);
  if (ladder) out.push(ladder[1].trim(), ``);

  const gates = src.split("\n").filter((line) => /^>\s*\*\*게이트/.test(line));
  if (gates.length) out.push(...gates);

  if (!out.length) return [`판정 기준은 ${GUIDE} 에 있다. 지금 열어서 대입한다.`];
  out.push(``, `사다리 칸·게이트 판정의 근거와 예외는 ${GUIDE} 에 있다.`);
  return out;
}
