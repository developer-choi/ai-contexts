import { readPayload } from "./hook-utils.mjs";

// 턴을 마치는 응답이 영어로 나가면 한국어로 다시 쓰게 돌려보낸다.
//
// settings의 `language`는 시스템 프롬프트에 「항상 그 언어로 답하라」 한 줄을 넣는 부탁이라, 영어
// 스킬 본문·영어 도구 출력·하네스의 영어 알림이 길게 쌓인 세션에서는 최종 보고가 통째로 영어로
// 샌다. 새도 사용자가 읽기 전엔 아무도 모른다.
//
// 전제: settings `language`가 korean이다. 목표 언어를 바꾸면 이 훅의 한글 판정과 안내 문구도 바꾼다.
//
// 판정: 코드·경로·URL·인용·식별자 모양 낱말을 걷어낸 산문에서 한글 비율을 잰다. 기준값은 지난
// 세션 기록의 실제 최종 응답 분포로 정했다(backlog archives/incident/response-language-incident.md).
//
// 통과시키는 것:
//   - 어느 Stop 훅이든 턴을 이어가는 중(stop_hook_active) — 이 훅이 한 번 되돌린 뒤도 여기 든다.
//     계속 되돌리면 세션이 못 끝나고, 영어 산출물이 정답인 턴(번역 등)은 이 한 번의 되물음 뒤 그대로
//     다시 내면 끝난다
//   - 걷어낸 뒤 남는 영문자가 적은 짧은 응답 — 판정할 산문이 없다
//
// 사용자 발화가 영어여도 통과시키지 않는다. 목표 언어는 settings가 정하고, 발화로 면제하면
// `ok`·`ㅇㅋ`처럼 한글 음절이 없는 짧은 대답 뒤의 영어 보고가 그대로 샌다(2026-10-01).
//
// 못 보는 것: 도구 호출 사이의 중간 진행 문구. Stop은 턴의 마지막 응답만 받는다.

const THRESHOLD = 0.3;
const MIN_LATIN = 40;
const HANGUL = /[가-힣]/;

function prose(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^\s*>.*$/gm, " ")
    // 들여쓰기 코드블록. 4칸 들여쓴 하위 목록은 산문이라 남긴다.
    .replace(/^(?: {4,}|\t)(?![-*+] |\d+\. ).*$/gm, " ")
    // 따옴표로 감싼 원문 인용 — 조사 보고가 근거 원문을 이렇게 싣는다.
    .replace(/"[^"\n]*"|“[^”\n]*”/g, " ")
    .replace(/[\w.~-]*[\\/][\w.\\/-]+/g, " ")
    // 식별자 모양 낱말: snake_case·숫자 섞임·점·하이픈 연결·camelCase·대문자 약어
    .replace(/\b[A-Za-z]*[_\d][\w]*\b|\b[A-Za-z]+(?:[.-][A-Za-z0-9]+)+\b|\b[a-z]+[A-Z]\w*\b|\b[A-Z]{2,}s?\b/g, " ");
}

function hangulRatio(text) {
  const p = prose(text);
  const hangul = (p.match(new RegExp(HANGUL.source, "g")) || []).length;
  const latin = (p.match(/[A-Za-z]/g) || []).length;
  return { hangul, latin, ratio: hangul + latin ? hangul / (hangul + latin) : 1 };
}

function verdict(payload) {
  if (payload.stop_hook_active) return null;
  // 필드가 없으면 판정할 게 없어 통과하지만, 이름이 바뀐 것이면 이 훅이 영영 꺼진 것이다 — 조용히 넘기지 않는다.
  if (typeof payload.last_assistant_message !== "string") {
    process.stderr.write("check-response-language: Stop 페이로드에 last_assistant_message가 없다 — 필드 이름이 바뀌었으면 이 훅은 아무것도 판정하지 못한다\n");
    return null;
  }
  const { latin, ratio } = hangulRatio(payload.last_assistant_message);
  if (latin < MIN_LATIN || ratio >= THRESHOLD) return null;
  return (
    `방금 응답이 영어로 나갔습니다(코드·경로·인용·식별자를 뺀 산문의 한글 비율 ${ratio.toFixed(2)}). ` +
    "같은 내용을 한국어로 다시 써서 턴을 마치세요. 코드·경로·식별자·영어 원문 인용은 그대로 두고 설명 문장만 한국어로 씁니다. " +
    "사과나 경위 설명은 붙이지 않습니다. " +
    "번역·영어 초안처럼 영어 결과물을 요청받은 턴이면 같은 내용을 그대로 다시 내면 됩니다."
  );
}

const reason = verdict(readPayload());
if (reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "Stop", additionalContext: reason } }));
}
process.exit(0);
