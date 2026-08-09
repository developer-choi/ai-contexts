import { deny, readPayload } from "./hook-utils.mjs";

// fact-check 스킬의 측정 에이전트는 "무엇을 잴지"만 알아야 한다. 문서가 뭐라고 주장하는지
// 알면 그 주장을 확인하는 쪽으로만 재고, 주장이 틀렸을 때 그 틀림이 안 보인다.
// 지시서를 표로만 제한하면 기대를 적을 자리가 사라진다 — 산문 한 줄이 곧 누출 경로다.
const MARKER = "측정 지시서";

const payload = readPayload();
const prompt = payload.tool_input && payload.tool_input.prompt;

if (typeof prompt === "string") {
  const lines = prompt.split("\n").map((line) => line.trim()).filter(Boolean);

  if (lines[0] === MARKER) {
    const prose = lines.slice(1).filter((line) => !line.startsWith("|"));

    if (prose.length) {
      deny(
        `「${MARKER}」에는 표만 담습니다. 표가 아닌 줄이 ${prose.length}개 있습니다:\n` +
          prose.map((line) => `  ${line}`).join("\n") +
          `\n\n재는 쪽이 무엇을 기대하는지 알면 그 기대를 확인하는 쪽으로만 잽니다. ` +
          `대상과 입력만 표로 넘기고, 무엇을 기록할지는 fact-check 스킬이 정한 목록을 따르세요.`
      );
    }
  }
}
