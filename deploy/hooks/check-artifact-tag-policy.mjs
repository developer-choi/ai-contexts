// AI가 Write/Edit로 파일에 툴 프로토콜 잔재 태그(</content>·</invoke> 등)를 흘려 넣는 것을
// 쓰기 시점에 차단한다. 이 태그는 도구 호출/결과 래퍼가 렌더 텍스트로 새어든 아티팩트라
// 정상 콘텐츠엔 없어야 하며, 커밋·서브에이전트 브랜치까지 가기 전에 원천에서 막는다.
// (실제 발생: 2026-07-12 디스패치에서 AC·MP testing 문서 끝에 </content>·</invoke> 잔존.)
//
// 오탐 방지: "그 태그만 홀로 있는 줄"(EOF 잔재의 실제 모양)만 잡는다. 산문 속 백틱 언급
// (`</content>` 를 설명하는 문장)이나 문장 중간 등장은 통과한다 — 아티팩트를 *논의*하는
// 문서는 안 막힌다. 막히면 그 줄을 지우거나 백틱으로 감싸 인라인으로 쓰면 통과한다.
//
// deny(ask 아님)인 이유: 이 태그는 어떤 맥락에서도 파일에 정상적으로 홀로 있을 수 없다.
// codex는 PreToolUse를 '*'로 통합하므로 EDIT_TOOLS로 self-filter한다(MultiEdit는 edit 어댑터가
// 라우팅하지 않아 미포함).
import { deny, readPayload } from "./hook-utils.mjs";

const EDIT_TOOLS = new Set(["Edit", "Write"]);

// 툴 프로토콜 태그 이름. antml: 네임스페이스는 모호성 0. content/invoke/parameter/
// function_calls/function_results/result는 호출·결과 래퍼가 새어들 때 나오는 태그.
const TAG = "(?:antml:[a-z_]+|content|invoke|parameter|function_calls|function_results|result)";
// 한 줄 전체가 여는/닫는 태그일 때만 매칭(속성 허용, 앞뒤 공백 허용).
const STRAY_LINE = new RegExp(`^\\s*</?${TAG}(?:\\s[^>]*)?>\\s*$`, "i");

const payload = readPayload();
const toolName = typeof payload.tool_name === "string" ? payload.tool_name : "";
if (EDIT_TOOLS.has(toolName)) {
  const hit = firstStrayTag(extractText(payload.tool_input));
  if (hit) {
    deny(
      `쓰려는 내용에 툴 프로토콜 잔재 태그로 보이는 줄이 있습니다: "${hit}". ` +
        `도구 호출/결과 래퍼가 새어든 아티팩트이니 그 줄을 지우고 다시 쓰세요. ` +
        `(태그를 문서에서 설명하려면 백틱으로 감싸 인라인으로 쓰면 통과합니다.)`,
    );
  }
}
process.exit(0);

function extractText(input) {
  if (!input || typeof input !== "object") return "";
  if (typeof input.content === "string") return input.content; // Write
  if (typeof input.new_string === "string") return input.new_string; // Edit
  return "";
}

function firstStrayTag(text) {
  for (const line of text.split(/\r?\n/)) {
    if (STRAY_LINE.test(line)) return line.trim();
  }
  return "";
}
