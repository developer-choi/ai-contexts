#!/usr/bin/env node
// write 산출물 채점 하네스 (객관 + 반객관 자동 계측).
//
// 주관(만족/불만족·추가교정)은 사람 전속이라 여기서 안 잰다. 점수로 합치지 않는다 —
// 객관(숫자)과 반객관(기계 매칭)을 따로 출력한다.
//
// 이미 굳힌 금지어 목록과 그 규칙의 상세는 아래 RULES가 함께 든다. 문서에는 사본을 두지 않는다 —
// 기계가 100% 잡는 규칙을 문서에 적으면 그 규칙을 어길 글이든 아니든 매 회차 통째로 실린다.
// 앞으로 새로 막을 낱말은 RULES가 아니라 writing-guide/rejected.md에 레인과 함께 올린다(아래).
//
// PR 제목(pr-body의 H1)도 여기서 본다: 끝 마침표·conventional commit 접두사·공백 포함 60자 초과는 합계에 든다.
// 기준은 pr-body 템플릿 「PR 제목」과 짝이다. 게시 때가 아니라 다듬기에서 잡혀야 제목을 다시 묻지 않는다.
//
// 사용자가 반려한 낱말·문구도 쌓인 두 곳에서 함께 잡는다.
// - 모든 글: writing-guide/rejected.md(줄 꼴은 그 파일 머리). 배포본을 읽어서, 원본에 새로 올린 줄은 배포 뒤에 잡힌다.
//   읽은 자리나 건너뛴 까닭을 출력 첫머리에 한 줄 남긴다.
// - 이 글만: 패키지 frontmatter `rejected`의 따옴표 안 낱말·문구. 사유가 쓰임에 걸린 것이 많아 경고로만 낸다.
//   절·내용 항목은 리뷰어 몫이라 안 잡는다.
//
// 사용:
//   node score.mjs <산출물.md> [--props 명제리스트.txt] [--tokens N] [--turns N]
//   node score.mjs --rules            무엇을 잡는지 낸다 (낱말·경고 레인·대체어)
//   node score.mjs <산출물.md> --structure   긴 한 줄 문단·개수 선언 뒤 리스트 없음만 낸다
//                                            (톤을 다듬기 전, 내용을 채운 초안의 나눔만 볼 때)
//   node score.mjs <산출물.md> --residual    남은 `[//]: #` 주석만 낸다. 있으면 exit 1 (발행 직전 확인)
//   node score.mjs <산출물.md> --json        사람용 출력 끝에 기계용 `@@score {total,titleHits}` 한 줄을 더한다
//
// 줄 번호(L)는 frontmatter를 포함한 파일 기준이다.
//
// 명제리스트(--props): 한 줄에 핵심 명제 하나. 본문에 substring으로 들어있는지만 본다.
// 토큰·턴(--tokens/--turns): 세션에서 얻는 값. 주면 객관 표에 기록만 한다(자동 산출 불가).
//
// 반객관 매칭은 한국어 단어 경계가 없어 false positive가 날 수 있다(예: '유사' in '유사성').
// 그래서 위반마다 해당 줄을 함께 출력해 사람이 눈으로 확인할 수 있게 한다.
import fs from "node:fs";
import path from "node:path";
import { COMMENT_LINE, fenceTracker } from "./package-meta.mjs";
import { parseRejectedLines } from "./rejected-lines.mjs";

// 소스(deploy/skills/write-doc/scripts)와 배포본(<타겟>/skills/write-doc/scripts) 둘 다 세 단계 위가 contexts의 부모다.
const AC_REJECTED = path.resolve(import.meta.dirname, "..", "..", "..", "contexts", "writing-guide", "rejected.md");

function loadAcRejected() {
  if (!fs.existsSync(AC_REJECTED)) return { entries: [], note: `건너뜀 — 파일 없음 (${AC_REJECTED})` };
  const { entries, unreadable, noLane, badLane } = parseRejectedLines(fs.readFileSync(AC_REJECTED, "utf8"));
  const n = (lane) => entries.filter((e) => e.lane === lane).length;
  return {
    entries,
    note:
      `읽음 ${AC_REJECTED} — 합계 ${n("합계")} · 경고 ${n("경고")}` +
      (unreadable ? ` · 따옴표 표현이 없어 기계가 안 찾는 줄 ${unreadable}` : "") +
      (noLane ? ` · 레인 없음 ${noLane}(경고로 읽음)` : "") +
      (badLane ? ` · 알 수 없는 레인 ${badLane}(경고로 읽음 — 합계:·경고: 중 하나로 고친다)` : ""),
  };
}

// PR 제목 기계 기준. pr-body 템플릿 「PR 제목」과 짝이다.
const CONVENTIONAL_PREFIX = /^(feat|fix|chore|refactor|docs|style|test|perf|build|ci|revert)(\([^)]*\))?!?:/i;
const TITLE_MAX = 60;

// 코드펜스 밖 첫 `# ` 줄을 [파일 줄 번호, 제목]으로 낸다.
function firstH1(bodyLines, offset) {
  const inFence = fenceTracker();
  for (let i = 0; i < bodyLines.length; i++) {
    const ln = bodyLines[i];
    if (!inFence(ln) && /^# \S/.test(ln)) return [i + 1 + offset, ln.slice(2).trim()];
  }
  return null;
}

function checkTitle(title) {
  const out = [];
  if (/[.。]$/.test(title)) out.push("끝 마침표 — 뗀다");
  if (CONVENTIONAL_PREFIX.test(title)) out.push("conventional commit 접두사 — 뗀다");
  const len = [...title].length;
  if (len > TITLE_MAX) out.push(`${len}자(공백 포함 ${TITLE_MAX}자 이하) — 주장을 받치는 방법·근거부터 덜어낸다`);
  return out;
}

// 커밋 해시는 영문자(a-f)가 하나 이상 든 것만 본다 — 숫자로만 된 7자리 이상(측정값 등)을 해시로 잡지 않는다.
const INTERNAL = {
  PR번호: /PR\s*#?\d+/g,
  커밋해시: /\b(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/g,
  브랜치명: /\b(feature|fix|chore|refactor)\/\S+/g,
};

// 내부 작업이력을 합계에 넣을지. PR 번호·커밋을 근거 링크로 일부러 싣는 글은 경고로만 낸다 — 채용 PR(커밋 링크),
// README(PR 링크별 요약), 사례집(실제 작업 PR 링크), PR 코멘트(커밋을 짚어 말한다). pr-body 템플릿도 이 금지를
// 「일반 PR이면」으로 한정한다.
const INTERNAL_AS_EVIDENCE = new Set(["readme", "case-study", "pr-comment"]);
function internalCounts(type, subtype) {
  return !INTERNAL_AS_EVIDENCE.has(type) && subtype !== "recruitment";
}

const DASHES = { "—": "em-dash(U+2014)", "–": "en-dash(U+2013)" };

// 낱말 목록과 규칙 상세(무엇이 문제이고 무엇으로 바꾸는가)가 여기 함께 산다.
//
// 왜 문서가 아니라 여기인가: 기계가 100% 잡는 규칙은 문서에 두면 그 규칙을 어길 글이든 아니든
// 매 회차 통째로 실린다. 위반이 뜬 자리에서만 알리면 되고, 알릴 때 무엇으로 바꿀지까지 함께 내면
// 사람이 규칙을 기억해 스스로 찾는 것보다 정확하다. writing-guide types/decision/guide.md가 헤딩·라벨 표기에 이미
// 같은 방식을 쓴다. 목록을 보고 싶으면 `--rules`로 전부 낸다.
//
// 못 내리는 것: 반려가 안 오는 규칙. 기계가 판정 못 하는 규칙을 문서에서 걷으면 적발 0건이
// 「통과」로 읽혀 규칙이 그냥 사라진다. 그래서 tone.md에는 판단이 드는 절만 남아 있다.
// 「외래어 음차 회피」가 양쪽에 걸친 자리다 — 낱말 하나는 여기가 잡고, 새 영어 용어를 음차할지와
// 예외 넷(일상화된 외래어·고유명사·굳은 용어·괄호 병기)은 그 절의 산문이 든다.
//
// `warn: true`는 낱말이 아니라 쓰임이 걸리는 규칙(주어가 글쓴이일 때만 위반 등)이다. 매칭은 하되
// 적발 합계에 넣지 않는다 — 합계는 0까지 밀어야 하는 값이라, 정상 문장이 걸릴 수 있는 항목을
// 넣으면 멀쩡한 문장을 깎아야 0이 된다. rejected.md의 `합계:`·`경고:` 레인이 같은 갈림이다.
const RULES = {
  "딱딱한 한자어 회피": {
    words: ["유사", "파편화", "구조화", "이원화", "직렬화", "명세"],
    what: "생소하거나 딱딱하게 읽히는 한자어는 일상어로 푼다. `~화` 계열뿐 아니라 일반 한자어도 같다 (목록 밖도 같은 결로 본다: 구현 → 만듦, 확정 → 정함).",
    swap: {
      유사: "비슷한",
      파편화: "흩어져 · 따로 만들어져",
      구조화: "풀어쓰기 (예: [같은 것을 한 곳에 모아 ~하는 방식])",
      이원화: "개발자와 사용자 각각에게 필요한 정보를 분리 전달",
      직렬화: "조립 (또는 문맥에 맞는 동사)",
      명세: "적어둔 규격",
    },
  },
  "추상 압축어 회피": {
    words: ["다각도", "다층", "심층", "세 방향"],
    what:
      "여러 의미를 한 단어에 압축한 한자형 합성어를 추천 표현으로 고르지 않는다. 헤딩·요약에 두면 독자가 " +
      "「어떤 각도/방향이지?」에서 멈춘다. 본문이 즉시 받아주는 구체어나 풀어쓴 표현으로 간다 " +
      "(`다각도 학습` → `유형별 학습`, 본문이 「정의·비교·오해 점검 세 유형」으로 곧장 푼다. 풀이형은 `한 주제를 여러 각도에서 학습`).",
  },
  // 「인터페이스」는 넣지 않는다 — Interface와 한글 표기를 둘 다 쓰는 낱말이라 합계 레인에
  // 넣으면 정상적으로 쓴 자리까지 매번 고치게 된다. 음차 판정 자체는 tone.md 산문이 든다.
  "외래어 음차 회피": {
    words: ["디프리케이트"],
    what: "영어 기술 용어를 한글 음차로 옮기지 않는다. 원문 영어(`Soft Deprecated`)나 의미 번역(`신규 생성 차단`) 중 하나를 고른다. 예외와 경계는 tone.md 「외래어 음차 회피」가 든다.",
  },
  // 낱말 훅(`scripts/hooks/blocked-expressions.json`)의 금지 표현 중 독자용 글에서도 못 알아보는 것을
  // 옮겨 왔다. 두 목록을 하나로 합치기 전까지는 사본이라, 그쪽에 행이 늘어도 여기는 안 따라온다.
  // 뺀 것: `오라클`(Oracle DB)·`seam`(seamless)·`팔`(팔로우 등)은 substring 매칭이라 정상 낱말에 걸리고,
  // `발사`·`눈금`은 KA 설명글에서 정상 비유로 쓰인다.
  "은어·조어 회피": {
    words: [
      "진실검사", "미리팩토링", "이연", "이설", "비계", "굽지", "굽는", "폴드", "재스택", "그레인",
      "harvest", "자기증명 루프", "사문", "날조가드", "상속 가드", "진입 무게", "인용 게이트",
      "발행 청결", "표면 교정", "lede", "ceremony", "무는 자리", "무는 시점", "판정하는 쪽이 진다", "결을 읽",
    ],
    what: "작성 세션 안에서만 통하는 은어·조어·비유·음역이라 처음 읽는 사람이 뜻을 못 떠올린다. 풀어 쓴 말로 바꾼다.",
    swap: {
      진실검사: "원본(figma·테스트 결과)과 맞는지 보는 검사",
      미리팩토링: "리팩토링 전 코드",
      이연: "미룬다 · 다른 PR로 넘긴다",
      이설: "옮긴다 · 옮겨 담는다",
      비계: "임시값 · 임시로 두는 것",
      굽지: "만든다 · 생성한다 · 미리 정해 박아 둔다",
      굽는: "만든다 · 생성한다 · 미리 정해 박아 둔다",
      폴드: "원래 커밋에 합친다",
      재스택: "커밋 히스토리를 다시 쌓는다",
      그레인: "단위 (파일 단위·기능 단위)",
      harvest: "직전 단계를 실제로 돌려 그 출력을 받아 쓴다",
      "자기증명 루프": "검증 대상이 스스로 정답을 정해 스스로 통과시키는 순환",
      사문: "아무도 안 부르는 문장",
      날조가드: "근거가 없으면 빈칸으로 두는 [지어내지 않는다] 규칙",
      "상속 가드": "앞 단계의 제약을 다듬기에서도 그대로 지키는 것",
      "진입 무게": "미리 읽어 두어 늘어나는 컨텍스트",
      "인용 게이트": "그 절차의 실제 단계 이름",
      "발행 청결": "발행본에 frontmatter 같은 작업 흔적이 남지 않은 상태",
      "표면 교정": "오탈자·띄어쓰기 수정",
      lede: "제목 아래 첫 줄",
      ceremony: "형식적으로 붙는 부수 절차",
      "무는 자리": "비용을 치르는 자리",
      "무는 시점": "비용을 치르는 시점",
      "판정하는 쪽이 진다": "판정 재료는 판정하는 쪽이 맡는다",
      "결을 읽": "뉘앙스를 읽",
    },
  },
  // 낱말 훅의 군더더기 범주 중 독자용 글에서도 늘어지는 꼴만 옮겼다. `기본적으로`·`사실상`·`또한`·`의 경우`는
  // KA 설명글에 정상 쓰임이 많아 넣지 않는다. 지우면 뜻이 바뀌는 자리도 있어 합계에서 뺀다.
  "군더더기 낱말": {
    words: ["이러한", "를 통해", "을 통해"],
    warn: true,
    what: "지워도 뜻이 같으면 줄인다. 지우면 뜻이 달라지는 자리면 그대로 둔다.",
    swap: {
      이러한: "이런 (또는 지시어 없이 명사를 바로)",
      "를 통해": "로 (`X를 통해 Y한다` → `X로 Y한다`)",
      "을 통해": "으로 · 로 — 앞말 받침에 맞춘다 (`훅을 통해` → `훅으로`, `서울을 통해` → `서울로`)",
    },
  },
  "메타 독자 안내 섹션 금지": {
    words: ["이 문서를 읽는 독자에게", "이 문서의 목적"],
    what:
      "문서 첫머리에 메타 섹션을 두지 않는다. frontmatter의 `purpose`·`audience`가 이미 들고 있어 중복이고, " +
      "독자에게 직접 말 거는 투라 어색하다. 배경·계기가 필요하면 H1 바로 아래 일반 문단으로 놓고, " +
      "메타 헤더와 「~을 정리한다」 류 종결 문장은 뺀다.",
  },
  "극적 수식어·감정적 서사 금지": {
    words: ["순간", "마주한", "여정", "탐구"],
    what:
      "기술 문서에 문학적·감정적 어휘를 쓰지 않고 사실만 담백하게 적는다 " +
      "(`문제를 마주한 순간부터 풀이 도구를 떠올리기까지의 사고 경로를 훈련합니다` → `풀이에 이르는 사고 과정을 훈련합니다`).",
  },
  "자기 산출물 과장 금지": {
    words: ["발견했습니다", "확인했습니다", "폭발"],
    warn: true,
    what:
      "자기가 쓴 코드·구조를 두고 「~을 발견했습니다」·「~이 폭발합니다」처럼 과장해 서술하지 않는다. " +
      "**남의 산출물이나 외부 사실을 가리키는 자리면 정상이다** — 주어가 글쓴이 자신인지 보고 고른다.",
  },
  // 낱말이 아니라 문자라 words가 없다. 검출은 DASHES가 하고 키를 그 라벨과 맞춘다.
  "em-dash(U+2014)": {
    what:
      "직접 쓰는 본문·제목·헤딩·리스트·frontmatter 어디에도 쓰지 않는다. AI가 쓴 흔적으로 읽히고 " +
      "한국어 구두점 관습(콜론·쉼표·마침표)에도 어긋난다. 대체는 자리에 맞게 — 헤딩·링크·리스트 라벨·코드 주석은 콜론, " +
      "본문 인라인 강조는 마침표로 문장을 나눈다. 외부 인용 블록(`> `)은 원문 보존이라 검사에서 이미 빠져 있다.",
  },
  "en-dash(U+2013)": { what: "em dash와 같은 원칙으로 피한다. 대체도 같다." },
  "낫표 금지": {
    words: ["「", "」"],
    what: "낫표(「」)를 쓰지 않는다. 화면 문구는 큰따옴표로, 버튼·UI 요소 이름은 [대괄호]로 바꾼다.",
  },
};

function wordLists() {
  const banned = {};
  const contextual = {};
  for (const [name, r] of Object.entries(RULES)) {
    if (!r.words?.length) continue;
    (r.warn ? contextual : banned)[name] = r.words;
  }
  return { banned, contextual };
}

// 위반 묶음마다 규칙 상세를 한 번 낸다. 걸린 낱말에 대체어가 있으면 그 낱말 줄에 붙인다.
function guideFor(cat, words = []) {
  const r = RULES[cat];
  if (!r) return [];
  const out = [`   → ${r.what}`];
  for (const w of words) if (r.swap?.[w]) out.push(`   → '${w}' 대신: ${r.swap[w]}`);
  return out;
}

// 무엇을 잡는지 문서에서 못 찾게 됐으므로 여기서 낼 통로를 둔다.
function printRules() {
  for (const [name, r] of Object.entries(RULES)) {
    console.log(`\n## ${name}${r.warn ? "  (경고 — 합계에서 뺌)" : ""}`);
    if (r.words?.length) console.log(`   낱말: ${r.words.join(", ")}`);
    console.log(`   ${r.what}`);
    for (const [w, s] of Object.entries(r.swap ?? {})) console.log(`   '${w}' 대신: ${s}`);
  }
  console.log(`\n## 이모지  (type ${[...NO_EMOJI_TYPES].join("·")}만)`);
  console.log("   PR 본문·PR 코멘트에는 이모지를 쓰지 않는다.");
  console.log(`\n## plain-text 마크다운  (rendering_env: plain-text만)`);
  console.log(`   발행처에서 기호가 그대로 보인다: ${PLAIN_TEXT_MARKDOWN.map(([l]) => l).join(", ")}. 리스트 \`-\`는 안 센다.`);
  console.log(`\n## 「~화」 한자어  (경고 — 합계에서 뺌)`);
  console.log(`   패턴: 「명사 + 화」. 그 자체로 한 낱말인 것은 뺀다: ${[...HANJA_SUFFIX_ALLOW].join(", ")}`);
  const ac = loadAcRejected();
  console.log(`\n## 모든 글 반려 표현  (줄마다 합계·경고 레인)`);
  console.log(`   ${ac.note}`);
  for (const e of ac.entries) console.log(`   ${e.lane}: '${e.word}' 대신: ${e.swap}`);
  console.log(`\n## 이 글 반려  (경고 — 합계에서 뺌)`);
  console.log("   패키지 frontmatter `rejected`의 따옴표 안 낱말·문구. 절·내용 항목은 안 잡는다.");
}

function findRejectedHits(lines, entries) {
  const hits = [];
  for (const e of entries) {
    for (const [lineno, ln] of lines) if (ln.includes(e.word)) hits.push({ ...e, lineno, line: ln.trim() });
  }
  return hits;
}

function dumpRejectedHits(name, hits, note = "", label = "대신") {
  console.log(`\n[${name}] ${hits.length}건${note}`);
  for (const h of hits) {
    console.log(`   '${h.word}' (L${h.lineno}): ${h.line.slice(0, 70)}`);
    console.log(`   → ${label}: ${h.swap}`);
  }
}

// 습니다체 휴리스틱: 평서문 종결이 반말이면 잡는다. 명사형·정중체는 통과.
const BANMAL_END = /(?:[가-힣])(?:는다|ㄴ다|했다|이다|된다|온다|간다|왔다|갔다|보다|같다)\.?$/;
const POLITE_END = /(?:습니다|입니다|됩니다|ㅂ니다|세요|어요|아요|에요|예요)\.?$/;

// PR 본문·PR 코멘트에는 이모지를 쓰지 않는다(2026-10-17 사용자 결정). 다른 type은 이모지를 세지 않는다.
const NO_EMOJI_TYPES = new Set(["pr-body", "pr-comment"]);
const EMOJI = /\p{Extended_Pictographic}/gu;

// `rendering_env: plain-text` 발행처(텍스트 폼 등)에서 기호 그대로 보이는 마크다운. 정본은 package-format.md `rendering_env`.
// 리스트 `-`는 텍스트 폼에서도 흔히 쓰는 꼴이라 세지 않는다.
const PLAIN_TEXT_MARKDOWN = [
  ["헤딩", /^\s{0,3}#{1,6}\s/],
  ["코드펜스", /^\s*(```|~~~)/],
  ["백틱", /`/],
  ["굵게", /\*\*|__/],
  ["링크", /\[[^\]]+\]\([^)]+\)/],
  ["인용", /^\s*>/],
];

// 본문과, 본문 앞에서 뗀 줄 수를 돌려준다. 출력하는 줄 번호는 이 수를 더해 파일 기준으로 낸다 —
// 읽는 쪽은 파일을 열어 본 줄 번호로 자리를 찾는다.
function splitFrontmatter(text) {
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      const nl = text.indexOf("\n", end + 1);
      const body = nl !== -1 ? text.slice(nl + 1) : "";
      const offset = text.slice(0, text.length - body.length).split("\n").length - 1;
      return { body, offset };
    }
  }
  return { body: text, offset: 0 };
}

// 코드펜스 안·인용블록(>)·`[//]: #` 주석 줄을 뺀 본문 줄을 [파일 줄 번호, 줄]로 돌려준다.
// 주석 줄은 AI가 사용자에게 묻거나 사용자가 남긴 지시라, 그 안의 낱말을 고치면 사용자 글자를 고치게 된다.
// 남은 주석은 따로 센다(comments).
function stripCodeAndQuotes(rawLines, offset = 0) {
  const out = [];
  const comments = [];
  const inFence = fenceTracker();
  rawLines.forEach((ln, i) => {
    if (inFence(ln)) return;
    if (ln.trim().startsWith(">")) return;
    if (COMMENT_LINE.test(ln)) {
      comments.push([i + 1 + offset, ln]);
      return;
    }
    out.push([i + 1 + offset, ln]);
  });
  return { lines: out, comments };
}

function findEmoji(lines) {
  const hits = [];
  for (const [lineno, ln] of lines) {
    const found = ln.match(EMOJI);
    if (found) hits.push([lineno, found.join(""), ln.trim()]);
  }
  return hits;
}

// 코드펜스·인용도 기호로 보이므로 코드를 걷기 전 본문 줄에서 찾는다. 주석 줄은 발행 전에 지워지므로 뺀다.
function findMarkdown(rawLines, offset) {
  const hits = [];
  rawLines.forEach((ln, i) => {
    if (COMMENT_LINE.test(ln)) return;
    const found = PLAIN_TEXT_MARKDOWN.filter(([, rx]) => rx.test(ln)).map(([label]) => label);
    // 펜스 줄의 백틱은 펜스 하나로 센다.
    for (const label of found.includes("코드펜스") ? ["코드펜스"] : found) hits.push([label, i + 1 + offset, ln.trim()]);
  });
  return hits;
}

function countSentences(body) {
  const text = body.replace(/```[\s\S]*?```/g, "");
  // 문장 끝 하나를 한 번만 센다. 구두점은 뒤가 공백·줄 끝일 때만(`1.5` 제외), `다`·`요`는 구두점 없이 끝날 때만 센다.
  return (text.match(/[.!?。](?=\s|$)|[다요](?=\s|$)/gm) ?? []).length;
}

function objective(body) {
  const chars = body.replace(/\s/g, "").length;
  const sents = countSentences(body);
  const words = body.split(/\s+/).filter(Boolean).length;
  return { chars, sents, words };
}

function findBanned(lines, banned) {
  const hits = [];
  for (const [cat, words] of Object.entries(banned)) {
    for (const w of words) {
      for (const [lineno, ln] of lines) {
        if (ln.includes(w)) hits.push([cat, w, lineno, ln.trim()]);
      }
    }
  }
  return hits;
}

function findInternal(lines) {
  const hits = [];
  for (const [cat, rx] of Object.entries(INTERNAL)) {
    for (const [lineno, ln] of lines) {
      // 링크 주소(`](…)`) 안의 해시·번호는 독자에게 안 보이는 글자라 뺀다.
      const shown = ln.replace(/\]\([^)]*\)/g, "]");
      for (const m of shown.matchAll(new RegExp(rx.source, rx.flags))) {
        hits.push([cat, m[0], lineno, ln.trim()]);
      }
    }
  }
  return hits;
}

function findDashes(lines) {
  const hits = [];
  for (const [ch, label] of Object.entries(DASHES)) {
    for (const [lineno, ln] of lines) {
      const c = ln.split(ch).length - 1;
      if (c) hits.push([label, ch, lineno, ln.trim()]);
    }
  }
  return hits;
}

// 휴리스틱. 반말 종결로 보이는 본문 줄을 후보로 잡는다.
function checkPoliteness(lines) {
  const flags = [];
  for (const [lineno, ln] of lines) {
    const s = ln.trim().replace(/\.$/, "");
    if (!s || s.startsWith("#") || s.startsWith("|") || s.startsWith("-") || s.startsWith("*")) continue;
    if (BANMAL_END.test(s) && !POLITE_END.test(s)) flags.push([lineno, ln.trim()]);
  }
  return flags;
}

// 의문형 종결 어미로 끝났는데 물음표가 없는 줄. 판단이 안 드는 구두점이라 합계에 넣는다.
// 「~는가」 꼴은 뺐다 — 독자에게 묻는 문장 말고 점검 문항(「오해 없이 실행할 수 있는가」)에도
// 쓰여서, 레포 상주 문서를 다듬을 때 그 문항까지 물음표를 강제하게 된다. tone.md 규칙은
// 의문형 전부를 덮고, 기계는 독자에게 묻는 꼴만 잡는다.
const QUESTION_END = /(?:까요|나요|은가요|는가요|던가요)$/;

function checkQuestionMark(lines) {
  const hits = [];
  for (const [lineno, ln] of lines) {
    const s = ln.trim().replace(/^#+\s*/, "");
    if (!s || s.startsWith("|")) continue;
    // 물음표 자리에 마침표를 찍은 꼴(`볼까요.`)이 가장 흔해, 문장마다 끝 마침표·서식을 떼고 본다.
    const sents = s.split(/(?<=[.!])\s+/).map((x) => x.replace(/[.!*_`\s]+$/, ""));
    if (sents.some((x) => QUESTION_END.test(x))) hits.push([lineno, ln.trim()]);
  }
  return hits;
}

// 개수를 밝혀 놓고 이어지는 줄이 리스트로 안 열리는 자리. tone.md 「비교/나열은 리스트로」가
// 이미 덮는데 기계가 안 봐서 계속 새던 축이다.
//
// 처음엔 「N가지입니다/있습니다」 종결만 잡았는데, 실제로 반려된 자리는 「두 가지가 따라오기
// 때문입니다」였다 — 종결 꼴은 글마다 달라 거기에 걸면 정작 반려된 문장이 샌다. 그래서 종결은
// 안 보고 「N가지」가 든 문장이면 후보로 올리되, 오탐이 몰리는 둘을 뺀다.
// - 앞말을 되받는 「이 두 가지」·「앞의 두 가지」: 나열이 이미 앞에 끝났다
// - 줄 끝 문장인데 다음 줄이 리스트·표로 열림: 나열을 구조로 나눴다
// 실측(블로그 23편): 종결 꼴 2건 → 이 방식 6건. 표로 이어진 1건이 빠지고 5건이 새로 뜬다 —
// 괄호·빗금·따옴표·「A와 B」로 한 문장에 몰아넣은 나열 넷, 소제목으로 이어진 자리 하나(기존에도
// 소제목으로 이어진 자리는 후보였다). 눈으로 확인 후보라 합계에는 안 넣는다.
// 「두 개」는 「두 개 이상을 합치는」처럼 수량 서술이 흔해 선언 종결 꼴일 때만 잡는다.
const COUNT_WORD =
  /(?<!(?:이|그|저|위|위의|앞의|앞서|이런|그런)\s)(?:두|세|네|다섯|여섯|[2-9])\s?가지|(?:두|세) 개\s*(?:뿐)?(?:이|가|은|는)?\s*(?:있습니다|입니다|였습니다|있었습니다)/;
const STRUCTURED_START = /^\s*(?:[-*+]|\d+\.|\|)/;

function checkCountDeclaration(lines) {
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i][1].trim();
    if (!s || s.startsWith("#") || s.startsWith("|")) continue;
    const sents = s.split(/(?<=[.?!])\s+/);
    const at = sents.findIndex((x) => COUNT_WORD.test(x));
    if (at === -1) continue;
    // 개수를 밝힌 문장이 줄 끝이면 이어지는 첫 줄이 리스트·표로 열리는지 본다.
    // 같은 줄로 설명이 이어지면 그 자리에서 산문으로 푼 것이다.
    if (at === sents.length - 1) {
      const next = lines.slice(i + 1).find(([, ln]) => ln.trim());
      if (next && STRUCTURED_START.test(next[1])) continue;
    }
    hits.push([lines[i][0], s]);
  }
  return hits;
}

// 엔터 없이 한 줄로 길게 몰아 쓴 문단·리스트 항목. tone.md 「문단 길이 상한선」이 문장 수로 적혀 있지만
// 한국어 문장 끊기가 부정확해 기계는 글자 수로 잰다. 링크 URL·HTML 태그는 읽히지 않으니 빼고, 리스트 기호도 뺀다.
//
// 문턱 180자: 한 줄이라 읽기 어렵다고 반려된 문단이 200자, 같은 원고의 승인본에서
// 가장 긴 줄이 159자였다. 실측(코드·표·인용·헤딩 밖 줄): 블로그 발행본 136줄 중 0건, writing-guide
// 567줄 중 11건(1.9%). 한 논지를 길게 편 멀쩡한 문단도 걸릴 수 있어 합계에는 안 넣는다.
const LONG_LINE = 180;

function checkLongLines(lines) {
  const hits = [];
  for (const [lineno, ln] of lines) {
    const s = ln.trim();
    if (s.startsWith("#") || s.startsWith("|")) continue;
    const len = s
      .replace(/^(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, "")
      .replace(/\]\((?:[^()]|\([^)]*\))*\)/g, "]")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/<[^>]+>/g, "").length;
    if (len >= LONG_LINE) hits.push([lineno, len, s]);
  }
  return hits;
}

function printStructure(lines) {
  const longHits = checkLongLines(lines);
  console.log(`\n[긴 한 줄 문단] ${longHits.length}건 (눈으로 확인 — ${LONG_LINE}자 이상)`);
  for (const [lineno, len, ln] of longHits) console.log(`   L${lineno} (${len}자): ${ln.slice(0, 70)}`);
  if (longHits.length) {
    console.log(
      "   → 단계·대비 항목·나열을 한 줄에 몰았으면 리스트로, 주제가 둘 이상이면 헤딩으로 나눈다." +
        " 한 논지를 편 문단이면 문장 사이에서 문단을 끊는다.",
    );
  }
  const countHits = checkCountDeclaration(lines);
  console.log(`\n[개수 선언 뒤 리스트 없음] ${countHits.length}건 (눈으로 확인 — 핵심 나열이면 번호 목록으로)`);
  for (const [lineno, ln] of countHits) console.log(`   L${lineno}: ${ln.slice(0, 70)}`);
  return { longHits, countHits };
}

// 「명사 + 화」 꼴 한자어. tone.md 「딱딱한 한자어 회피」가 이 계열을 통째로 덮는데 낱말 목록으로는
// 굳힌 여섯 개만 잡혀, 같은 결의 새 낱말이 매번 샜다.
//
// 목록이 아니라 패턴이라 RULES(낱말 목록만 받는다)에 못 담아 이 검사를 따로 둔다.
//
// 경고 레인이다(합계에서 뺀다). 「화」로 끝난다고 다 딱딱한 것이 아니라 사람이 골라야 한다.
// 실측: 블로그 발행본 23편에 13건(파일당 0.6), AC deploy 173개에 236건(파일당 1.4).
// ALLOW는 「X로 만들기」가 아니라 그 자체로 한 낱말인 것들 — 이걸 안 빼면 발화·대화가 상위를 덮는다.
// 어미에 되·돼·됨을 넣은 것은 `파편화되고`·`최적화된`이 가장 흔한 꼴인데 조사만 보면 통째로 새기 때문이다.
const HANJA_SUFFIX = /([가-힣]{1,4}화)(?=[을를이가은는의에로와과다한할했되돼됨시]|\s|[,.·)]|$)/g;
const HANJA_SUFFIX_ALLOW = new Set([
  "변화", "대화", "발화", "문화", "영화", "소화", "강화",
  "진화", "악화", "완화", "심화", "정화", "노화", "미화", "승화",
]);

function checkHanjaSuffix(lines) {
  const hits = [];
  for (const [lineno, ln] of lines) {
    const s = ln.trim();
    if (!s || s.startsWith("|")) continue;
    for (const m of s.matchAll(HANJA_SUFFIX)) {
      if (!HANJA_SUFFIX_ALLOW.has(m[1])) hits.push([m[1], lineno, s]);
    }
  }
  return hits;
}

// 헤딩별 본문이 1문장 미만이면 빈 섹션. 마크다운 링크([텍스트](url))는 내용으로 치지 않는다.
// `[//]: #` 주석은 사용자에게 묻는 자리라, 주석만 남은 절은 빈 섹션으로 세지 않고 「남은 주석」으로만 보인다.
// 코드펜스 안의 `#`(셸 주석 등)은 헤딩이 아니고, 코드블록은 내용으로 친다 — 실행 방법처럼 코드블록만 든 절이 있다.
function checkEmptySections(text) {
  const lines = text.split("\n");
  const heads = [];
  const inFence = fenceTracker();
  lines.forEach((ln, i) => {
    if (!inFence(ln) && /^#{1,6}\s/.test(ln)) heads.push([i, ln, ln.match(/^#+/)[0].length]);
  });
  const empties = [];
  heads.forEach(([i, head, level], idx) => {
    const next = heads[idx + 1];
    // 바로 다음이 더 깊은 헤딩이면 내용을 하위 절이 담는 상위 절이라 빈 섹션이 아니다.
    if (next && next[2] > level) return;
    const end = next ? next[0] : lines.length;
    const body = lines.slice(i + 1, end).join("\n").trim();
    const bodyLines = body.split("\n");
    const prose = bodyLines.filter((l) => !COMMENT_LINE.test(l)).join("\n").replace(/\[[^\]]*\]\([^)]*\)/g, "");
    if (prose.replace(/\s/g, "").length >= 10 || bodyLines.some((l) => COMMENT_LINE.test(l))) return;
    empties.push([head.trim(), "내용 1문장 미만"]);
  });
  return { empties, nheads: heads.length };
}

// decision 문서의 비교 구조. 「방법이 둘 이상인가」와 「각 방법이 장단점을 둘 다 채웠는가」는
// 헤딩·리터럴 매칭이라 판단이 안 든다 — decision guide.md 산문이 표기를 못박는 대신 여기서 잡는다.
// (탈락 사유가 실제로 드러나는가는 판단이 남아 여기서 안 본다.)
const METHOD_HEAD = /^###\s+방법\s*\d+\./;

function checkDecisionStructure(text) {
  const lines = text.split("\n");
  const heads = [];
  lines.forEach((ln, i) => {
    if (METHOD_HEAD.test(ln)) heads.push([i, ln.trim()]);
    else if (/^#{1,3}\s/.test(ln) && heads.length) heads.push([i, null]); // 같은/상위 레벨 헤딩 = 구간 끝
  });
  const methods = [];
  for (let k = 0; k < heads.length; k++) {
    if (!heads[k][1]) continue;
    const end = heads[k + 1] ? heads[k + 1][0] : lines.length;
    const body = lines.slice(heads[k][0] + 1, end);
    const filled = (label) => {
      const at = body.findIndex((ln) => ln.includes(`**${label}:**`));
      if (at === -1) return false;
      const after = body[at].split(`**${label}:**`)[1] ?? "";
      const rest = body.slice(at + 1).join("\n");
      // 라벨 뒤 같은 줄이 비었으면 다음 라벨/헤딩 전까지의 줄로 채워졌는지 본다.
      if (after.trim()) return true;
      const upto = rest.split(/\n(?=\*\*\S+?:\*\*|#{1,6}\s)/)[0] ?? "";
      return upto.replace(/\s/g, "").length > 0;
    };
    methods.push({ head: heads[k][1], 장점: filled("장점"), 단점: filled("단점") });
  }
  return methods;
}

// case-study 사례집의 골격·링크. 「사례마다 ### 문제·### 해결이 있는가」, 「[자세히 보기] 링크」,
// 「사례 앞 굵은 요약 문장」은 헤딩·리터럴 매칭이라 판단이 안 든다 — case-study guide.md가 정한 골격을
// 여기서 기계로 잡는다. (질문이 짧은가·굵게가 핵심 낱말뿐인가는 판단이 남아 안 본다.)
// `###`도 굵은 칸 라벨(`**문제**` 등)도 없는 `##` 절은 하위 헤딩 없이 쓰는 맺음 절로 보고 칸 검사에서 뺀다.
// 입력은 stripCodeAndQuotes를 거친 [줄번호, 줄] — 코드 예시 안의 `#` 주석을 헤딩으로 잡지 않는다.
const MORE_LINK = /\[\s*자세히\s*보기\s*\]/;
// 굵은 글이 문장으로 끝날 때만 요약 문장으로 본다 — `**바꾸기 전**` 같은 짧은 라벨은 정상이다.
const BOLD_LEAD = /^\*\*[^*]+?(?:[.!?。]|[다요])\*\*/;
const CELL_LABEL = /^\*\*\s*(문제|해결)\s*:?\s*\*\*\s*:?\s*$/;

function checkCaseStudy(numbered) {
  const cases = [];
  let cur = null;
  const moreLinks = [];
  const boldLeads = [];
  for (const [lineno, ln] of numbered) {
    const s = ln.trim();
    const top = ln.replace(/^ {0,3}/, ""); // 4칸 넘게 들여쓴 줄은 코드 블록이라 헤딩이 아니다
    if (/^##\s/.test(top)) {
      cur = { head: s, subs: [], labels: [] };
      cases.push(cur);
    } else if (/^###\s/.test(top) && cur) cur.subs.push(s.replace(/^###\s+/, "").replace(/\s+#+\s*$/, "").trim());
    else if (CELL_LABEL.test(s) && cur) cur.labels.push(s.match(CELL_LABEL)[1]);
    const noCode = s.replace(/`[^`\n]*`/g, "").replace(/<!--[\s\S]*?-->/g, "");
    if (MORE_LINK.test(noCode)) moreLinks.push([lineno, s]);
    const item = s.replace(/^(?:[-*+]|\d+\.)\s+/, "");
    if (!CELL_LABEL.test(s) && BOLD_LEAD.test(item)) boldLeads.push([lineno, s]);
  }
  const real = cases.filter((c) => c.subs.length || c.labels.length);
  const holes = real
    .map((c) => ({
      head: c.head,
      labels: c.labels,
      miss: [
        !c.subs.some((h) => /^문제$/.test(h)) && "문제",
        !c.subs.some((h) => /^해결(\s*\d+\s*[.:].*)?$/.test(h)) && "해결",
      ].filter(Boolean),
    }))
    .filter((c) => c.miss.length);
  return { ncases: real.length, holes, moreLinks, boldLeads };
}

function readFrontmatterScalar(text, key) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const m = text.slice(3, end).match(new RegExp(`^${key}:[ \\t]*(\\S+)`, "m"));
  return m ? unquoteYaml(m[1]) : null;
}

// YAML 스칼라 하나의 따옴표를 푼다(`'…'`의 `''`, `"…"`의 이스케이프).
function unquoteYaml(value) {
  const v = value.trim();
  if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  if (/^".*"$/.test(v)) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  return v;
}

// frontmatter의 목록 필드(`user_phrases`·`rejected`) 항목을 따옴표를 푼 문자열로 돌려준다.
function readFrontmatterList(text, key) {
  const src = text.replace(/\r\n/g, "\n");
  if (!src.startsWith("---")) return [];
  const end = src.indexOf("\n---", 3);
  if (end === -1) return [];
  const fm = src.slice(3, end).split("\n");
  const at = fm.findIndex((ln) => ln.startsWith(`${key}:`));
  if (at === -1) return [];
  const items = [];
  const inline = fm[at].slice(key.length + 1).trim();
  if (inline.startsWith("[")) {
    // 인라인 배열은 쉼표가 구절 안에도 올 수 있어 따옴표 단위로 자른다.
    for (const m of inline.matchAll(/'(?:[^']|'')*'|"(?:[^"\\]|\\.)*"/g)) items.push(unquoteYaml(m[0]));
  } else {
    // 다음 최상위 키가 나올 때까지 목록 항목을 모은다. 주석·빈 줄은 건너뛴다.
    for (const ln of fm.slice(at + 1)) {
      if (/^\S/.test(ln) && !ln.startsWith("-")) break;
      const m = ln.match(/^\s*-\s+(.*)$/);
      if (m) items.push(unquoteYaml(m[1]));
    }
  }
  return items;
}

// frontmatter `user_phrases`의 항목(`'"구절 원문" (출처)'`)을 [구절, 항목 전체]로 돌려준다.
// 구절은 첫 `" (`까지다 — 구절 안에 큰따옴표가 있어도(`"버튼 "저장"을 누른다" (출처)`) 출처 앞에서 끊는다.
// 큰따옴표로 감싼 구절이 없으면 항목 전체를 구절로 본다.
function readUserPhrases(text) {
  return readFrontmatterList(text, "user_phrases").flatMap((item) => {
    // 한 항목에 구절 여럿을 묶어 적은 꼴(`"A" / "B" (출처)`)은 통째로 대조하면 남아 있는 구절도 누락으로 잡혀,
    // 구절마다 따로 대조하고 묶였다고 표시한다. 따옴표 덩어리 사이에 구두점·공백만 있을 때만 묶음으로 본다.
    const head = item.match(/^(.*?")\s*\(/)?.[1] ?? item;
    if (/^"[^"]+"(?:\s*[/,·|+&]?\s*"[^"]+")+$/.test(head)) {
      return [...head.matchAll(/"([^"]+)"/g)].map((m) => [m[1], item, true]);
    }
    const quoted = item.match(/^"(.*?)"\s*\(/) ?? item.match(/^"(.*)"$/);
    return [[quoted ? quoted[1] : item, item, false]];
  });
}

// frontmatter `rejected` 항목(`'"원문" (사유)'`) 중 낱말·문구만 {word, swap}으로 돌려준다. swap 자리에 사유를 낸다.
// 사유 앞이 따옴표 덩어리뿐일 때만 낱말로 본다 — `"X" 절 (사유)`처럼 절을 가리키거나 따옴표 없이 내용을 적은 항목은
// 본문 글자로 찾을 것이 아니라 리뷰어 몫이다. 한 항목에 여럿(`"A"·"B" (사유)`)이면 따로 찾는다.
function readRejectedWords(text) {
  return readFrontmatterList(text, "rejected").flatMap((item) => {
    const head = item.match(/^(.*?")\s*\(/)?.[1] ?? item.trim();
    if (!/^"[^"]+"(?:\s*[/,·|+&]?\s*"[^"]+")*$/.test(head)) return [];
    const why = item.slice(head.length).trim().replace(/^\((.*)\)$/, "$1") || "(사유 없음)";
    return [...head.matchAll(/"([^"]+)"/g)].map((m) => ({ word: m[1], lane: "경고", swap: why }));
  });
}

// 서식만 바뀐 것(줄바꿈·공백 수·굵게·기울임)은 구절이 그대로 남은 것으로 본다.
function normalizeForPhrase(s) {
  return s.replace(/\*\*|__|(?<![\w*])\*(?!\s)|(?<!\s)\*(?![\w*])/g, "").replace(/\s+/g, " ");
}

function checkProps(body, propsPath) {
  const props = fs
    .readFileSync(propsPath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  const missing = props.filter((p) => !body.includes(p));
  return { props, missing };
}

function section(title) {
  console.log(`\n${"=".repeat(60)}\n${title}\n${"=".repeat(60)}`);
}

function parseArgs(argv) {
  const args = { file: null, props: null, tokens: null, turns: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--props") args.props = argv[++i];
    else if (a === "--tokens") args.tokens = Number(argv[++i]);
    else if (a === "--turns") args.turns = Number(argv[++i]);
    else if (a === "--rules") args.rules = true;
    else if (a === "--structure") args.structure = true;
    else if (a === "--residual") args.residual = true;
    else if (a === "--json") args.json = true;
    else rest.push(a);
  }
  args.file = rest[0] ?? null;
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.rules) {
    printRules();
    return;
  }
  if (!args.file) {
    console.error("사용: node score.mjs <산출물.md> [--props 명제리스트.txt] [--tokens N] [--turns N]");
    console.error("      node score.mjs --rules   (무엇을 잡는지 전부 낸다)");
    console.error("      node score.mjs <산출물.md> --structure   (긴 한 줄 문단·개수 선언만 낸다)");
    console.error("      node score.mjs <산출물.md> --residual    (남은 [//]: # 주석만 본다, 있으면 exit 1)");
    console.error("      node score.mjs <산출물.md> --json        (끝에 기계용 @@score 한 줄을 더한다)");
    process.exit(1);
  }

  const raw = fs.readFileSync(args.file, "utf8").replace(/\r\n/g, "\n");
  const { body, offset } = splitFrontmatter(raw);
  const { lines, comments } = stripCodeAndQuotes(body.split("\n"), offset);
  if (args.structure) {
    printStructure(lines);
    return;
  }
  if (args.residual) {
    // 발행 직전 확인: 남은 주석이 있으면 줄을 내고 1로 끝난다. publish-pr를 안 거치는 발행처(README 등)가 쓴다.
    for (const [lineno, ln] of comments) console.log(`L${lineno}: ${ln.trim()}`);
    console.log(comments.length ? `남은 주석 ${comments.length}건 — 처리하거나 지운 뒤 발행한다` : "남은 주석 없음");
    process.exit(comments.length ? 1 : 0);
  }
  const docType = readFrontmatterScalar(raw, "type");
  const docSubtype = readFrontmatterScalar(raw, "subtype");
  const { banned, contextual } = wordLists();
  const acRejected = loadAcRejected();
  console.log(`모든 글 반려: ${acRejected.note}`);

  section("객관 (자동 계측)");
  const { chars, sents, words } = objective(body);
  console.log(`  최종 분량: ${chars}자(공백 제외) / 약 ${sents}문장 / ${words}어절`);
  console.log(`  누적 토큰: ${args.tokens ?? "미입력 (세션에서 기록)"}`);
  console.log(`  턴 수    : ${args.turns ?? "미입력 (세션에서 기록)"}`);

  section("반객관 (기계 매칭 — 위반 개수, 적을수록 좋음)");
  const bannedHits = findBanned(lines, banned);
  const contextHits = findBanned(lines, contextual);
  const internalHits = findInternal(lines);
  const dashHits = findDashes(lines);
  const politeHits = checkPoliteness(lines);
  const { empties, nheads } = checkEmptySections(body);
  const internalInTotal = internalCounts(docType, docSubtype);

  const dump = (name, hits, fmt) => {
    console.log(`\n[${name}] ${hits.length}건`);
    for (const h of hits) console.log("   " + fmt(h));
  };

  // 규칙 묶음별로 걸린 줄을 낸 뒤 그 규칙의 상세를 한 번 붙인다. 상세는 RULES가 든다.
  const dumpByRule = (name, hits, note = "") => {
    console.log(`\n[${name}] ${hits.length}건${note}`);
    const groups = new Map();
    for (const h of hits) {
      if (!groups.has(h[0])) groups.set(h[0], []);
      groups.get(h[0]).push(h);
    }
    for (const [cat, rows] of groups) {
      for (const h of rows) console.log(`   ${cat} · '${h[1]}' (L${h[2]}): ${h[3].slice(0, 70)}`);
      for (const ln of guideFor(cat, [...new Set(rows.map((r) => r[1]))])) console.log(ln);
    }
  };

  dumpByRule("금지어", bannedHits);
  dumpByRule("문맥 확인 필요", contextHits, " (합계에서 뺌 — 쓰임을 보고 실제 위반만 고른다)");
  const LANE_NOTE = " (합계에서 뺌 — 눈으로 확인, 쓰임이 반려된 뜻일 때만 고친다)";
  const acHits = findRejectedHits(lines, acRejected.entries);
  const rejectedBanned = acHits.filter((h) => h.lane === "합계");
  const rejectedWarn = acHits.filter((h) => h.lane === "경고");
  dumpRejectedHits("모든 글 반려 표현", rejectedBanned);
  dumpRejectedHits("모든 글 반려 표현 — 경고", rejectedWarn, LANE_NOTE);
  const pkgRejectedHits = findRejectedHits(lines, readRejectedWords(raw));
  dumpRejectedHits(
    "이 글 반려(frontmatter rejected)",
    pkgRejectedHits,
    " (합계에서 뺌 — 눈으로 확인, 반려된 쓰임으로 다시 들어갔으면 고친다)",
    "사유",
  );
  dump(
    internalInTotal
      ? "내부 작업이력"
      : "내부 작업이력 (합계에서 뺌 — 이 글은 PR·커밋 링크를 근거로 싣는다. 독자가 열 수 없는 것만 고른다)",
    internalHits,
    (h) => `${h[0]} · '${h[1]}' (L${h[2]}): ${h[3].slice(0, 70)}`,
  );
  dumpByRule("em/en dash", dashHits);
  const questionHits = checkQuestionMark(lines);
  dump("의문형에 물음표 없음", questionHits, (h) => `L${h[0]}: ${h[1].slice(0, 70)}`);
  const h1 = docType === "pr-body" ? firstH1(body.split("\n"), offset) : null;
  const titleHits = h1 ? checkTitle(h1[1]).map((why) => [h1[0], h1[1], why]) : [];
  if (docType === "pr-body") dump("PR 제목", titleHits, (h) => `L${h[0]} 「${h[1]}」: ${h[2]}`);
  const emojiHits = NO_EMOJI_TYPES.has(docType) ? findEmoji(lines) : [];
  if (NO_EMOJI_TYPES.has(docType)) {
    dump("이모지", emojiHits, (h) => `'${h[1]}' (L${h[0]}): ${h[2].slice(0, 70)}`);
    if (emojiHits.length) console.log("   → PR 본문·PR 코멘트에는 이모지를 쓰지 않는다. 지우거나 말로 바꾼다.");
  }
  const plainText = readFrontmatterScalar(raw, "rendering_env") === "plain-text";
  const markdownHits = plainText ? findMarkdown(body.split("\n"), offset) : [];
  if (plainText) {
    dump("plain-text 마크다운", markdownHits, (h) => `${h[0]} (L${h[1]}): ${h[2].slice(0, 70)}`);
    if (markdownHits.length) console.log("   → 발행처가 마크다운을 그리지 않아 기호가 그대로 보인다. 기호를 걷고 문장·줄바꿈으로 나눈다.");
  }
  console.log(`\n[습니다체 휴리스틱] ${politeHits.length}건 (눈으로 확인 — false positive 가능)`);
  for (const [lineno, ln] of politeHits) console.log(`   L${lineno}: ${ln.slice(0, 70)}`);
  const { longHits, countHits } = printStructure(lines);
  const hanjaHits = checkHanjaSuffix(lines);
  console.log(`\n[「~화」 한자어] ${hanjaHits.length}건 (눈으로 확인 — 「화」로 끝난다고 다 딱딱한 것은 아니다)`);
  for (const [w, lineno, ln] of hanjaHits) console.log(`   '${w}' (L${lineno}): ${ln.slice(0, 70)}`);
  if (hanjaHits.length) {
    console.log(
      "   → 독자가 그 자리에서 무슨 동작인지 그리지 못하면 일상어로 푼다" +
        " (직렬화 → 조립, 구조화 → 같은 것을 한 곳에 모으기). 그 분야에서 이름으로 굳은 것은 그대로 둔다.",
    );
  }

  section("완전성 (반객관)");
  console.log(`[빈 섹션] 확정 헤딩 ${nheads}개 중 ${empties.length}개 빈 섹션`);
  for (const [head, why] of empties) console.log(`   ${head}  ← ${why}`);
  console.log(
    `\n[남은 주석] ${comments.length}건 (눈으로 확인 — 사용자에게 묻는 자리라 합계에서 뺀다. ` +
      "남은 채로는 게시가 막힌다)",
  );
  for (const [lineno, ln] of comments) console.log(`   L${lineno}: ${ln.trim().slice(0, 70)}`);
  if (docType === "decision") {
    const methods = checkDecisionStructure(body);
    const holes = methods.filter((m) => !m.장점 || !m.단점);
    const few =
      methods.length === 0
        ? " (`### 방법 N.` 꼴 헤딩을 못 찾음 — 표기가 다르면 그 꼴로 바꾸고, 방법이 없으면 사용자에게 받는다)"
        : methods.length < 2
          ? " (2개 미만 — 비교할 방법을 사용자에게 받는다)"
          : "";
    console.log(`\n[decision 비교 구조] 방법 ${methods.length}개` + few);
    for (const m of holes) {
      const miss = [!m.장점 && "장점", !m.단점 && "단점"].filter(Boolean).join("·");
      console.log(`   ${m.head}  ← ${miss} 누락·공란`);
    }
  }
  let caseLinkHits = [];
  let caseBoldHits = [];
  if (docType === "case-study") {
    const cs = checkCaseStudy(lines);
    caseLinkHits = cs.moreLinks;
    caseBoldHits = cs.boldLeads;
    console.log(
      `\n[case-study 칸] 사례 ${cs.ncases}개 중 ${cs.holes.length}개 칸 누락` +
        (cs.holes.length ? " (합계에서 뺌 — 채울 내용은 지어내지 말고 사용자에게 받는다)" : ""),
    );
    for (const h of cs.holes) {
      const fromLabel = h.miss.filter((m) => h.labels.includes(m));
      const absent = h.miss.filter((m) => !h.labels.includes(m));
      const why = [
        fromLabel.length && `**${fromLabel.join("**·**")}** 굵은 라벨 → ### 헤딩으로 바꾼다`,
        absent.length && `### ${absent.join("·### ")} 없음`,
      ].filter(Boolean);
      console.log(`   ${h.head}  ← ${why.join(" / ")}`);
    }
    dump("case-study [자세히 보기] 링크", caseLinkHits, (h) => `L${h[0]}: ${h[1].slice(0, 70)}`);
    if (caseLinkHits.length) console.log("   → 지운다. 근거가 필요하면 링크 글자에 무엇이 있는지 적은 근거 링크(실제 작업 PR·원문 글)로 바꾼다.");
    dump("case-study 굵은 요약 문장", caseBoldHits, (h) => `L${h[0]}: ${h[1].slice(0, 70)}`);
    if (caseBoldHits.length) console.log("   → 문장 전체를 굵게 하지 않는다. 굵게는 그 문장의 핵심 낱말에만 남긴다.");
  }

  if (args.props) {
    const { props, missing } = checkProps(body, args.props);
    console.log(`\n[핵심명제] ${props.length}개 중 ${missing.length}개 누락 (합계에서 뺌 — 빠진 명제를 사용자에게 알린다)`);
    for (const m of missing) console.log(`   누락: ${m}`);
  } else {
    console.log("\n[핵심명제] 안 봄 — 한 줄에 명제 하나씩 적은 파일을 --props로 넘기면 본문에 들어 있는지 본다");
  }

  // 사용자가 직접 넣거나 승인한 구절이 다듬기·리뷰어 대안 반영 중에 사라졌는지 본다. 바꾼 쪽에도 근거가
  // 있을 수 있어 기계가 되살리거나 합계에 넣어 0으로 밀지 않고, 사용자가 고르게 넘긴다.
  const userPhrases = readUserPhrases(raw);
  const flatBody = normalizeForPhrase(body);
  const lostPhrases = userPhrases.filter(([phrase]) => !flatBody.includes(normalizeForPhrase(phrase)));
  console.log(
    `\n[사용자 구절 누락] frontmatter user_phrases ${userPhrases.length}개 중 ${lostPhrases.length}개` +
      (lostPhrases.length ? " (합계에서 뺌 — 사용자에게 알린다)" : ""),
  );
  for (const [phrase, item, bundled] of lostPhrases) console.log(`   누락: ${bundled ? `"${phrase}" ← ${item}` : item}`);
  const bundledItems = [...new Set(userPhrases.filter(([, , bundled]) => bundled).map(([, item]) => item))];
  if (bundledItems.length) {
    console.log(`   묶임: 한 줄에 구절 여럿 ${bundledItems.length}줄 — 구절마다 한 줄로 나눠 적는다(대조는 구절마다 했다)`);
    for (const item of bundledItems) console.log(`     ${item}`);
  }
  if (lostPhrases.length) {
    console.log(
      "   → 되살리지도 바뀐 채 두지도 말고 사용자에게 알린다: 어느 구절이 빠졌는지, 무엇이 바꿨는지(리뷰어 대안·메인 수정)," +
        " 바꾼 쪽의 근거, 원래 구절로 둘지 바뀐 쪽을 받을지. 사용자가 고른 대로 본문과 user_phrases를 맞춘다." +
        " 사용자가 직접 지운 구절이면 묻지 않고 user_phrases에서 뺀다.",
    );
  }

  section("주관 (사람 전속 — 여기서 안 잼)");
  console.log("  만족/불만족 · 추가교정 횟수 → 사람이 적는다");

  const total =
    bannedHits.length +
    rejectedBanned.length +
    (internalInTotal ? internalHits.length : 0) +
    dashHits.length +
    questionHits.length +
    titleHits.length +
    emojiHits.length +
    markdownHits.length +
    empties.length +
    caseLinkHits.length +
    caseBoldHits.length;
  console.log(
    `\n>> 기계 적발 합계(참고용, 점수 아님): ${total}건` +
      ` + 눈으로 확인 후보 ${
        politeHits.length + contextHits.length + rejectedWarn.length + pkgRejectedHits.length + longHits.length + countHits.length + hanjaHits.length +
        (internalInTotal ? 0 : internalHits.length)
      }건` +
      `(습니다체 ${politeHits.length} · 문맥 ${contextHits.length} · 반려 경고 ${rejectedWarn.length} · 이 글 반려 ${pkgRejectedHits.length}` +
      ` · 긴 줄 ${longHits.length} · 개수 선언 ${countHits.length} · ~화 ${hanjaHits.length}` +
      (internalInTotal ? "" : ` · 작업이력 ${internalHits.length}`) +
      ")",
  );
  // 다른 스크립트(게시)가 읽는 기계용 한 줄. 사람이 읽는 출력 꼴이 바뀌어도 이 줄로 판정을 넘긴다.
  if (args.json) console.log(`@@score ${JSON.stringify({ total, titleHits: titleHits.map((h) => `L${h[0]} 「${h[1]}」: ${h[2]}`) })}`);
}

main();
