#!/usr/bin/env node
// 전역 git pre-commit 훅. 프롬프트·스킬 md가 「주제의 축척은 크기가 정한다」의 선을 넘었는지
// 커밋마다 전수로 재서 경고한다(차단하지 않는다).
// ~/.ai-contexts/에 그대로 복사돼 어느 레포에서든 돌므로 AC의 다른 모듈을 import하지 않는다.
//
// 왜 전수인가: 크기는 이번 세션이 무엇을 건드렸는지와 무관한 사실이라, 고친 파일만 보면 아무도
// 안 고치는 큰 파일이 영영 안 걸린다. 실제로 PP `all-paragraphs.md`는 세 세션이 같은 폴더의
// 이웃 파일을 쪼개고 지나가는 동안 한 번도 안 걸렸다.
//
// 왜 선이 둘인가: 같은 크기여도 여러 곳에서 열리는 문서가 비싸다(`document-diet.md` 「문서의
// 비용은 크기가 아니라 크기 × 불려가는 자리 수」). 그래서 닿는 곳이 많으면 더 낮은 선을 쓴다.
//
// 왜 「닿는 곳」을 재귀로 세는가: A가 B만 가리켜도 그 A가 넷에서 열리면 B도 결국 네 경로에서
// 열린다. 직접 참조만 세면 그 넷이 안 보인다. 최상단만 세는 방식은 못 쓴다 — 문서끼리 서로
// 가리키는 것이 정상이라(예: scw `specialized/workflow.md` ↔ `SKILL.md`) 서로 물린 쌍은
// 양쪽 다 「불려지는 쪽」이 되어 최상단이 0개가 된다.
//
// 무엇을 출력하는가: 기준선에 없던 파일이 새로 선을 넘거나, 등재된 파일이 더 커졌을 때만 낸다.
// 이미 등재된 초과분은 조용하다 — 첫날 수십 건을 매 커밋 쏟으면 그 경고를 안 보게 되고, 그러면
// 새로 넘는 파일도 같이 묻힌다.
//
// 설정은 어디 사는가: 검사받는 레포가 아니라 private 레포 `backlog` 한 곳이다. 등재 목록도
// 제외 목록도 개인 도구의 상태라, 남이 클론할 수 있는 레포에 두면 그 사람 클론에 남의 설정이
// 얹힌다. **backlog가 없는 기기에서는 통째로 no-op 한다** — 설정 없이 도는 것은 이 검사가
// 아니라 아무 레포에나 경고를 뿌리는 다른 물건이다. (같은 판단을 surface-backlog.mjs가 먼저 했다.)
//
// 왜 「이미 알렸다」를 따로 기억하는가: 등재 목록은 사람이 `--write-baseline`을 부를 때만 바뀌는데
// 검사는 커밋마다 다시 재므로, 한 번 커진 파일은 사람이 등재를 갱신하기 전까지 **똑같은 숫자 한
// 줄을 매 커밋 영원히** 찍는다(실측: AC step-4.md 한 줄이 24커밋 연속). 그 반복은 새로 넘는 파일을
// 묻는다 — 첫날 수십 건을 쏟지 않으려고 등재를 둔 것과 같은 이유로 막아야 한다.
// 기억을 등재 목록에 합치지 않고 `~/.ai-contexts/`에 따로 두는 이유: 등재는 사람이 관리하는
// 다이어트 대상 목록이고 이 기억은 기계 상태다. 합치면 커밋마다 도는 검사가 backlog에 사용자가
// 낸 적 없는 diff를 쌓게 되고(그 레포는 커밋마다 자동 push한다), 그건 아래 settleBaseline 주석이
// 이미 거부한 설계다. 기기별로 따로 기억하고, 파일이 없어지면 한 번 더 찍고 마는 것이 전부다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BACKLOG_ROOT = path.join(os.homedir(), "WebstormProjects", "main", "backlog");
const CONFIG_FILE = path.join(BACKLOG_ROOT, "meta", "md-size.json");
// 「이 크기는 이미 알렸다」는 기계 상태. 기기별이고 커밋되지 않는다 — 그래서 등재 목록과 다른 곳에 산다.
const SEEN_FILE = path.join(hookHome(), "md-size-seen.json");

// 선. 닿는 곳이 FANOUT 이상이면 낮은 선(BUSY), 아니면 높은 선(LONE)을 쓴다.
const LONE_LIMIT = 25000;
const BUSY_LIMIT = 20000;
const FANOUT = 4;

// 한 레포가 무너져도 출력이 화면을 덮지 않게 자른다.
const MAX_REPORTS = 20;

// 검사 대상 = 프롬프트·스킬 md. 지식 글·백로그 항목은 뺀다 — 그쪽은 한 주제를 길게 쓰는 것이
// 정상이라 같은 선을 대면 전부 걸리고, 그러면 이 검사가 통째로 무시된다.
//
// `local/` 아래에 산출물이 함께 사는 레포가 있어(PP `local/contexts/recruitment/applications/` =
// 제출한 자소서) 폴더 이름만으로는 못 가른다. 그런 자리는 설정의 `exclude`에 경로 접두사로
// 적는다 — 어느 폴더가 산출물인지는 사람만 아는 사실이라 검사가 못 알아낸다.
function inScope(rel, exclude) {
  if (!rel.endsWith(".md")) return false;
  if (!(rel === "CLAUDE.md" || rel.startsWith("local/") || rel.startsWith("deploy/"))) return false;
  return !exclude.some((prefix) => rel === prefix || rel.startsWith(prefix));
}

// 스캔 한 벌. 검사·등재·해제가 같은 계산을 쓴다 — 두 벌이 되면 선 해석이 갈린다.
function measure(config) {
  const entries = indexedMd(config.exclude); // [{ sha, rel }]
  const sizes = objectSizes(entries.map((e) => e.sha));
  const bodies = objectBodies(entries.map((e) => e.sha));
  const files = entries.map((e, i) => ({ rel: e.rel, size: sizes[i], body: bodies[i] }));

  const reach = ancestorCounts(files);
  const limitFor = (rel) => (reach.get(rel) >= FANOUT ? BUSY_LIMIT : LONE_LIMIT);
  return { files, reach, limitFor, over: files.filter((f) => f.size >= limitFor(f.rel)) };
}

// 선 아래로 내려온 등재분. 파일이 지워졌을 때도 걷을 자리다.
function settledOf(baseline, files, limitFor) {
  return Object.keys(baseline).filter((rel) => {
    const f = files.find((x) => x.rel === rel);
    return !f || f.size < limitFor(rel);
  });
}

function main() {
  const repo = repoName();
  if (!repo) return;

  const config = readConfig(repo);
  if (!config) return; // backlog가 없거나 파싱이 깨졌다 — 조용히 통과한다

  const { files, reach, limitFor, over } = measure(config);
  if (!files.length) return;

  const baseline = config.files;
  const seenWhole = readSeen();
  const seen = seenOf(seenWhole, repo);
  // 알린 적 없거나, 알린 크기보다 더 커졌을 때만 낸다. 같은 크기 그대로면 새 사실이 아니다.
  const untold = (f) => seen.notified[f.rel] === undefined || f.size > seen.notified[f.rel];

  // 미등재 = 선을 넘었는데 기준선에 없는 것. 레포 등재가 통째로 없을 때도 같은 집합이다.
  const unregistered = over.filter((f) => !baseline || baseline[f.rel] === undefined);
  const fresh = unregistered.filter(untold);
  const grown = baseline
    ? over
        .filter((f) => baseline[f.rel] !== undefined && f.size > baseline[f.rel] && untold(f))
        .map((f) => ({ ...f, was: baseline[f.rel] }))
    : [];
  // 선 아래로 내려온 등재분은 기준선에서 걷을 자리다. 안 걷으면 다시 커져도 「등재분」으로 조용하다.
  const settledAll = baseline ? settledOf(baseline, files, limitFor) : [];
  const settled = settledAll.filter((rel) => seen.settled[rel] !== baseline[rel]);

  saveSeen(seenWhole, repo, {
    // `over`에서 다시 만들므로 선 아래로 내려온 파일의 기억은 저절로 걷힌다.
    notified: Object.fromEntries(over.map((f) => [f.rel, Math.max(f.size, seen.notified[f.rel] ?? 0)])),
    settled: Object.fromEntries(settledAll.map((rel) => [rel, baseline[rel]])),
  });

  if (fresh.length) {
    report(
      baseline
        ? "[문서 크기] 선을 새로 넘은 프롬프트·스킬 md:"
        : `[문서 크기] 선을 넘은 md가 있는데 이 레포("${repo}")의 등재가 ${CONFIG_FILE}에 없다:`,
      fresh.map((f) => `${f.rel} — ${f.size}B (닿는 곳 ${reach.get(f.rel)}, 선 ${limitFor(f.rel)}B)`),
      baseline
        ? [
            "지금 하던 작업을 여기서 멈추지 않는다. 하던 것을 마무리한 뒤 사용자에게 이 파일과 크기를 알린다.",
            "무엇을 줄일지는 줄일 후보를 갈래 가리지 않고 전량 모아 크기와 잃는 것을 함께 낸 뒤 사용자와 정한다.",
            "판정 기준과 후보 갈래는 deploy/skills/scw/specialized/document-diet.md에 있다.",
          ]
        : [
            `기존 초과분을 등재해 조용히 시키려면: node "${path.join(hookHome(), "check-md-size.mjs")}" --write-baseline`,
            "등재 목록이 곧 다이어트 대상 목록이다 — 지우는 파일이 아니라 이어서 볼 목록이다.",
          ],
    );
  } else if (unregistered.length) {
    // 이미 알린 미등재분까지 통째로 침묵시키면, 등재도 안 된 초과 파일이 어느 목록에도 안 남는다.
    // 블록은 한 번만 내고, 그 다음부터는 「아직 등재를 안 했다」만 한 줄로 남긴다.
    console.log(
      `[문서 크기] 미등재 초과 ${unregistered.length}건 (알림 완료) — 등재: ` +
        `node "${path.join(hookHome(), "check-md-size.mjs")}" --write-baseline\n`,
    );
  }

  if (grown.length) {
    report(
      "[문서 크기] 이미 선을 넘은 md가 더 커졌다:",
      grown.map((f) => `${f.rel} — ${f.was}B → ${f.size}B (선 ${limitFor(f.rel)}B)`),
      [
        "등재된 초과분에 더 얹는 중이다. 하던 작업은 마무리하고, 끝난 뒤 사용자에게 알린다.",
        "이 파일을 줄이기로 했다면 기준선 등재를 함께 걷는다.",
      ],
    );
  }

  if (settled.length) {
    report(
      "[문서 크기] 기준선에 등재된 파일이 선 아래로 내려왔다 — 등재를 걷을 자리다:",
      settled,
      [
        `걷으려면: node "${path.join(hookHome(), "check-md-size.mjs")}" --settle`,
        "남겨두면 다시 커져도 「등재분」으로 조용히 통과한다.",
      ],
    );
  }
}

function report(heading, lines, advice) {
  console.log(heading);
  for (const line of lines.slice(0, MAX_REPORTS)) console.log(`  ${line}`);
  if (lines.length > MAX_REPORTS) console.log(`  ... 그 밖에 ${lines.length - MAX_REPORTS}건 더`);
  for (const line of advice) console.log(line);
  console.log("");
}

// --- 참조 그래프 ---------------------------------------------------------

// `](경로.md)` 형태의 링크와, 백틱·따옴표·공백에 둘러싸인 평문 경로를 함께 본다.
// 확장자 없이 산문으로 부르는 참조(「bench-operations 「…」가 정한다」)는 안 잡힌다 — 닿는 곳이
// 실제보다 **적게** 세어지므로 놓치는 쪽이고, 없는 참조를 만들어내지는 않는다.
const LINK_RE = /\]\(([^)\s]+\.md(?:#[^)\s]*)?)\)/g;
const PATH_RE = /[`'"(\s]((?:\.{1,2}\/)?[A-Za-z0-9_\-./ㄱ-힣]+\.md)(?=[`'")\s,.:]|$)/g;

function ancestorCounts(files) {
  const set = new Set(files.map((f) => f.rel));
  const byBase = new Map();
  for (const f of files) {
    const b = path.posix.basename(f.rel);
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b).push(f.rel);
  }

  const resolve = (from, ref) => {
    const target = ref.split("#")[0].trim();
    if (!target.endsWith(".md")) return null;
    const rel = path.posix.normalize(path.posix.join(path.posix.dirname(from), target)).replace(/^\.\//, "");
    if (set.has(rel)) return rel;
    const abs = path.posix.normalize(target).replace(/^\.\//, "");
    if (set.has(abs)) return abs;
    // 파일명만 적힌 참조는 그 이름이 레포에서 유일할 때만 해석한다. SKILL.md처럼 여럿이면
    // 아무 데나 잇는 것이 안 세는 것보다 나쁘다.
    const cands = byBase.get(path.posix.basename(target));
    if (target.indexOf("/") === -1 && cands && cands.length === 1) return cands[0];
    return null;
  };

  const parents = new Map(files.map((f) => [f.rel, new Set()]));
  for (const f of files) {
    for (const re of [LINK_RE, PATH_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(f.body))) {
        const t = resolve(f.rel, m[1]);
        if (t && t !== f.rel) parents.get(t).add(f.rel);
      }
    }
  }

  // 역방향 도달 — 서로 물고 도는 참조가 있어도 멈추도록 방문 표시를 둔다.
  const counts = new Map();
  for (const f of files) {
    const seen = new Set();
    const stack = [...parents.get(f.rel)];
    while (stack.length) {
      const n = stack.pop();
      if (n === f.rel || seen.has(n)) continue;
      seen.add(n);
      for (const p of parents.get(n)) if (!seen.has(p)) stack.push(p);
    }
    counts.set(f.rel, seen.size);
  }
  return counts;
}

// --- git ------------------------------------------------------------------

// 워크트리는 폴더명이 원본과 달라 `--show-toplevel`로는 같은 레포로 안 갈린다.
// `--git-common-dir`은 링크된 워크트리에서도 원본의 `.git`을 가리키므로 그것으로 이름을 구한다
// (policy-exempt-repos.mjs가 같은 이유로 같은 방식을 쓴다).
function repoName() {
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      encoding: "utf8",
    }).trim();
    return common.replace(/\\/g, "/").replace(/\/\.git\/?$/, "").split("/").pop() || null;
  } catch {
    return null;
  }
}

function hookHome() {
  return path.join(process.env.HOME || process.env.USERPROFILE || "~", ".ai-contexts");
}

// 인덱스(= 이번 커밋 이후의 내용)를 본다. 작업 트리를 읽으면 아직 스테이징 안 한 편집까지 세어,
// 커밋되지 않을 크기로 경고가 난다.
function indexedMd(exclude) {
  const out = execFileSync("git", ["ls-files", "-s", "-z"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  });
  const entries = [];
  for (const line of out.split("\0")) {
    if (!line) continue;
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    const rel = line.slice(tab + 1);
    if (!inScope(rel, exclude)) continue;
    entries.push({ sha: line.slice(0, tab).split(" ")[1], rel });
  }
  return entries;
}

function objectSizes(shas) {
  if (!shas.length) return [];
  const out = execFileSync("git", ["cat-file", "--batch-check=%(objectsize)"], {
    input: shas.join("\n") + "\n",
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 16,
  });
  return out.trim().split("\n").map(Number);
}

// `git cat-file --batch` 출력은 `<sha> <type> <size>\n<내용>\n`의 연속이라 바이트로 잘라 읽는다.
function objectBodies(shas) {
  if (!shas.length) return [];
  const buf = execFileSync("git", ["cat-file", "--batch"], {
    input: shas.join("\n") + "\n",
    maxBuffer: 1024 * 1024 * 256,
  });
  const bodies = [];
  let at = 0;
  while (at < buf.length && bodies.length < shas.length) {
    const nl = buf.indexOf(0x0a, at);
    if (nl === -1) break;
    const size = Number(buf.toString("utf8", at, nl).split(" ")[2]);
    const start = nl + 1;
    bodies.push(buf.toString("utf8", start, start + size));
    at = start + size + 1;
  }
  while (bodies.length < shas.length) bodies.push("");
  return bodies;
}

// --- 알림 이력 -------------------------------------------------------------

// 깨졌거나 없으면 빈 것으로 본다. 이력이 없다는 것은 "한 번 더 찍는다"일 뿐이라, 이 파일 때문에
// 검사를 건너뛰거나 커밋을 멈출 이유가 없다.
function readSeen() {
  try {
    const data = JSON.parse(fs.readFileSync(SEEN_FILE, "utf8"));
    return data && typeof data.repos === "object" && data.repos ? data : { repos: {} };
  } catch {
    return { repos: {} };
  }
}

function seenOf(whole, repo) {
  const entry = whole.repos[repo];
  const map = (v) => (v && typeof v === "object" ? v : {});
  return { notified: map(entry?.notified), settled: map(entry?.settled) };
}

// 바뀐 것이 없으면 안 쓴다 — 커밋마다 도는 검사라 같은 내용을 다시 쓰면 디스크만 두드린다.
// 쓰기 실패는 삼킨다. 못 써도 다음 커밋에 한 번 더 찍힐 뿐이고, 그것 때문에 커밋이 막히면 안 된다.
function saveSeen(whole, repo, entry) {
  const next = { ...whole, repos: { ...whole.repos, [repo]: entry } };
  const body = JSON.stringify(next, null, 2) + "\n";
  try {
    if (fs.existsSync(SEEN_FILE) && fs.readFileSync(SEEN_FILE, "utf8") === body) return;
    fs.mkdirSync(path.dirname(SEEN_FILE), { recursive: true });
    fs.writeFileSync(SEEN_FILE, body, "utf8");
  } catch {
    /* 이력을 못 남겼다 = 다음에 한 번 더 알린다 */
  }
}

// --- 기준선 ---------------------------------------------------------------

// 설정 파일 전체를 읽는다. backlog가 없는 기기면 null — 호출부가 조용히 끝낸다.
function readWhole() {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    return data && typeof data.repos === "object" && data.repos ? data : { repos: {} };
  } catch (error) {
    console.log(`[문서 크기] ${CONFIG_FILE} 파싱 실패 — 검사를 건너뛴다: ${error.message}`);
    return null;
  }
}

// `files`가 null이면 이 레포의 등재가 아직 없다는 뜻이고, 반환 자체가 null이면 설정을 못 읽어
// 검사를 건너뛴다는 뜻이다. `exclude`는 등재가 없어도 쓰이므로 두 경우를 갈라 둔다.
function configOf(whole, repo) {
  const entry = whole.repos[repo];
  return {
    files: entry && typeof entry.files === "object" && entry.files ? entry.files : null,
    exclude: Array.isArray(entry?.exclude) ? entry.exclude.filter((x) => typeof x === "string") : [],
  };
}

function readConfig(repo) {
  const whole = readWhole();
  return whole ? configOf(whole, repo) : null;
}

// 등재 추가·해제가 공통으로 필요한 것. 못 열면 사유를 내고 null을 준다.
function openForWrite() {
  const repo = repoName();
  if (!repo) {
    console.error("git 레포가 아니다.");
    process.exitCode = 1;
    return null;
  }
  const whole = readWhole();
  if (!whole) {
    console.error(`설정 파일이 없다: ${CONFIG_FILE}`);
    console.error("backlog 레포가 클론된 기기에서만 등재를 고칠 수 있다.");
    process.exitCode = 1;
    return null;
  }
  return { repo, whole, config: configOf(whole, repo) };
}

function saveWhole(whole) {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(whole, null, 2) + "\n", "utf8");
}

function writeBaseline() {
  const opened = openForWrite();
  if (!opened) return;
  const { repo, whole, config } = opened;
  const { reach, over: unsorted } = measure(config);

  // 큰 것부터가 아니라 「크기 × 닿는 곳」이 큰 것부터 적는다 — 그 순서가 곧 손댈 순서다.
  const over = [...unsorted].sort(
    (a, b) => b.size * Math.max(reach.get(b.rel), 1) - a.size * Math.max(reach.get(a.rel), 1),
  );

  // `exclude`는 사람이 적은 것이라 다시 쓸 때 그대로 들고 간다 — 안 그러면 등재를 갱신할 때마다
  // 산출물 폴더가 검사 대상으로 되살아난다. 다른 레포의 항목도 건드리지 않는다.
  const entry = {};
  if (config.exclude.length) entry.exclude = config.exclude;
  entry.files = {};
  for (const f of over) entry.files[f.rel] = f.size;
  whole.repos[repo] = entry;

  saveWhole(whole);

  console.log(`${CONFIG_FILE}의 "${repo}"에 ${over.length}건 등재했다 (크기 × 닿는 곳 순):`);
  for (const f of over) console.log(`  ${String(f.size).padStart(6)}B x ${reach.get(f.rel)}곳  ${f.rel}`);
}

// 선 아래로 내려온 등재분을 걷는다. 커밋마다 도는 검사가 말없이 고치면 사용자가 낸 적 없는 diff가
// backlog에 쌓이므로(그 레포는 커밋마다 자동 push한다), 자동이 아니라 사람이 부르는 명령으로 둔다.
function settleBaseline() {
  const opened = openForWrite();
  if (!opened) return;
  const { repo, whole, config } = opened;
  if (!config.files) {
    console.log(`${CONFIG_FILE}에 "${repo}"의 등재가 없다 — 걷을 것이 없다.`);
    return;
  }

  const { files, limitFor } = measure(config);
  const settled = settledOf(config.files, files, limitFor);
  if (!settled.length) {
    console.log(`"${repo}"의 등재분 중 선 아래로 내려온 것이 없다 — 그대로 둔다.`);
    return;
  }

  console.log(`${CONFIG_FILE}의 "${repo}"에서 ${settled.length}건을 걷었다:`);
  for (const rel of settled) {
    const f = files.find((x) => x.rel === rel);
    const now = f ? `${f.size}B (선 ${limitFor(rel)}B)` : "검사 대상에 없음 (삭제·이름 변경·제외)";
    console.log(`  ${rel} — 등재 ${config.files[rel]}B → ${now}`);
    delete whole.repos[repo].files[rel];
  }

  saveWhole(whole);
}

try {
  if (process.argv.includes("--write-baseline")) writeBaseline();
  else if (process.argv.includes("--settle")) settleBaseline();
  else main();
} catch (error) {
  console.error(`[문서 크기 훅 내부 오류, 건너뜀] ${error.message}`);
}
// 문서가 큰 것이 사람의 커밋을 막을 일은 아니다 — 검사(main)는 exitCode를 안 세우므로 늘 0이다.
// 사람이 부른 `--write-baseline`·`--settle`이 설정을 못 열었을 때만 그 실패가 그대로 나간다.
process.exit(process.exitCode ?? 0);
