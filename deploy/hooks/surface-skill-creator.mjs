import fs from "node:fs";
import { readPayload, addContext } from "./hook-utils.mjs";

// scw 벤치 문서를 연 세션이 skill-creator를 아직 안 불렀으면 부르라고 알린다. 도구는 차단하지 않는다.
//
// 문장으로는 안 먹혔다. benching/SKILL.md 맨 위·scw 라우팅 표·도구 이름까지 적은 판 셋을 벤치로
// 쟀더니(2026-09-23, sonnet, 팔당 2회) 워커 8명이 전부 그 문장을 Read하고도 Skill 도구를 안 불렀다.
// 링크된 문서는 빠짐없이 Read로 따라가면서 「다른 스킬을 불러라」만 건너뛴다 — 그래서 문서가 아니라
// 그 문서를 여는 순간에 끼워 넣는다.
//
// 이미 불렀으면 조용하다. 대화 기록에서 Skill 호출의 인자에 skill-creator가 있는지로 본다 —
// 플러그인이면 `anthropic-skills:skill-creator`처럼 접두가 붙어 이름 전체 일치로는 못 잡는다.

const BENCH_DOC = /[\\/]skills[\\/]scw[\\/]benching[\\/]SKILL\.md$/i;

function alreadyLoaded(transcriptPath) {
  if (typeof transcriptPath !== "string" || !transcriptPath) return false;
  let text;
  try {
    text = fs.readFileSync(transcriptPath, "utf8");
  } catch {
    return false; // 기록을 못 읽으면 알리는 쪽으로 기운다 — 한 번 더 뜨는 것이 안 뜨는 것보다 싸다
  }
  for (const line of text.split("\n")) {
    if (!line.includes("skill-creator")) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const content = row?.message?.content;
    if (!Array.isArray(content)) continue;
    if (content.some((part) => part?.type === "tool_use" && part.name === "Skill" && JSON.stringify(part.input ?? {}).includes("skill-creator"))) {
      return true;
    }
  }
  return false;
}

const payload = readPayload();
const file = payload?.tool_input?.file_path;
if (payload?.tool_name !== "Read" || typeof file !== "string" || !BENCH_DOC.test(file)) process.exit(0);
if (alreadyLoaded(payload.transcript_path)) process.exit(0);

addContext(
  "[skill-creator 미로드] scw 벤치 문서를 열었는데 이 세션은 skill-creator를 아직 안 불렀다. " +
    "벤치를 설계하기 전에 Skill 도구로 skill-creator를 부른다(플러그인으로 깔려 있으면 `anthropic-skills:skill-creator`). " +
    "시험 프롬프트·baseline 비교·채점의 틀은 그쪽이 갖고, scw benching은 그 위에 문장 단위 측정을 얹는다.",
  "PostToolUse",
);
