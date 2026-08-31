// 다른 문서의 절을 가리키는 인용이 실제로 그 절에 닿는지 커밋 시점에 본다.
//
// 두 검사를 한 훅에 담되 세기가 다르다:
//   [차단] 앵커 링크 `[절 이름](경로.md#앵커)`의 앵커가 대상 파일에 없으면 거부한다.
//     앵커 문자열과 대상 파일 헤딩을 대조할 뿐이라 판단이 0이다.
//   [알림] 옛 표기 `경로.md 「절 이름」`이 남아 있으면 알리기만 한다.
//     「」는 인용과 강조를 글자로 못 가른다(AC 실측 242건 중 145건 안팎이 「차이」·「저희」
//     같은 강조). 차단으로 걸면 오탐 하나가 무관한 세션을 통째로 세운다 —
//     check-md-code-labels.mjs가 같은 사유로 알림을 택했다.
//
// 왜 산문이 아니라 훅인가: scw SKILL.md 「위임 문구는 목적지에 실제로 닿아야 한다」가
// "가리키는 절 이름을 grep으로 확인한 뒤 적는다"를 이미 시키고 있다. 그런데 산문은 쓰는
// 시점에만 걸리고 **가리켜지는 쪽이 이름을 바꿀 때는 아무도 안 본다** — 그쪽 편집자는
// 자기를 누가 가리키는지 모른다. AC 정비 7회차에 그렇게 어긋난 참조가 손으로 셋 잡혔다.
//
// 왜 Edit/Write가 아니라 커밋 시점인가: 앵커 검사는 상대 경로를 풀어 **다른 파일**의
// 헤딩을 읽어야 한다. Edit PreToolUse는 쓰려는 문자열만 들고 있어 그 대조를 못 한다.
//
// 검사 범위는 이 커밋이 건드린 md 파일 전체다(contexts/rules-as-code.md
// 「검사 범위 — 고친 줄이 아니라 건드린 파일」). 변경분만 보면 규칙 이전의 위반이
// 그 줄을 건드릴 때까지 남고, 매번 전체를 훑으면 규칙 수만큼 비용이 곱해진다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { findGitInvocations, normalizeCwd } from "./git-command-parser.mjs";
import { addContext, deny, getCommand, getCwd, readPayload } from "./hook-utils.mjs";

// `[절 이름](상대경로.md#앵커)` — 앵커가 대상 파일에 없으면 차단 대상.
const ANCHOR_LINK = /\[([^\]]*)\]\(([^)\s#]+\.md)#([^)\s]+)\)/g;

// 옛 표기: `경로.md`(백틱·링크 어느 쪽이든) 뒤에 조사 한 톨을 사이에 두고 「절 이름」.
// **인접만 쌍으로 본다** — 같은 줄에 떨어져 있는 「」는 현재 파일이나 제3의 문서를 가리키는
// 경우가 실제로 있어 글자로 못 가른다(AC 실측: 느슨하게 보면 62쌍 중 19건이 걸리고 대부분
// 오탐, 인접으로 좁히면 45쌍 중 1건·오탐 0건).
const LEGACY_REF = /(?:\[[^\]]*\]\(([^)\s]+\.md)\)|`([^`\n]+\.md)`|(?<![\w./-])([\w./-]+\.md))\s*(?:의|에|에서|가|이|는|은)?\s*[「【]([^」】\n]+)[」】]/g;

// 「절」이 링크 **글자 안에** 든 형태(`[SKILL.md 「검증 기준」](../SKILL.md)`). 이때 대상은
// 글자 안의 경로가 아니라 링크가 실제로 거는 주소다. 위 정규식만 쓰면 글자 안 경로를
// 대상으로 잡아, 같은 이름의 이웃 파일을 엉뚱하게 가리키고 "그런 절 없다"고 오탐한다.
const LEGACY_REF_IN_LINK = /\[[^\]]*[「【]([^」】\n]+)[」】][^\]]*\]\(([^)\s#]+\.md)\)/g;

// 대상 파일 하나당 앵커 집합을 한 번만 만든다. 여러 파일이 같은 문서를 가리키는 것이 흔하다.
const anchorCache = new Map();

// 모듈 상수는 전부 실행부보다 위에 둔다 — 아래에 두면 `const`가 초기화 전이라(TDZ) 훅이
// 첫 파일에서 예외로 죽는다. 죽으면 stdout이 비어 "판정 없음"이 되므로 **차단 검사가 조용히
// 통과로 바뀐다.** 함수 선언만 아래에 둘 수 있다.
const payload = readPayload();
const command = getCommand(payload);
if (findGitInvocations(command, "commit").length === 0) process.exit(0);

const cwd = normalizeCwd(getCwd(payload)) || process.cwd();
const root = repoRoot(cwd);
if (!root) process.exit(0);

const staged = stagedMarkdown(root);
if (!staged.length) process.exit(0);

const broken = [];
const legacy = [];
for (const rel of staged) {
  const abs = path.join(root, rel);
  let src;
  try {
    src = fs.readFileSync(abs, "utf8");
  } catch {
    continue; // 삭제된 파일 등 — 볼 것이 없다
  }
  collectBrokenAnchors(rel, abs, src, broken);
  collectLegacyRefs(rel, abs, src, legacy);
}

if (broken.length) {
  deny(formatBroken(broken, legacy));
}
if (legacy.length) {
  addContext(formatLegacy(legacy), "PreToolUse");
}
process.exit(0);

// ── 수집 ──────────────────────────────────────────────────────────────────────

function collectBrokenAnchors(rel, abs, src, out) {
  for (const m of matchesOutsideCode(src, ANCHOR_LINK)) {
    const [, text, href, rawAnchor] = m.match;
    const target = path.resolve(path.dirname(abs), href);
    if (!isFile(target)) {
      out.push({ rel, line: m.line, text, href, anchor: rawAnchor, why: "대상 파일이 없습니다", near: [] });
      continue;
    }
    // 링크는 전체 이름으로만 통과시킨다. 앞머리 별칭으로 적힌 앵커는 실제로 그 절로 안 뛰므로
    // 「닿지 않는 위임」 그대로다 — 산문(「」)에서만 별칭을 인정한다.
    const { exact } = anchorsOf(target);
    const anchor = slug(decodeAnchor(rawAnchor));
    if (exact.has(anchor)) continue;
    out.push({
      rel,
      line: m.line,
      text,
      href,
      anchor: rawAnchor,
      why: "대상 파일에 그 절이 없습니다",
      near: nearest(decodeAnchor(rawAnchor), exact),
    });
  }
}

function collectLegacyRefs(rel, abs, src, out) {
  const seen = new Set();
  const inLink = [...matchesOutsideCode(src, LEGACY_REF_IN_LINK)].map((m) => ({
    line: m.line,
    section: m.match[1],
    href: m.match[2],
  }));
  const adjacent = [...matchesOutsideCode(src, LEGACY_REF)].map((m) => ({
    line: m.line,
    section: m.match[4],
    href: m.match[1] || m.match[2] || m.match[3],
  }));
  // 링크 글자 안 형태를 먼저 넣어 같은 (줄, 절)에서 그쪽 주소가 이기게 한다.
  for (const { line, section, href } of [...inLink, ...adjacent]) {
    const key = `${line} ${section}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const m = { line };
    const target = path.resolve(path.dirname(abs), href);
    // 같은 레포 안에서 풀리는 경로만 본다. 안 풀리는 경로는 앵커 링크로 바꿀 수 없어
    // (다른 레포를 가리키거나 이름만 부른 것) 알려봐야 할 수 있는 일이 없다.
    if (!isFile(target)) continue;
    const { loose } = anchorsOf(target);
    // 「A > B」는 중첩 헤딩 경로다(상위 절 > 하위 절). 마디마다 대조하고, 링크로는 마지막
    // 마디를 쓴다 — 앵커는 헤딩 하나만 가리킬 수 있어 실제로 뛸 곳이 그쪽이다.
    const segments = section.split(">").map((s) => s.trim()).filter(Boolean);
    const leaf = segments[segments.length - 1] ?? section;
    const resolved = segments.length > 0 && segments.every((s) => loose.has(slug(s)));
    // 앵커는 앞머리 별칭이 아니라 **전체 헤딩**의 슬러그여야 실제로 뛴다. 표시 글자는
    // 원래 부르던 이름을 그대로 두고, 주소만 전체 이름으로 채운 제안을 낸다.
    const full = resolved ? loose.get(slug(leaf)) : null;
    out.push({
      rel,
      line: m.line,
      section,
      href,
      suggestion: full ? `[${leaf}](${href}#${slug(full)})` : null,
    });
  }
}

// ── 앵커 ──────────────────────────────────────────────────────────────────────

// 대상 파일의 앵커 후보: 헤딩 + 굵은 라벨(`**이름**:`).
// 굵은 라벨을 넣는 이유 — 이 레포들은 그 형태를 절처럼 쓰고, 실제로 그렇게 가리킨 참조가 있다.
// 슬러그 → 원래 절 이름. 원본을 함께 들고 있어야 "이름이 비슷한 절"을 사람이 읽는 형태로
// 보여줄 수 있다 — 슬러그로 보여주면 개명된 절을 눈으로 알아보기 어렵다.
function anchorsOf(file) {
  const hit = anchorCache.get(file);
  if (hit) return hit;
  let src = "";
  try {
    src = fs.readFileSync(file, "utf8");
  } catch {
    const empty = { exact: new Map(), loose: new Map() };
    anchorCache.set(file, empty);
    return empty;
  }
  const raws = [];
  let fenced = false;
  for (const line of src.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const heading = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (heading) {
      raws.push(heading[1]);
      continue;
    }
    const label = /^\s*(?:[-*]\s*)?\*\*(.+?)\*\*\s*[::]/.exec(line);
    if (label) raws.push(label[1]);
  }
  const exact = new Map();
  const loose = new Map();
  const add = (m, key, raw) => {
    if (key && !m.has(key)) m.set(key, raw);
  };
  for (const raw of raws) {
    add(exact, slug(raw), clean(raw));
    add(loose, slug(raw), clean(raw));
  }
  // 별칭은 전체 이름을 다 넣은 뒤에 얹는다 — 별칭이 다른 절의 전체 이름과 겹치면 전체가 이긴다.
  // 번호를 남기고 부르는 쪽(「4-1. 산출물 …」)과 떼고 부르는 쪽(「프롬프트 유지보수」)이 둘 다 있어
  // 두 겹을 등록한다.
  for (const raw of raws) add(loose, slug(cutTail(clean(raw))), clean(raw));
  for (const raw of raws) add(loose, slug(headOf(raw)), clean(raw));
  const result = { exact, loose };
  anchorCache.set(file, result);
  return result;
}

// 헤딩의 앞머리 — 뒤에 붙은 부연을 뗀 부분. 이 레포들은 절을 가리킬 때 앞머리만 부른다
// (`## 사전 준비: 브랜치·워크트리 생성`을 「사전 준비」로). 부연은 고쳐 써도 앞머리는
// 그대로 남으므로 그쪽이 실질적인 이름이다. 이걸 안 보면 멀쩡한 참조가 전부 미아로 잡힌다
// (AC md 179개 실측: 별칭을 안 보면 미해결 19건, 보면 0건).
//
// 구분자 앞에 공백을 요구한다 — `file-level(blanket) …` 처럼 붙여 쓴 괄호는 이름의 일부다.
function headOf(raw) {
  return cutTail(stripLead(clean(raw)));
}

function cutTail(text) {
  const cut = text.search(/\s+[—–]\s|\s+\(|:\s/u);
  return cut === -1 ? text : text.slice(0, cut);
}

// 헤딩 앞에 붙은 자리표시 — 차례 번호(`Step 5.`·`4-1.`·`3.`)와 앞머리 괄호(`(채용 전용)`).
// 뒤의 부연과 같은 이유로 뗀다: 순서가 밀리거나 조건이 바뀌면 이쪽이 바뀌고, 부르는 쪽은
// 이름만 부른다(`### Step 5. 프롬프트 유지보수`를 「프롬프트 유지보수」로).
function stripLead(text) {
  return text
    .replace(/^\((?:[^)]*)\)\s*/u, "")
    .replace(/^(?:step\s*)?\d+(?:[-.]\d+)*\.?\s+/iu, "")
    .trim();
}

function clean(raw) {
  return raw.replace(/[`*]/g, "").trim();
}

// GitHub 슬러그: 인라인 마크업을 벗기고 → 소문자 → 공백을 `-` → 글자·숫자·`-`·`_` 밖은 버린다.
function slug(text) {
  return text
    .replace(/[`*]/g, "")
    .replace(/[「」【】]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-_]/gu, "");
}

function decodeAnchor(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// 개명을 알아채게 하는 부분. 글자 겹침이 큰 절 이름을 후보로 보여준다.
function nearest(wanted, anchors) {
  const want = new Set(slug(wanted).replace(/-/g, ""));
  if (!want.size) return [];
  const scored = [];
  for (const [key, raw] of anchors) {
    const have = new Set(key.replace(/-/g, ""));
    let shared = 0;
    for (const ch of want) if (have.has(ch)) shared++;
    const ratio = shared / Math.max(want.size, have.size);
    if (ratio >= 0.5) scored.push({ raw, ratio });
  }
  return scored.sort((x, y) => y.ratio - x.ratio).slice(0, 2).map((s) => s.raw);
}

// ── 메시지 ────────────────────────────────────────────────────────────────────

function formatBroken(items, legacyItems) {
  const lines = ["✘ 가리킨 절이 대상 파일에 없습니다.", ""];
  for (const it of items) {
    lines.push(`  ${it.rel}:${it.line}`);
    lines.push(`    [${it.text}](${it.href}#${it.anchor})`);
    lines.push(`      ${it.why}`);
    for (const n of it.near) lines.push(`      이름이 비슷한 절: 「${n}」  ← 개명된 것 같습니다`);
  }
  lines.push(
    "",
    "  → 대상 파일을 열어 실제 절 이름을 확인하고 링크를 맞추세요.",
    "  → 절이 통째로 사라졌으면, 링크만 고치지 말고 가리키던 문장 자체가",
    "     아직 유효한지 보세요. 근거가 없어졌을 수 있습니다.",
  );
  if (legacyItems.length) {
    lines.push("", `  (옛 「」 표기도 ${legacyItems.length}건 있습니다. 그건 차단 대상이 아니라 알림입니다.)`);
  }
  return lines.join("\n");
}

function formatLegacy(items) {
  const lines = [`[인용 표기] 이 커밋이 건드린 파일에 옛 표기로 다른 문서의 절을 가리키는 자리가 ${items.length}건 있습니다.`, ""];
  for (const it of items) {
    lines.push(`  ${it.rel}:${it.line}  ${it.href} 「${it.section}」`);
    if (it.suggestion) lines.push(`    → ${it.suggestion}`);
    else lines.push(`    → 대상 파일에 그 이름의 절이 없습니다. 실제 절 이름을 확인하세요.`);
  }
  lines.push(
    "",
    "이건 이번 변경으로 생긴 위반이 아닙니다. 인용 표기를 앵커 링크로 옮기는 중인데,",
    "한 번에 다 바꾸지 않고 '건드린 파일만 그때그때' 방식이라 이 파일을 연 김에 뜹니다.",
    "",
    "  · 하던 일과 무관한 변경이니 별도 커밋으로 나누세요.",
    "  · 「」가 다른 문서의 절이 아니라 강조·낱말이면(「차이」·「저희」 등) 그대로 두세요.",
    "    이 알림은 그 판정을 대신하지 않습니다.",
    "  · 지금 안 고쳐도 커밋은 통과합니다.",
  );
  return lines.join("\n");
}

// ── git ───────────────────────────────────────────────────────────────────────

function repoRoot(dir) {
  return git(["rev-parse", "--show-toplevel"], dir);
}

function stagedMarkdown(dir) {
  const out = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"], dir);
  if (!out) return [];
  return out.split("\n").filter((p) => p.toLowerCase().endsWith(".md"));
}

function git(args, dir) {
  try {
    return execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

// ── 스캔 ──────────────────────────────────────────────────────────────────────

// 코드블록 밖에서만 정규식을 돌리고 줄번호를 함께 낸다. 코드블록 안의 예시 링크까지 보면
// 훅·문서가 자기 예시 때문에 걸린다.
function* matchesOutsideCode(src, re) {
  const lines = src.split(/\r?\n/);
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    re.lastIndex = 0;
    for (const match of line.matchAll(re)) yield { match, line: i + 1 };
  }
}
