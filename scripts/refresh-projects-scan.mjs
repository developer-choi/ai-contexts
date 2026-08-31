#!/usr/bin/env node
// `/refresh-projects` 회차 시작 점검 — Phase 1(커밋 탐색·짝꿍 드리프트)과 「만료 덤프 정리」의
// 기계 파트를 한 번에 낸다. Phase 2 계획을 짜려면 이 넷이 한 화면에 있어야 한다.
//
// 왜 스크립트인가: 회차마다 AI가 프로젝트 4개에 git을 여러 번 걸어 범위를 조회하고, 해시가
// 아직 조상인지 눈으로 확인하고, coupling.json 그룹마다 변경 파일 목록과 손으로 교집합을 내고,
// 덤프 폴더명 날짜를 오늘과 비교했다. 판정에 LLM 몫이 없다.
//
// 게이트 2는 짝꿍 점검이 존재하는 이유가 그대로 증명한다 — 이 주기 점검은 편집 시점 훅이
// 놓친 것을 메우려고 있다. 그 메우는 쪽이 그룹 하나를 조용히 빠뜨리면 아무도 안 잡는다.
//
// 판단은 안 한다:
//   - orphan 해시를 어디로 복구할지 (직전 최신화 지점 재탐색)
//   - 엔트리가 없는 프로젝트의 초기 해시 (README 마지막 「실내용」 변경 등 커밋 메시지를 읽는 일)
//   - 드리프트 후보가 진짜 드리프트인지 (그룹 note를 읽고 정하는 일)
//   - 만료 덤프를 지울지 (승인은 사용자)
//
// 레지스트리와 덤프 표는 SKILL.md의 표를 그대로 읽는다. 여기에 사본을 두면 프로젝트가 늘 때
// 두 곳을 고쳐야 하고, 한쪽만 고치면 이 점검이 그 프로젝트를 조용히 건너뛴다.
//
// 사용법:
//   node scripts/refresh-projects-scan.mjs --at KA=<워크트리> --at AC=<워크트리> …
//       → Phase 0이 만든 회차 워크트리를 프로젝트별로 지정한다. **이 회차가 도는 곳이 거기다.**
//         안 주면 레지스트리 표의 경로(로컬 체크아웃)를 본다 — 그 체크아웃이 원격보다 뒤처져
//         있으면 다른 기기에서 쌓인 변경이 범위에서 통째로 빠지고, Phase 0이 막으려던 상황이
//         Phase 1에서 그대로 재현된다.
//   node scripts/refresh-projects-scan.mjs --dumps
//       → 만료 덤프만 다시 본다. 「만료 덤프 정리」가 대상 레포를 최신화한 **뒤**에 부른다 —
//         최신화로 새로 들어온 폴더가 회차 앞에서 뜬 목록에는 없기 때문이다.
//   node scripts/refresh-projects-scan.mjs --state <path> --skill <path>

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const argv = process.argv.slice(2);
const optOf = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const DUMPS_ONLY = argv.includes('--dumps');
// `--at <약어>=<경로>` — Phase 0 워크트리. 여러 번 줄 수 있다.
const AT = new Map();
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] !== '--at') continue;
  const [abbr, ...rest] = (argv[i + 1] ?? '').split('=');
  if (abbr && rest.length) AT.set(abbr, rest.join('='));
}

const SKILL = optOf("skill") || join(REPO_ROOT, "local", "skills", "refresh-projects", "SKILL.md");
const STATE = optOf("state") || join(homedir(), "WebstormProjects", "main", "backlog", "refresh-projects", "state.json");

function git(cwd, args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

function expandHome(p) {
  return p.startsWith("~") ? join(homedir(), p.slice(1).replace(/^[/\\]/, "")) : p;
}

// 마크다운 표에서 셀을 뽑는다. 헤더 첫 칸으로 어느 표인지 고른다.
function tableRows(md, firstHeader) {
  const lines = md.split(/\r?\n/);
  const rows = [];
  let inTable = false;
  for (const line of lines) {
    const isRow = line.trim().startsWith("|");
    if (!isRow) {
      inTable = false;
      continue;
    }
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (!inTable) {
      if (cells[0] === firstHeader) inTable = true;
      continue;
    }
    if (/^-{2,}$/.test(cells[0].replace(/\s/g, ""))) continue; // 구분선
    rows.push(cells);
  }
  return rows;
}

const skillMd = readFileSync(SKILL, "utf8");
const unquote = (s) => s.replace(/`/g, "").trim();

// | 약어 | 경로 | Phase 3: Maintain | Phase 4-kq: Deploy |
const registry = tableRows(skillMd, "약어")
  .map(([abbr, path]) => ({ abbr, dir: AT.get(abbr) ?? expandHome(unquote(path)), at: AT.has(abbr) }))
  .filter((p) => p.abbr && p.dir);

// | 대상 | 경로 | 기한 |
const dumps = tableRows(skillMd, "대상").map(([what, path, ttl]) => ({
  what,
  pattern: unquote(path),
  ttl: ttl.trim(),
}));

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
const out = [];

// ── Phase 1: 커밋 탐색 ────────────────────────────────────────────────────────
const active = [];
if (!DUMPS_ONLY) {
out.push("[Phase 1 · 커밋 탐색]");
const noWorktree = registry.filter((p) => !p.at).map((p) => p.abbr);
if (noWorktree.length) {
  out.push(`  ⚠ 회차 워크트리를 안 준 프로젝트: ${noWorktree.join(", ")} — 로컬 체크아웃을 본다.`);
  out.push("    그 체크아웃이 원격보다 뒤처져 있으면 다른 기기 변경이 범위에서 통째로 빠진다(Phase 0이 막으려던 것). `--at <약어>=<워크트리>`로 준다.");
}
for (const { abbr, dir } of registry) {
  if (!existsSync(dir)) {
    out.push(`  ${abbr}: 경로 없음 (${dir})`);
    continue;
  }
  const entry = state[abbr];
  if (!entry) {
    out.push(`  ${abbr}: state.json 엔트리 없음 — 역할별 초기 해시를 정해 넣는다`);
    continue;
  }
  const head = git(dir, ["rev-parse", "HEAD"]);
  // orphan 판정: 실존하면서 현재 브랜치의 조상이어야 유효하다.
  const alive = git(dir, ["cat-file", "-e", `${entry.hash}^{commit}`]) !== null;
  const ancestor = alive && git(dir, ["merge-base", "--is-ancestor", entry.hash, "HEAD"]) !== null;
  if (!ancestor) {
    out.push(`  ${abbr}: orphan 해시 ${entry.hash.slice(0, 8)} (${alive ? "실존하나 조상 아님" : "실존 안 함"}) — 직전 최신화 지점을 재탐색해 복구한다`);
    continue;
  }
  if (entry.hash === head) {
    out.push(`  ${abbr}: 변경 없음 — Phase 3~4 스킵`);
    continue;
  }
  const log = git(dir, ["log", "--first-parent", `${entry.hash}..HEAD`, "--oneline"]) || "";
  const commits = log.split("\n").filter(Boolean);
  const files = git(dir, ["diff", "--name-only", `${entry.hash}..HEAD`]) || "";
  const changed = files.split("\n").filter(Boolean);
  active.push({ abbr, dir, changed });
  out.push(`  ${abbr}: 커밋 ${commits.length}건 · 파일 ${changed.length}개 (${entry.hash.slice(0, 8)}..HEAD)`);
  commits.slice(0, 5).forEach((c) => out.push(`      ${c}`));
  if (commits.length > 5) out.push(`      … 외 ${commits.length - 5}건`);
}
}

// ── 짝꿍 드리프트 ─────────────────────────────────────────────────────────────
// 단순 glob(*, **, ?) → 정규식. 같은 규칙을 편집 시점 훅(deploy/hooks/surface-coupling.mjs)도
// 갖고 있는데, 그쪽은 배포돼 나가는 파일이라 이 스크립트를 import할 수 없다. 두 벌이 갈리지
// 않게 meta/coupling.json에 짝꿍으로 등록해 뒀다.
function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

const drift = [];
for (const { abbr, dir, changed } of active) {
  const couplingPath = join(dir, "meta", "coupling.json");
  if (!existsSync(couplingPath)) continue;
  const { groups = [] } = JSON.parse(readFileSync(couplingPath, "utf8"));
  for (const group of groups) {
    const matched = group.files.filter((f) => {
      const re = globToRegExp(f);
      return changed.some((c) => re.test(c));
    });
    // 전부 움직였으면 같이 간 것이고, 하나도 안 움직였으면 이 범위와 무관하다.
    if (!matched.length || matched.length === group.files.length) continue;
    drift.push({
      abbr,
      name: group.name,
      moved: matched,
      still: group.files.filter((f) => !matched.includes(f)),
      note: group.note,
    });
  }
}

if (!DUMPS_ONLY) {
  out.push("", `[짝꿍 드리프트 후보] ${drift.length}건 — 그룹 note를 읽고 진짜 드리프트인지 정한다(자동 수정 아님)`);
  for (const d of drift) {
    out.push(`  ${d.abbr} · ${d.name}`);
    out.push(`      움직임: ${d.moved.join(", ")}`);
    out.push(`      안 움직임: ${d.still.join(", ")}`);
    // note는 자르지 않는다 — 판정 재료가 바로 이것이고, 잘리는 뒷부분이 대개 「무엇을 함께 고쳐야 하는가」다.
    if (d.note) out.push(`      note: ${d.note}`);
  }
}

// ── 만료 덤프 ─────────────────────────────────────────────────────────────────
// 「폴더명 날짜로부터 1달」류를 읽는다. 표에 없는 단위가 오면 세지 않고 그대로 알린다 —
// 짐작해서 세면 안 지워도 될 것이 목록에 오르고, 사용자는 날짜를 다시 계산하지 않는다.
function ttlDays(ttl) {
  const m = ttl.match(/(\d+)\s*(일|주|달|개월|년)/);
  if (!m) return null;
  const n = Number(m[1]);
  return { 일: n, 주: n * 7, 달: n * 30, 개월: n * 30, 년: n * 365 }[m[2]];
}

out.push("", "[만료 덤프]");
const today = Date.now();
for (const dump of dumps) {
  const days = ttlDays(dump.ttl);
  const base = expandHome(dump.pattern.replace(/\{[^}]*\}\/?$/, "").replace(/\/$/, ""));
  if (days === null) {
    out.push(`  ${dump.what}: 기한 표기를 못 읽음 ("${dump.ttl}") — 손으로 판정한다`);
    continue;
  }
  if (!existsSync(base)) {
    out.push(`  ${dump.what}: 경로 없음 (${base})`);
    continue;
  }
  const expired = [];
  for (const name of readdirSync(base)) {
    if (!statSync(join(base, name)).isDirectory()) continue;
    const d = Date.parse(name);
    if (Number.isNaN(d)) continue; // 날짜 폴더가 아니면 대상이 아니다
    const age = Math.floor((today - d) / 86400000);
    if (age > days) expired.push(`${name} (${age}일)`);
  }
  out.push(
    expired.length
      ? `  ${dump.what}: ${expired.length}건 만료 (${dump.ttl}) — ${expired.join(", ")}`
      : `  ${dump.what}: 만료 0건 (${dump.ttl})`,
  );
}
out.push("  → 승인 없이 지우지 않는다. 오탐이면 다시 조사해야 되살아나는 산출물이다.");

console.log(out.join("\n"));
