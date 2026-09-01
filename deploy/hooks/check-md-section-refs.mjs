// 다른 문서의 절·커맨드를 가리키는 인용이 실제로 그 대상에 닿는지 커밋 시점에 본다.
//
// 다섯 검사를 한 훅에 담되 세기가 다르다:
//   [차단] 앵커 링크 `[절 이름](경로.md#앵커)`의 앵커가 대상 파일에 없으면 거부한다.
//     앵커 문자열과 대상 파일 헤딩을 대조할 뿐이라 판단이 0이다.
//   [차단] 코드가 문자열로 든 절 인용 `content-format §3 '빈 섹션 금지'`이 안 닿으면 거부한다.
//     **문서 이름이 레포의 md 하나로 유일하게 풀릴 때만** 보므로 여기도 판단이 0이다 —
//     둘 이상으로 풀리거나 안 풀리면 인용이 아닌 것으로 보고 건너뛴다. 린터·훅을 고치는
//     사람과 문서를 고치는 사람이 갈리는 자리라 md끼리보다 어긋나기 쉽다.
//   [알림] 옛 표기 `경로.md 「절 이름」`이 남아 있으면 알리기만 한다.
//     「」는 인용과 강조를 글자로 못 가른다(AC 실측 242건 중 145건 안팎이 「차이」·「저희」
//     같은 강조). 차단으로 걸면 오탐 하나가 무관한 세션을 통째로 세운다 —
//     check-md-code-labels.mjs가 같은 사유로 알림을 택했다.
//   [알림] 본문이 인자와 함께 호명한 슬래시 커맨드가 어디에도 없으면 알린다.
//     절 이름은 개명될 때 흔적이 남지만 커맨드는 **대상이 통째로 사라져 grep으로도 안 걸린다**
//     — 가리키는 쪽만 읽으면 멀쩡해 보인다(DP 16회차에 없는 `/scaffold` 실행 안내가 그렇게
//     살아 있었다). 차단이 아닌 이유는 아는 이름 목록이 원리상 안 닫히기 때문이다 —
//     빌트인·플러그인 커맨드와 다른 레포의 로컬 스킬은 이 레포 안에서 셀 수가 없다.
//   [차단] 위 넷과 **반대 방향** — 이 커밋이 헤딩을 개명한 md를 가리키던 인용이 안 닿게 됐으면
//     거부한다. 위 넷은 스테이지된 파일에서 나가는 링크만 보므로, 개명한 쪽만 커밋하면
//     끊긴 인용을 아무도 안 본다. 발동·세기의 근거는 아래 「역방향」 절에 적었다.
//
// 백틱 안의 레포 상대 경로는 보지 않는다. 링크 형태(`[글자](경로)`)는 scripts/check-links.mjs가
// 이미 전수로 보고, 백틱 형태는 남의 레포 경로를 그대로 적는 자리가 많아(AC 스킬 본문이 소비
// 레포의 경로를 부른다) 실재 여부로 가를 수가 없다.
//
// 붙이기 전 전수 실측(`--scan`, AC 254 + KA 406 + DP 94 파일): 차단 후보로 잡힌 코드 인용은
// KA 3건뿐이고 셋 다 참(개명·미존재)이었으며 오탐 0건 — 그 셋을 고친 뒤 세 레포 전부 0건이라
// 차단으로 켠다. 커맨드는 이름만 적힌 백틱까지 보면 28건이 걸리고 참이 0건이라(전부 URL
// 경로·정규식 플래그·다른 레포 스킬), 인자를 달고 불리는 꼴로 좁혀 0건·오탐 0건으로 맞췄다.
//
// 왜 산문이 아니라 훅인가: scw SKILL.md 「위임 문구는 목적지에 실제로 닿아야 한다」가
// "가리키는 절 이름을 grep으로 확인한 뒤 적는다"를 이미 시키고 있다. 그런데 산문은 쓰는
// 시점에만 걸리고 **가리켜지는 쪽이 이름을 바꿀 때는 아무도 안 본다** — 그쪽 편집자는
// 자기를 누가 가리키는지 모른다. AC 정비 7회차에 그렇게 어긋난 참조가 손으로 셋 잡혔다.
//
// 왜 Edit/Write가 아니라 커밋 시점인가: 앵커 검사는 상대 경로를 풀어 **다른 파일**의
// 헤딩을 읽어야 한다. Edit PreToolUse는 쓰려는 문자열만 들고 있어 그 대조를 못 한다.
//
// 검사 범위는 이 커밋이 건드린 md·코드 파일 전체다(contexts/rules-as-code.md
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

// 코드가 문서 절을 **문자열로** 들고 있는 자리: `content-format §3 '빈 섹션 금지'`,
// `exam SKILL '[UNVERIFIED] 질문의 H1 형식'`. 문서를 경로가 아니라 **이름**으로 부른다.
//
// 문서 이름과 따옴표 사이에 공백을 요구한다 — `test('x')` 같은 호출을 배제하는 자리다.
// 이름은 소문자·숫자·하이픈으로 제한한다(파일명 관습). 실제 게이트는 정규식이 아니라
// **이름이 레포의 md 하나로 유일하게 풀리는가**이므로, 여기서 넓게 잡아도 오탐이 안 샌다.
const CODE_SECTION_REF = /(?<![\w./-])([a-z][a-z0-9]*(?:-[a-z0-9]+)*)(?:\s+(SKILL))?\s*(?:§\s*\d+)?\s+['「]([^'」\n]{2,120})['」]/g;

// 코드 인용을 볼 확장자. 주석·문자열을 가리지 않고 줄 단위로 본다 — KA 린터처럼 레지스트리
// 필드에 든 것도, AC 훅 주석에 든 것도 같은 자리다(데이터 CRUD 순회 11회차에 후자가 어긋난
// 채로 발견됐고, 잡은 것은 조사 에이전트이지 도구가 아니었다).
const CODE_EXTENSIONS = new Set([".ts", ".mts", ".cts", ".tsx", ".js", ".mjs", ".cjs", ".jsx"]);

// 본문이 호명하는 슬래시 커맨드. **백틱 안에서 인자를 달고 불리는 꼴만** 본다
// (`` `/scaffold https://…` ``). 인자 없이 이름만 적힌 `` `/digest` ``는 URL 경로
// (`` `/users` ``·`` `/settings` ``)·정규식 플래그(`` `/g` ``)와 글자로 안 갈린다 —
// 넓게 잡으면 AC·KA·DP 전수에서 28건이 걸리고 그중 참이 0이었다. 인자를 요구하면 같은
// 전수에서 26건이 잡히고 전부 실재하는 커맨드로 풀려, 미해결이 0건·오탐이 0건이 된다.
const SLASH_COMMAND = /`\/([a-z][a-z0-9:_-]*)\s+[^`\n]+`/g;

// 하네스가 스스로 제공하는 커맨드. 파일로 안 남아 디스크에서 셀 수가 없어 여기 적는다.
// 이 목록이 낡는 것이 이 검사를 **알림에 묶어 두는** 이유다 — 빠진 이름 하나가 차단이면
// 하네스가 커맨드를 늘릴 때마다 무관한 커밋이 선다.
const BUILTIN_COMMANDS = new Set([
  "add-dir", "agents", "artifacts", "bug", "clear", "code-review", "compact", "config", "context",
  "cost", "doctor", "exit", "export", "fast", "feedback", "help", "hooks", "ide", "init",
  "install-github-app", "login", "logout", "mcp", "memory", "migrate-installer", "model",
  "output-style", "permissions", "plan", "pr-comments", "privacy-settings", "release-notes",
  "resume", "review", "rewind", "security-review", "skill-doctor", "status", "statusline",
  "tasks", "terminal-setup", "todos", "upgrade", "usage", "vim",
]);

// 모듈 변수는 `const`든 `let`이든 전부 실행부보다 위에 둔다 — 아래에 두면 초기화 전이라(TDZ)
// 훅이 첫 파일에서 예외로 죽는다. 죽으면 stdout이 비어 "판정 없음"이 되므로 **차단 검사가
// 조용히 통과로 바뀐다.** 함수 선언만 아래에 둘 수 있다.

// 대상 파일 하나당 앵커 집합을 한 번만 만든다. 여러 파일이 같은 문서를 가리키는 것이 흔하다.
const anchorCache = new Map();

// `경로` + 「절」 + 콜론으로 끝나는 줄. 바로 다음 줄이 코드펜스일 때만 그 내용을 대조한다.
// 경로도 절도 멀쩡한데 **인용한 본문만** 사라지는 형태를 잡는다 — 위 검사들은 가리키는 주소만
// 보므로 이건 아무도 안 본다. lean-prompt.md의 before 블록 넷이 그렇게 낡아 있었다.
//
// 세 조각이 한 줄에 다 모인 꼴로 좁힌 이유: 넓게(경로가 있는 줄 근처의 아무 코드펜스) 잡으면
// 워크스페이스 실측 9건이 **전부** `foo.md`·`<rel>.md` 같은 예시용 경로라 오탐만 남는다.
const FENCE_QUOTE_LEAD = /`([^`\s]+\.\w+)`[^`\n]*[「【]([^」】\n]+)[」】][^\n]*:\s*$/u;

// 레포당 한 번만 만드는 색인들.
let docIndexCache = null;
let commandCache = null;

// 전수 실측 모드: `node check-md-section-refs.mjs --scan <레포경로>`.
// 검사를 켜기 전에 그 레포 전체에서 몇 건이 걸리는지 세는 자리다. 훅 경로와 **같은 수집
// 함수**를 쓴다 — 재려고 따로 짠 스크립트는 훅과 갈라져, 잰 숫자가 훅의 행동을 안 말해준다.
if (process.argv.includes("--scan")) {
  runScan(process.argv[process.argv.indexOf("--scan") + 1] || process.cwd());
  process.exit(0);
}

const payload = readPayload();
const command = getCommand(payload);
if (findGitInvocations(command, "commit").length === 0) process.exit(0);

const cwd = normalizeCwd(getCwd(payload)) || process.cwd();
const root = repoRoot(cwd);
if (!root) process.exit(0);

const staged = stagedPaths(root);
if (!staged.length) process.exit(0);

const found = inspect(root, staged);

const lost = lostAnchors(root, staged);
found.reverse = lost.size ? collectReverse(root, staged, lost) : [];

if (found.broken.length || found.codeRefs.length || found.quotes.length || found.reverse.length) {
  deny(formatBroken(found));
}
if (found.legacy.length || found.commands.length) {
  addContext(formatSoft(found), "PreToolUse");
}
process.exit(0);

// ── 검사 진입 ─────────────────────────────────────────────────────────────────

// 훅과 실측이 함께 쓰는 몸통. 파일 목록을 받아 네 갈래로 나눠 담는다.
function inspect(root, files) {
  const found = { broken: [], legacy: [], codeRefs: [], commands: [], quotes: [], reverse: [] };
  for (const rel of files) {
    const abs = path.join(root, rel);
    let src;
    try {
      src = fs.readFileSync(abs, "utf8");
    } catch {
      continue; // 삭제된 파일 등 — 볼 것이 없다
    }
    const ext = path.extname(rel).toLowerCase();
    if (ext === ".md") {
      collectBrokenAnchors(rel, abs, src, found.broken);
      collectLegacyRefs(root, rel, abs, src, found.legacy);
      collectMissingCommands(root, rel, src, found.commands);
      collectFenceQuotes(rel, abs, src, found.quotes);
      continue;
    }
    // 코드 파일에는 앵커 링크 검사를 돌리지 않는다. 세 레포 전수에서 코드 안의
    // `[글자](경로.md#앵커)`는 전부 픽스처 문자열이거나 꼴을 설명하는 주석이었고
    // (verify-hook-policies.mjs는 **일부러 깨진** 앵커를 문자열로 들고 있다), 차단으로 걸면
    // AC 자신의 검증 스크립트가 커밋되지 않는다.
    if (CODE_EXTENSIONS.has(ext)) {
      collectCodeSectionRefs(root, rel, abs, src, found.codeRefs);
      collectLegacyRefs(root, rel, abs, src, found.legacy);
    }
  }
  return found;
}

// ── 수집 ──────────────────────────────────────────────────────────────────────

function collectBrokenAnchors(rel, abs, src, out) {
  for (const m of matchesOutsideCode(src, ANCHOR_LINK)) {
    const [, text, href, rawAnchor] = m.match;
    // 외부 URL은 대상이 이 레포에 없는 것이 정상이다. 안 거르면 GitHub·공식문서의 `.md#앵커`
    // 링크를 로컬 파일로 착각해 "대상 파일이 없습니다"로 차단한다 — 전수 실측에서 backlog가
    // 그 이유로 세 파일에서 막혀 있었다(네이버 로그인 문서·css-modules·dnd 예제 링크).
    if (/^[a-z][\w+.-]*:\/\//i.test(href) || href.startsWith("//")) continue;
    const target = path.resolve(path.dirname(abs), href);
    if (!isFile(target)) {
      out.push({ rel, line: m.line, target, text, href, anchor: rawAnchor, why: "대상 파일이 없습니다", near: [] });
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
      target,
      text,
      href,
      anchor: rawAnchor,
      why: "대상 파일에 그 절이 없습니다",
      near: nearest(decodeAnchor(rawAnchor), exact),
    });
  }
}

function collectLegacyRefs(root, rel, abs, src, out) {
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
    // 같은 레포 안에서 풀리는 경로만 본다. 안 풀리는 경로는 앵커 링크로 바꿀 수 없어
    // (다른 레포를 가리키거나 이름만 부른 것) 알려봐야 할 수 있는 일이 없다.
    const target = resolveDoc(root, abs, href);
    if (!target) continue;
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
      target,
      section,
      leaf,
      href,
      suggestion: full ? `[${leaf}](${href}#${slug(full)})` : null,
    });
  }
}

// 코드가 문자열로 들고 있는 절 인용. 문서 이름이 레포의 md 하나로 유일하게 풀릴 때만 본다.
function collectCodeSectionRefs(root, rel, abs, src, out) {
  for (const m of matchesOutsideCode(src, CODE_SECTION_REF, { fences: false })) {
    const [, name, skill, section] = m.match;
    const target = resolveDoc(root, abs, skill ? `${name} SKILL` : name);
    if (!target) continue; // 이름이 문서로 안 풀리면 인용이 아니다
    const { loose } = anchorsOf(target);
    if (sectionResolves(section, loose)) continue;
    out.push({
      rel,
      line: m.line,
      target,
      doc: skill ? `${name} SKILL` : name,
      section,
      href: path.relative(root, target).split(path.sep).join("/"),
      near: nearest(section, loose),
    });
  }
}

// 본문이 호명하는 슬래시 커맨드가 어느 커맨드·스킬로도 안 풀리는 자리.
function collectMissingCommands(root, rel, src, out) {
  const known = knownCommands(root);
  for (const m of matchesOutsideCode(src, SLASH_COMMAND)) {
    const name = m.match[1];
    if (!name || known.has(name)) continue;
    // `plugin:skill` 꼴은 앞마디만으로도 인정한다 — 플러그인 스킬은 이 기기 밖에 산다.
    if (name.includes(":") && known.has(name.split(":")[0])) continue;
    out.push({ rel, line: m.line, name });
  }
}

// ── 역방향 ────────────────────────────────────────────────────────────────────

// 위 검사들은 전부 **나가는** 링크만 본다 — 스테이지된 파일이 남을 가리킬 때만 대조한다.
// 헤딩을 개명한 파일만 스테이지에 올라오면 그 파일을 가리키던 쪽은 아무도 안 보므로, 인용이
// 끊기는 경로 절반이 검사 밖에 있었다. 가리켜지는 쪽 편집자는 자기를 누가 부르는지 모른다.
//
// **발동을 좁히는 것이 이 검사의 전부다.** 무조건 레포를 훑으면 기존 미해결이 커밋마다 전부
// 뜬다(2026-09-02 전수 실측: AC 0건·KA 0건·DP 2건). 이번 커밋이 **절을 잃은 md**에 대해,
// 그리고 **그 잃은 절을 부르던 인용**에 대해서만 본다. 나머지는 이 커밋이 깬 것이 아니다.
//
// 세기가 알림이 아니라 차단인 이유: 걸리는 인용은 커밋 직전까지 그 절에 **실제로 닿아
// 있었다**. 옛 「」 표기가 나가는 방향에서 알림인 것은 인용과 강조를 글자로 못 갈라서인데,
// 여기서는 글자가 아니라 이력이 가른다 — 강조 낱말이 하필 옆에 적힌 그 파일의 헤딩으로
// 풀려 있을 수는 없다. 같은 실측에서 「경로에 인접하고 실제로 풀리는」 「」 인용을 세 레포
// 전수로 훑어 전부 진짜 절 참조였고 강조가 0건이었다 — 역방향이 볼 모집단이 그것이다.
//
// 전수를 훑는 비용은 node 기동을 포함해 0.2초대다(2026-09-02, 레포별 3회 반복 측정).
// 커밋 시점에 얹을 수 있는 값이라, 회차 스크립트로 미루거나(발견이 회차만큼 늦다)
// 역인덱스를 캐시하는(캐시가 낡으면 조용히 틀린다) 대가를 질 이유가 없다.
function lostAnchors(root, staged) {
  const lost = new Map();
  for (const rel of staged) {
    if (path.extname(rel).toLowerCase() !== ".md") continue;
    const before = git(["show", `HEAD:${rel}`], root);
    if (!before) continue; // 새 파일이거나 첫 커밋 — 잃을 절이 없다
    const now = anchorsOf(path.join(root, rel)).loose;
    const gone = new Set();
    for (const key of anchorsFromSource(before).loose.keys()) if (!now.has(key)) gone.add(key);
    if (gone.size) lost.set(path.join(root, rel), gone);
  }
  return lost;
}

// 레포 전체를 **나가는 방향과 같은 수집 함수로** 훑고, 잃은 절을 부르던 것만 남긴다.
// 역인덱스를 따로 짜지 않는 이유가 이것이다 — 갈라지면 역방향이 순방향과 다른 판정을 한다.
function collectReverse(root, staged, lost) {
  const skip = new Set(staged); // 스테이지된 파일은 나가는 방향이 이미 봤다
  const files = (git(["ls-files"], root) || "").split("\n").filter((p) => {
    const ext = path.extname(p).toLowerCase();
    return (ext === ".md" || CODE_EXTENSIONS.has(ext)) && !skip.has(p);
  });
  const found = inspect(root, files);
  // 별칭 규칙은 닿는지 볼 때와 같은 것을 쓴다 — 앞머리로 부르던 인용이 역방향에서만 안 잡히면
  // 개명 알림이 부르는 방식에 따라 갈린다. `Set`도 `Map`도 `has`라 그대로 넘긴다.
  const brokenByRename = (it, section) => {
    const gone = lost.get(it.target);
    return gone ? sectionResolves(section, gone) : false;
  };
  const hits = [];
  for (const it of found.broken) {
    if (brokenByRename(it, decodeAnchor(it.anchor))) hits.push({ ...it, quote: `[${it.text}](${it.href}#${it.anchor})` });
  }
  for (const it of found.codeRefs) {
    if (brokenByRename(it, it.section)) hits.push({ ...it, quote: `${it.doc} '${it.section}'` });
  }
  for (const it of found.legacy) {
    // 알림 쪽 목록은 풀린 인용까지 담고 있다. 안 풀린 것(`suggestion` 없음)만 역방향 대상이다.
    if (!it.suggestion && brokenByRename(it, it.leaf)) hits.push({ ...it, quote: `${it.href} 「${it.section}」` });
  }
  return hits;
}

// ── 대상 찾기 ─────────────────────────────────────────────────────────────────

// 코드·주석은 문서를 경로가 아니라 **이름**으로 부른다(`content-format`, `exam SKILL`).
// 이름에서 파일로 가는 길이 없으면 이 방향은 검사할 것이 없으므로, 레포의 추적되는 md
// 전수로 색인을 만들어 되돌린다. 같은 이름이 둘 이상으로 풀리면 **어느 쪽인지 글자로 못
// 가르므로 등록하지 않는다** — 찍어서 차단하면 오탐 하나가 무관한 세션을 통째로 세운다.
function docIndex(root) {
  if (docIndexCache && docIndexCache.root === root) return docIndexCache.byName;
  const byName = new Map();
  const bump = (key, rel) => {
    if (!key) return;
    const hit = byName.get(key);
    if (hit === undefined) byName.set(key, rel);
    else if (hit !== rel) byName.set(key, null); // 중복 — 못 가른다
  };
  for (const rel of (git(["ls-files", "*.md"], root) || "").split("\n").filter(Boolean)) {
    const base = path.posix.basename(rel);
    const dir = path.posix.basename(path.posix.dirname(rel));
    if (/^skill\.md$/i.test(base)) bump(`${dir} SKILL`, rel);
    else bump(base.replace(/\.md$/i, ""), rel);
    // 경로 꼬리로도 등록한다 — `writing-guide/tone.md`처럼 레포 루트도 상대 위치도 아닌
    // 중간 마디로 부르는 자리가 실제로 있다(AC `check-md-code-labels.mjs` 주석).
    const seg = rel.split("/");
    for (let i = seg.length - 1; i >= 0; i--) bump(seg.slice(i).join("/"), rel);
  }
  docIndexCache = { root, byName };
  return byName;
}

// 참조 문자열 하나를 레포 안의 실제 md 파일로 푼다. 상대 경로 → 색인 순으로 본다.
function resolveDoc(root, fromAbs, ref) {
  if (ref.endsWith(".md")) {
    const relative = path.resolve(path.dirname(fromAbs), ref);
    if (isFile(relative)) return relative;
  }
  const hit = docIndex(root).get(ref.replace(/^\.?\//, ""));
  if (!hit) return null;
  const abs = path.join(root, hit);
  return isFile(abs) ? abs : null;
}

// 인용된 절 이름이 대상 문서에 닿는가. 전체 이름 → 부연을 뗀 앞머리 순으로 본다 —
// 코드가 부르는 이름에는 문서에 없는 꼬리가 붙는다(`곁가지 분리 — <name>.sub.md`).
function sectionResolves(section, loose) {
  const cleaned = clean(section);
  return loose.has(slug(cleaned)) || loose.has(slug(cutTail(cleaned))) || loose.has(slug(headOf(cleaned)));
}

// 이 기기에서 `/이름`으로 부를 수 있는 것 — 레포·전역의 커맨드 파일과 스킬 폴더.
// 빌트인 커맨드(`/compact` 등)와 플러그인 스킬은 여기에 안 잡히므로 이 검사는 차단이 아니라
// 알림이다. 목록을 손으로 채우면 하네스가 커맨드를 늘릴 때마다 조용히 낡는다.
function knownCommands(root) {
  if (commandCache && commandCache.root === root) return commandCache.names;
  const names = new Set(BUILTIN_COMMANDS);
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const roots = [root, ...(home ? [path.join(home, ".claude"), path.join(home, ".codex")] : [])];
  for (const base of roots) {
    for (const dir of ["commands", ".claude/commands", ".agents/commands"]) {
      for (const f of listDir(path.join(base, ...dir.split("/")))) {
        if (f.toLowerCase().endsWith(".md")) names.add(f.replace(/\.md$/i, ""));
      }
    }
    for (const dir of ["skills", ".claude/skills", ".agents/skills", "local/skills", "deploy/skills"]) {
      for (const f of listDir(path.join(base, ...dir.split("/")))) names.add(f);
    }
  }
  commandCache = { root, names };
  return names;
}

function listDir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

// `경로` + 「절」 + 콜론 다음 줄의 코드펜스가 그 파일에서 그대로 옮겨온 것인지 본다.
// 빈 줄과 펜스 자체는 세지 않고, 남은 줄이 하나라도 대상에 없으면 낡은 인용으로 본다.
function collectFenceQuotes(rel, abs, src, out) {
  const lines = src.split(/\r?\n/);
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const lead = FENCE_QUOTE_LEAD.exec(lines[i]);
    if (!lead) continue;
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === "") j++;
    if (j >= lines.length || !/^\s*(```|~~~)/.test(lines[j])) continue;
    const target = path.resolve(path.dirname(abs), lead[1]);
    if (!isFile(target)) continue; // 경로 자체가 없는 것은 앵커 검사 몫이다
    const quoted = [];
    for (let k = j + 1; k < lines.length && !/^\s*(```|~~~)/.test(lines[k]); k++) {
      if (lines[k].trim()) quoted.push(lines[k].trim());
    }
    if (!quoted.length) continue;
    let body = "";
    try {
      body = fs.readFileSync(target, "utf8");
    } catch {
      continue;
    }
    const missing = quoted.filter((q) => !body.includes(q));
    if (!missing.length) continue;
    out.push({ rel, line: i + 1, href: lead[1], section: lead[2], total: quoted.length, missing });
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
    src = "";
  }
  const result = anchorsFromSource(src);
  anchorCache.set(file, result);
  return result;
}

// 디스크가 아니라 **내용**에서 앵커를 뽑는 갈래. 역방향 검사가 커밋 전 판본(`git show`)의
// 앵커를 같은 기준으로 세야 해서 갈라 뒀다 — 기준이 갈리면 "잃은 절"이 헛집힌다.
function anchorsFromSource(src) {
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
  for (const raw of raws) add(loose, slug(dropMarker(clean(raw))), clean(raw));
  return { exact, loose };
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

// 헤딩 끝에 붙은 마커(`## 진입 실측 [CRITICAL]`). 앞머리 괄호와 같은 이유로 뗀다 —
// 마커는 세기를 표시할 뿐 이름의 일부가 아니라, 부르는 쪽은 이름만 부른다.
function dropMarker(text) {
  return text.replace(/\s*\[[^\]]*\]\s*$/u, "").trim();
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

function formatBroken(found) {
  const lines = ["✘ 가리킨 절이 대상 파일에 없습니다.", ""];
  for (const it of found.broken) {
    lines.push(`  ${it.rel}:${it.line}`);
    lines.push(`    [${it.text}](${it.href}#${it.anchor})`);
    lines.push(`      ${it.why}`);
    for (const n of it.near) lines.push(`      이름이 비슷한 절: 「${n}」  ← 개명된 것 같습니다`);
  }
  for (const it of found.codeRefs) {
    lines.push(`  ${it.rel}:${it.line}`);
    lines.push(`    ${it.doc} '${it.section}'  → ${it.href}`);
    lines.push(`      대상 문서에 그 절이 없습니다`);
    for (const n of it.near) lines.push(`      이름이 비슷한 절: 「${n}」  ← 개명된 것 같습니다`);
  }
  for (const it of found.quotes) {
    lines.push(`  ${it.rel}:${it.line}`);
    lines.push(`    \`${it.href}\` 「${it.section}」 뒤 코드블록`);
    lines.push(`      인용한 ${it.total}줄 중 ${it.missing.length}줄이 그 파일에 없습니다`);
    for (const q of it.missing.slice(0, 3)) lines.push(`        ${q}`);
  }
  for (const it of found.reverse) {
    lines.push(`  ${it.rel}:${it.line}  ← 이 커밋이 개명한 절을 가리키고 있습니다`);
    lines.push(`    ${it.quote}`);
    for (const n of it.near ?? []) lines.push(`      이름이 비슷한 절: 「${n}」  ← 새 이름인 것 같습니다`);
  }
  lines.push(
    "",
    "  → 대상 파일을 열어 실제 절 이름을 확인하고 인용을 맞추세요.",
    "  → 절이 통째로 사라졌으면, 인용만 고치지 말고 가리키던 문장 자체가",
    "     아직 유효한지 보세요. 근거가 없어졌을 수 있습니다.",
  );
  if (found.reverse.length) {
    lines.push("  → `←` 표시가 붙은 파일은 이 커밋에 없습니다. 고친 뒤 함께 스테이지하세요.");
  }
  const soft = found.legacy.length + found.commands.length;
  if (soft) {
    lines.push("", `  (알림 대상도 ${soft}건 있습니다. 그건 차단 대상이 아닙니다.)`);
  }
  return lines.join("\n");
}

function formatSoft(found) {
  const lines = [];
  if (found.legacy.length) {
    lines.push(
      `[인용 표기] 이 커밋이 건드린 파일에 옛 표기로 다른 문서의 절을 가리키는 자리가 ${found.legacy.length}건 있습니다.`,
      "",
    );
    for (const it of found.legacy) {
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
  }
  if (found.commands.length) {
    if (lines.length) lines.push("");
    lines.push(
      `[커맨드 호명] 본문이 부르는 슬래시 커맨드 ${found.commands.length}건이 이 기기의 커맨드·스킬 어디에도 없습니다.`,
      "",
    );
    for (const it of found.commands) lines.push(`  ${it.rel}:${it.line}  /${it.name}`);
    lines.push(
      "",
      "  · 없어진 커맨드를 안내하고 있으면 그 문장 자체가 못 쓰는 절차입니다 — 지우거나",
      "    지금 실제로 부르는 이름으로 고치세요.",
      "  · 빌트인·플러그인 커맨드라 이 기기에서 안 세어질 수도 있습니다. 그러면 그대로 두세요.",
      "  · 지금 안 고쳐도 커밋은 통과합니다.",
    );
  }
  return lines.join("\n");
}

// ── git ───────────────────────────────────────────────────────────────────────

function repoRoot(dir) {
  return git(["rev-parse", "--show-toplevel"], dir);
}

function stagedPaths(dir) {
  const out = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"], dir);
  if (!out) return [];
  return out.split("\n").filter((p) => {
    const ext = path.extname(p).toLowerCase();
    return ext === ".md" || CODE_EXTENSIONS.has(ext);
  });
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

// 전수 실측: 레포의 추적되는 md·코드 전부를 훅과 같은 수집 함수로 돌려 갈래별 건수를 낸다.
function runScan(dir) {
  const scanRoot = repoRoot(dir);
  if (!scanRoot) {
    console.error(`git 레포가 아닙니다: ${dir}`);
    process.exitCode = 1;
    return;
  }
  const files = (git(["ls-files"], scanRoot) || "").split("\n").filter((p) => {
    const ext = path.extname(p).toLowerCase();
    return ext === ".md" || CODE_EXTENSIONS.has(ext);
  });
  const found = inspect(scanRoot, files);
  console.log(`${scanRoot}  (파일 ${files.length}개)`);
  for (const [label, items, render] of [
    ["[차단] 앵커 링크", found.broken, (it) => `${it.rel}:${it.line}  [${it.text}](${it.href}#${it.anchor}) — ${it.why}`],
    ["[차단] 코드의 절 인용", found.codeRefs, (it) => `${it.rel}:${it.line}  ${it.doc} '${it.section}' → ${it.href}`],
    [
      "[차단] 코드블록 인용문",
      found.quotes,
      (it) => `${it.rel}:${it.line}  \`${it.href}\` 「${it.section}」 — ${it.missing.length}/${it.total}줄 없음`,
    ],
    ["[알림] 옛 「」 표기", found.legacy, (it) => `${it.rel}:${it.line}  ${it.href} 「${it.section}」${it.suggestion ? "" : "  ← 미해결"}`],
    ["[알림] 커맨드 호명", found.commands, (it) => `${it.rel}:${it.line}  /${it.name}`],
  ]) {
    console.log(`\n${label}: ${items.length}건`);
    for (const it of items) console.log(`  ${render(it)}`);
  }
}

// 코드블록 밖에서만 정규식을 돌리고 줄번호를 함께 낸다. 코드블록 안의 예시 링크까지 보면
// 훅·문서가 자기 예시 때문에 걸린다.
//
// `fences: false`는 코드 파일용이다. `.mjs`·`.mts`에는 마크다운 펜스가 없고, 대신 훅이
// 사용자 메시지로 찍는 템플릿 문자열 안에 ```가 들어 있을 수 있다 — 그걸 펜스로 세면
// 그 줄 이후가 통째로 안 읽혀 검사가 조용히 꺼진다.
function* matchesOutsideCode(src, re, { fences = true } = {}) {
  const lines = src.split(/\r?\n/);
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fences && /^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    re.lastIndex = 0;
    for (const match of line.matchAll(re)) yield { match, line: i + 1 };
  }
}
