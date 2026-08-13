// SKILL.md의 `## 목적` 절에 문단이 둘 이상 들어가려 하면 AI에게 알린다 (차단하지 않는다).
//
// 목적은 한 줄이고, 「왜 이 스킬이 필요한가」(존재 근거)는 별개 절이다 (scw guide.md
// 「산출물 규칙」). 그런데 목적 초안을 쓸 때마다 "이게 왜 중요한가"를 한 문단 더 붙이는
// 쏠림이 반복됐다 — 규칙은 guide.md에 있고 초안은 다른 자리에서 쓰이니, 쓰는 순간에
// 아무것도 걸리지 않았다. 이 훅이 그 순간에 선다.
//
// 실측 (2026-08-14, PP recruitment 스킬 정비): 목적 초안 4개를 냈는데 넷 다 아래에
// 이유 단락이 붙어 나왔다. 사용자가 "목적은 중요한 이유 쓰는 게 아니라 목적이 중요한
// 건데"로 짚어준 뒤에야 규칙을 다시 읽었다.
//
// 차단이 아니라 알림인 이유: 한 문단 안에서 목적을 두 문장으로 쓰는 정상 형태와,
// 목적 아래 다른 절을 잇는 형태가 겉모양으로 늘 갈리지는 않는다. 알림이면 AI가 그
// 자리에서 판단해 넘기면 되지만, 차단이면 정상 문서가 막힌다.
import path from "node:path";

import { addContext, getToolName, readPayload } from "./hook-utils.mjs";

const EDIT_TOOLS = new Set(["Edit", "Write"]);

const payload = readPayload();
if (!EDIT_TOOLS.has(getToolName(payload))) process.exit(0);

const input = payload.tool_input ?? {};
const filePath = typeof input.file_path === "string" ? input.file_path : "";
if (path.basename(filePath).toLowerCase() !== "skill.md") process.exit(0);

const written = typeof input.content === "string" ? input.content : typeof input.new_string === "string" ? input.new_string : "";
if (!written) process.exit(0);

const purpose = readPurposeSection(written);
if (!purpose || purpose.blocks.length < 2) process.exit(0);

addContext(
  [
    `[목적은 한 줄] ${path.basename(path.dirname(filePath))}/SKILL.md 의 「목적」 절에 문단이 ${purpose.blocks.length}개 들어간다.`,
    `둘째 문단부터는 대개 "이게 왜 중요한가"·"안 하면 무슨 일이 벌어지나"인데, 그건 존재 근거이지 목적이 아니다.`,
    ``,
    `before — 목적 아래에 이유를 이어 붙인 형태:`,
    `  ## 목적`,
    `  그 회사가 물어볼 기술 질문을 면접장이 아니라 여기서 처음 만난다.`,
    ``,
    `  아는 것과 말로 꺼내는 것은 다르다. 머릿속으로 안다고 넘긴 질문은 소리 내 답해보기`,
    `  전까지 막히는지 알 수 없다.`,
    ``,
    `after — 목적은 첫 줄에서 끝낸다:`,
    `  ## 목적`,
    `  그 회사가 물어볼 기술 질문을 면접장이 아니라 여기서 처음 만난다.`,
    ``,
    `잘라낸 문단은 셋 중 하나로 처리한다.`,
    `1. 그 스킬을 쓰는 AI가 알아야 판단이 달라지는 내용이면 별개 절(「왜 필요한가」 등)로 내린다.`,
    `2. 목적 문장이 부실해서 덧붙이게 된 것이면, 문단을 버리고 목적 한 줄을 다시 쓴다.`,
    `3. 어느 쪽도 아니면 버린다 — 읽는 쪽이 그 문단으로 하는 일이 없다.`,
    ``,
    `한 문단 안에서 목적을 두 문장으로 쓴 것이면 이 알림은 해당 없다. 그대로 진행한다.`,
  ].join("\n"),
  "PreToolUse",
);

// `## 목적` 헤딩 아래 다음 헤딩 전까지를 문단 단위로 끊는다.
//
// Edit는 파일 조각(new_string)만 넘어와 절이 어디서 끝나는지 모를 수 있다. 그래서 다음
// 헤딩을 못 만난 채 조각이 끝나면 아직 문단이 하나일 때만 조용히 넘긴다 — 이미 둘이면
// 뒤를 더 볼 것 없이 확정이고, 하나면 다음 줄에 무엇이 올지 알 수 없어 판단을 미룬다.
function readPurposeSection(src) {
  const lines = src.split(/\r?\n/);
  const start = lines.findIndex((line) => /^##\s+목적\s*$/.test(line));
  if (start === -1) return null;

  const body = [];
  let terminated = false;
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) {
      terminated = true;
      break;
    }
    body.push(line);
  }

  const blocks = splitBlocks(body);
  if (!terminated && blocks.length < 2) return null;
  return { blocks };
}

// 빈 줄로 갈린 덩어리를 센다. 코드블록 안의 빈 줄은 덩어리를 가르지 않는다 — 예시 코드가
// 통째로 하나이지 여러 문단이 아니다.
function splitBlocks(lines) {
  const blocks = [];
  let current = [];
  let inFence = false;

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && line.trim() === "") {
      if (current.length) blocks.push(current.join("\n"));
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.length) blocks.push(current.join("\n"));
  return blocks;
}
