#!/usr/bin/env node
// write 산출물 채점 하네스 (객관 + 반객관 자동 계측).
//
// pre-exit write-refine 보강과 write-refine 검수의 기계 층이 호출하는 채점 도구.
// 주관(만족/불만족·추가교정)은 사람 전속이라 여기서 안 잰다. 점수로 합치지 않는다 —
// 층(객관·반객관)을 따로 출력한다.
//
// 금지어 목록과 그 규칙의 상세는 아래 RULES가 함께 든다(SSOT). 문서에는 사본을 두지 않는다 —
// 기계가 100% 잡는 규칙을 문서에 적으면 그 규칙을 어길 글이든 아니든 매 회차 통째로 실린다.
// 가르는 기준과 못 내리는 것은 RULES 주석에 적어 뒀다.
//
// 사용:
//   node score.mjs <산출물.md> [--props 명제리스트.txt] [--tokens N] [--turns N] [--resume]
//   node score.mjs --rules            무엇을 잡는지 전부 낸다 (낱말·경고 레인·대체어)
//
// 명제리스트(--props): 한 줄에 핵심 명제 하나. 본문에 substring으로 들어있는지만 본다.
// 토큰·턴(--tokens/--turns): 세션에서 얻는 값. 주면 객관 표에 기록만 한다(자동 산출 불가).
//
// 반객관 매칭은 한국어 단어 경계가 없어 false positive가 날 수 있다(예: '유사' in '유사성').
// 그래서 위반마다 해당 줄을 함께 출력해 사람이 눈으로 확인할 수 있게 한다.
import fs from "node:fs";

const INTERNAL = {
  PR번호: /PR\s*#?\d+/g,
  커밋해시: /\b[0-9a-f]{7,40}\b/g,
  브랜치명: /\b(feature|fix|chore|refactor)\/\S+/g,
};

const DASHES = { "—": "em-dash(U+2014)", "–": "en-dash(U+2013)" };

// 낱말 목록과 규칙 상세(무엇이 문제이고 무엇으로 바꾸는가)가 여기 함께 산다.
//
// 왜 문서가 아니라 여기인가: 기계가 100% 잡는 규칙은 문서에 두면 그 규칙을 어길 글이든 아니든
// 매 회차 통째로 실린다. 위반이 뜬 자리에서만 알리면 되고, 알릴 때 무엇으로 바꿀지까지 함께 내면
// 사람이 규칙을 기억해 스스로 찾는 것보다 정확하다. decision-guide.md가 헤딩·라벨 표기에 이미
// 같은 방식을 쓴다. 목록을 보고 싶으면 `--rules`로 전부 낸다.
//
// 못 내리는 것: 반려가 안 오는 규칙. 기계가 판정 못 하는 규칙을 문서에서 걷으면 적발 0건이
// 「통과」로 읽혀 규칙이 그냥 사라진다. 그래서 tone.md에는 판단이 드는 절만 남아 있다.
// 「외래어 음차 회피」가 양쪽에 걸친 자리다 — 낱말 하나는 여기가 잡고, 새 영어 용어를 음차할지와
// 예외 넷(일상화된 외래어·고유명사·굳은 용어·괄호 병기)은 그 절의 산문이 든다.
//
// `warn: true`는 낱말이 아니라 쓰임이 걸리는 규칙(주어가 글쓴이일 때만 위반 등)이다. 매칭은 하되
// 적발 합계에 넣지 않는다 — 합계는 0까지 밀어야 하는 값이라, 정상 문장이 걸릴 수 있는 항목을
// 넣으면 멀쩡한 문장을 깎아야 0이 된다. **금지어를 새로 굳힐 때 어느 쪽에 넣을지가 이 갈림이다.**
const RULES = {
  "딱딱한 한자어 회피": {
    words: ["유사", "파편화", "구조화", "이원화", "직렬화", "명세"],
    what: "생소하거나 딱딱하게 읽히는 한자어는 일상어로 푼다. `~화` 계열뿐 아니라 일반 한자어도 같다 (목록 밖도 같은 결로 본다: 구현 → 만듦, 확정 → 정함).",
    swap: {
      유사: "비슷한",
      파편화: "흩어져 · 따로 만들어져",
      구조화: "풀어쓰기 (예: 「같은 것을 한 곳에 모아 ~하는 방식」)",
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
  // 「인터페이스」는 넣지 않는다 — Interface와 한글 표기를 둘 다 쓰는 낱말이라 0-강제 레인에
  // 넣으면 정상적으로 쓴 자리까지 매번 고치게 된다. 음차 판정 자체는 tone.md 산문이 든다.
  "외래어 음차 회피": {
    words: ["디프리케이트"],
    what: "영어 기술 용어를 한글 음차로 옮기지 않는다. 원문 영어(`Soft Deprecated`)나 의미 번역(`신규 생성 차단`) 중 하나를 고른다. 예외와 경계는 tone.md 「외래어 음차 회피」가 든다.",
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
  console.log(`\n## 「~화」 한자어  (경고 — 합계에서 뺌)`);
  console.log(`   패턴: 「명사 + 화」. 그 자체로 한 낱말인 것은 뺀다: ${[...HANJA_SUFFIX_ALLOW].join(", ")}`);
}

// 1a 습니다체 휴리스틱: 평서문 종결이 반말이면 잡는다. 명사형(이력서)·정중체는 통과.
const BANMAL_END = /(?:[가-힣])(?:는다|ㄴ다|했다|이다|된다|온다|간다|왔다|갔다|보다|같다)\.?$/;
const POLITE_END = /(?:습니다|입니다|됩니다|ㅂ니다|세요|어요|아요|에요|예요)\.?$/;

function splitFrontmatter(text) {
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      const nl = text.indexOf("\n", end + 1);
      return nl !== -1 ? text.slice(nl + 1) : "";
    }
  }
  return text;
}

// 코드펜스 안·인용블록(>) 줄은 dash/금지어 검사에서 뺀 본문만 돌려준다.
function stripCodeAndQuotes(rawLines) {
  const out = [];
  let inFence = false;
  rawLines.forEach((ln, i) => {
    const s = ln.trim();
    if (s.startsWith("```")) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    if (s.startsWith(">")) return;
    out.push([i + 1, ln]);
  });
  return out;
}

function countSentences(body) {
  const text = body.replace(/```[\s\S]*?```/g, "");
  return (text.match(/[.!?。]|다\s|요\s|니다/g) ?? []).length;
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
      for (const m of ln.matchAll(new RegExp(rx.source, rx.flags))) {
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

// 1a — 휴리스틱. 반말 종결로 보이는 본문 줄을 후보로 잡는다.
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
    const s = ln.trim().replace(/^#+\s*/, "").replace(/[*_`\s]+$/, "");
    if (!s || s.startsWith("|")) continue;
    if (QUESTION_END.test(s)) hits.push([lineno, ln.trim()]);
  }
  return hits;
}

// 개수를 선언해 놓고 이어지는 줄이 리스트로 안 열리는 자리. tone.md 「비교/나열은 리스트로」가
// 이미 덮는데 기계가 안 봐서 계속 새던 축이다. 수량어는 평범한 서술에도 흔해서(「두 가지에
// 걸립니다」·「두 개 이상을 합치는」) 선언 종결 꼴로 좁혔다 — 넓게 잡으면 오탐이 대부분이다.
const COUNT_DECL = /(?:두 가지|세 가지|네 가지|다섯 가지|[2-9]가지|두 개|세 개)\s*(?:뿐)?(?:이|가|은|는)?\s*(?:있습니다|입니다|였습니다|있었습니다)\.?/;

function checkCountDeclaration(lines) {
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i][1].trim();
    if (!s || s.startsWith("#") || s.startsWith("|")) continue;
    const m = COUNT_DECL.exec(s);
    if (!m) continue;
    // 선언 뒤에 같은 줄로 설명이 이어지면 그 자리에서 산문으로 푼 것이다.
    const tail = s.slice(m.index + m[0].length).trim();
    if (!tail) {
      // 줄이 선언으로 끝났으면 이어지는 첫 줄이 리스트로 열리는지 본다.
      const next = lines.slice(i + 1).find(([, ln]) => ln.trim());
      if (next && /^\s*(?:[-*+]|\d+\.)\s/.test(next[1])) continue;
    }
    hits.push([lines[i][0], s]);
  }
  return hits;
}

// 「명사 + 화」 꼴 한자어. tone.md 「딱딱한 한자어 회피」가 이 계열을 통째로 덮는데 낱말 목록으로는
// 굳힌 여섯 개만 잡혀, 같은 결의 새 낱말이 매번 샜다.
//
// 목록이 아니라 패턴이라 tone.md 주석(<!-- banned: -->)에 못 담는다 — 그 주석은 낱말만 받는다.
// 그래서 이 검사만 목록이 코드에 산다.
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

// C1 — 헤딩별 본문이 1문장 미만이면 빈 섹션. placeholder 잔존은 따로 센다
// (placeholder_policy: keep이면 남기는 것이 정상이라 위반이 아니다).
// 마크다운 링크([텍스트](url))는 placeholder 대괄호가 아니므로 먼저 걷어낸다.
function checkEmptySections(text, placeholderPolicy) {
  const lines = text.split("\n");
  const heads = [];
  lines.forEach((ln, i) => {
    if (/^#{1,6}\s/.test(ln)) heads.push([i, ln, ln.match(/^#+/)[0].length]);
  });
  const empties = [];
  const placeholders = [];
  heads.forEach(([i, head, level], idx) => {
    const next = heads[idx + 1];
    // 바로 다음이 더 깊은 헤딩이면 내용을 하위 절이 담는 상위 절이라 빈 섹션이 아니다.
    if (next && next[2] > level) return;
    const end = next ? next[0] : lines.length;
    const body = lines.slice(i + 1, end).join("\n").trim();
    const bodyWoLinks = body.replace(/\[[^\]]*\]\([^)]*\)/g, "");
    const bodyWoPh = bodyWoLinks.replace(/\[.*?\]/g, "");
    const hasPlaceholder = /\[.*?\]/.test(bodyWoLinks);
    if (hasPlaceholder) placeholders.push(head.trim());
    // keep 정책에서 placeholder만 있는 절은 사용자가 채울 자리라 C1b로만 보고한다.
    if (hasPlaceholder && placeholderPolicy === "keep") return;
    if (bodyWoPh.replace(/\s/g, "").length < 10) empties.push([head.trim(), "내용 1문장 미만"]);
  });
  return { empties, placeholders, nheads: heads.length };
}

// decision 문서의 비교 구조. 「방법이 둘 이상인가」와 「각 방법이 장단점을 둘 다 채웠는가」는
// 헤딩·리터럴 매칭이라 판단이 안 든다 — decision-guide 산문이 표기를 못박는 대신 여기서 잡는다.
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

// placeholder를 남기는 것이 정상인지는 frontmatter가 정한다. 없으면 keep(기본값).
function readPlaceholderPolicy(text) {
  if (!text.startsWith("---")) return "keep";
  const end = text.indexOf("\n---", 3);
  if (end === -1) return "keep";
  const m = text.slice(3, end).match(/^\s*placeholder_policy:\s*(\S+)/m);
  return m ? m[1] : "keep";
}

function readDocType(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const m = text.slice(3, end).match(/^\s*type:\s*(\S+)/m);
  return m ? m[1] : null;
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
  const args = { file: null, props: null, tokens: null, turns: null, resume: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--props") args.props = argv[++i];
    else if (a === "--tokens") args.tokens = Number(argv[++i]);
    else if (a === "--turns") args.turns = Number(argv[++i]);
    else if (a === "--resume") args.resume = true;
    else if (a === "--rules") args.rules = true;
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
    console.error("사용: node score.mjs <산출물.md> [--props 명제리스트.txt] [--tokens N] [--turns N] [--resume]");
    console.error("      node score.mjs --rules   (무엇을 잡는지 전부 낸다)");
    process.exit(1);
  }

  const raw = fs.readFileSync(args.file, "utf8");
  const body = splitFrontmatter(raw);
  const lines = stripCodeAndQuotes(body.split("\n"));
  const { banned, contextual } = wordLists();

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
  const policy = readPlaceholderPolicy(raw);
  const { empties, placeholders, nheads } = checkEmptySections(body, policy);

  const dump = (name, hits, fmt) => {
    console.log(`\n[${name}] ${hits.length}건`);
    for (const h of hits) console.log("   " + fmt(h));
  };

  // 규칙 묶음별로 걸린 줄을 낸 뒤 그 규칙의 상세를 한 번 붙인다. 상세는 GUIDE가 든다.
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
  dump("내부 작업이력(5a)", internalHits, (h) => `${h[0]} · '${h[1]}' (L${h[2]}): ${h[3].slice(0, 70)}`);
  dumpByRule("em/en dash(10a)", dashHits);
  const questionHits = checkQuestionMark(lines);
  dump("의문형에 물음표 없음", questionHits, (h) => `L${h[0]}: ${h[1].slice(0, 70)}`);
  console.log(
    `\n[습니다체(1a) 휴리스틱] ${politeHits.length}건 (눈으로 확인 — false positive 가능` +
      (args.resume ? ", 이력서 명사형 허용)" : ")"),
  );
  for (const [lineno, ln] of politeHits) console.log(`   L${lineno}: ${ln.slice(0, 70)}`);
  const countHits = checkCountDeclaration(lines);
  console.log(`\n[개수 선언 뒤 리스트 없음] ${countHits.length}건 (눈으로 확인 — 핵심 나열이면 번호 목록으로)`);
  for (const [lineno, ln] of countHits) console.log(`   L${lineno}: ${ln.slice(0, 70)}`);
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
  console.log(`[C1 빈 섹션] 확정 헤딩 ${nheads}개 중 ${empties.length}개 빈 섹션`);
  for (const [head, why] of empties) console.log(`   ${head}  ← ${why}`);
  const phCounts = policy !== "keep";
  console.log(
    `\n[C1b placeholder 잔존] ${placeholders.length}개 섹션 · placeholder_policy: ${policy}` +
      (phCounts ? " (위반)" : " (남기는 것이 정상 — 위반 아님)"),
  );
  for (const head of placeholders) console.log(`   ${head}`);
  if (readDocType(raw) === "decision") {
    const methods = checkDecisionStructure(body);
    const holes = methods.filter((m) => !m.장점 || !m.단점);
    console.log(`\n[decision 비교 구조] 방법 ${methods.length}개` + (methods.length < 2 ? " (2개 미만 — 보강 필요)" : ""));
    for (const m of holes) {
      const miss = [!m.장점 && "장점", !m.단점 && "단점"].filter(Boolean).join("·");
      console.log(`   ${m.head}  ← ${miss} 누락·공란`);
    }
  }

  if (args.props) {
    const { props, missing } = checkProps(body, args.props);
    console.log(`\n[C2 핵심명제] ${props.length}개 중 ${missing.length}개 누락`);
    for (const m of missing) console.log(`   누락: ${m}`);
  } else {
    console.log("\n[C2 핵심명제] --props 미지정 (G2 명제 리스트 필요)");
  }

  section("주관 (사람 전속 — 여기서 안 잼)");
  console.log("  만족/불만족 · 추가교정 횟수 → 눈가림 채점");

  const total =
    bannedHits.length +
    internalHits.length +
    dashHits.length +
    questionHits.length +
    empties.length +
    (phCounts ? placeholders.length : 0);
  console.log(
    `\n>> 기계 적발 합계(참고용, 점수 아님): ${total}건` +
      ` + 눈으로 확인 후보 ${politeHits.length + contextHits.length + countHits.length + hanjaHits.length}건` +
      `(습니다체 ${politeHits.length} · 문맥 ${contextHits.length} · 개수 선언 ${countHits.length}` +
      ` · ~화 ${hanjaHits.length})`,
  );
}

main();
