#!/usr/bin/env node
// write 산출물 채점 하네스 (객관 + 반객관 자동 계측).
//
// pre-exit write-refine 보강과 write-refine 자체 자기검토 루프가 호출하는 채점 도구.
// 주관(만족/불만족·추가교정)은 사람 전속이라 여기서 안 잰다. 점수로 합치지 않는다 —
// 층(객관·반객관)을 따로 출력한다.
//
// 금지어 목록은 tone.md의 <!-- banned: ... --> 주석을 실행 시점에 읽어 만든다(SSOT는
// writing-guide/tone.md). 이 스크립트에는 금지어를 하드코딩하지 않으므로 tone.md가 바뀌면
// 별도 동기화 없이 그대로 반영된다.
//
// 사용:
//   node score.mjs <산출물.md> [--props 명제리스트.txt] [--tokens N] [--turns N] [--resume]
//
// 명제리스트(--props): 한 줄에 핵심 명제 하나. 본문에 substring으로 들어있는지만 본다.
// 토큰·턴(--tokens/--turns): 세션에서 얻는 값. 주면 객관 표에 기록만 한다(자동 산출 불가).
//
// 반객관 매칭은 한국어 단어 경계가 없어 false positive가 날 수 있다(예: '유사' in '유사성').
// 그래서 위반마다 해당 줄을 함께 출력해 사람이 눈으로 확인할 수 있게 한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TONE_MD = path.join(HERE, "..", "..", "..", "contexts", "writing-guide", "tone.md");

const INTERNAL = {
  PR번호: /PR\s*#?\d+/g,
  커밋해시: /\b[0-9a-f]{7,40}\b/g,
  브랜치명: /\b(feature|fix|chore|refactor)\/\S+/g,
};

const DASHES = { "—": "em-dash(U+2014)", "–": "en-dash(U+2013)" };

// 1a 습니다체 휴리스틱: 평서문 종결이 반말이면 잡는다. 명사형(이력서)·정중체는 통과.
const BANMAL_END = /(?:[가-힣])(?:는다|ㄴ다|했다|이다|된다|온다|간다|왔다|갔다|보다|같다)\.?$/;
const POLITE_END = /(?:습니다|입니다|됩니다|ㅂ니다|세요|어요|아요|에요|예요)\.?$/;

function loadBanned() {
  const text = fs.readFileSync(TONE_MD, "utf8");
  const lines = text.split("\n");
  const banned = {};
  let heading = null;
  for (const ln of lines) {
    const h = ln.match(/^## (.+)/);
    if (h) {
      heading = h[1].trim();
      continue;
    }
    const m = ln.match(/<!--\s*banned:\s*(.+?)\s*-->/);
    if (m && heading) {
      banned[heading] = m[1].split(",").map((w) => w.trim()).filter(Boolean);
    }
  }
  return banned;
}

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
    else rest.push(a);
  }
  args.file = rest[0] ?? null;
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error("사용: node score.mjs <산출물.md> [--props 명제리스트.txt] [--tokens N] [--turns N] [--resume]");
    process.exit(1);
  }

  const raw = fs.readFileSync(args.file, "utf8");
  const body = splitFrontmatter(raw);
  const lines = stripCodeAndQuotes(body.split("\n"));
  const banned = loadBanned();

  section("객관 (자동 계측)");
  const { chars, sents, words } = objective(body);
  console.log(`  최종 분량: ${chars}자(공백 제외) / 약 ${sents}문장 / ${words}어절`);
  console.log(`  누적 토큰: ${args.tokens ?? "미입력 (세션에서 기록)"}`);
  console.log(`  턴 수    : ${args.turns ?? "미입력 (세션에서 기록)"}`);

  section("반객관 (기계 매칭 — 위반 개수, 적을수록 좋음)");
  const bannedHits = findBanned(lines, banned);
  const internalHits = findInternal(lines);
  const dashHits = findDashes(lines);
  const politeHits = checkPoliteness(lines);
  const policy = readPlaceholderPolicy(raw);
  const { empties, placeholders, nheads } = checkEmptySections(body, policy);

  const dump = (name, hits, fmt) => {
    console.log(`\n[${name}] ${hits.length}건`);
    for (const h of hits) console.log("   " + fmt(h));
  };

  dump("금지어", bannedHits, (h) => `${h[0]} · '${h[1]}' (L${h[2]}): ${h[3].slice(0, 70)}`);
  dump("내부 작업이력(5a)", internalHits, (h) => `${h[0]} · '${h[1]}' (L${h[2]}): ${h[3].slice(0, 70)}`);
  dump("em/en dash(10a)", dashHits, (h) => `${h[1]} (L${h[2]}): ${h[3].slice(0, 70)}`);
  console.log(
    `\n[습니다체(1a) 휴리스틱] ${politeHits.length}건 (눈으로 확인 — false positive 가능` +
      (args.resume ? ", 이력서 명사형 허용)" : ")"),
  );
  for (const [lineno, ln] of politeHits) console.log(`   L${lineno}: ${ln.slice(0, 70)}`);

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
    empties.length +
    (phCounts ? placeholders.length : 0);
  console.log(`\n>> 기계 적발 합계(참고용, 점수 아님): ${total}건 + 습니다체 후보 ${politeHits.length}건`);
}

main();
