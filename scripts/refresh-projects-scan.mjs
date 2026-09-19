#!/usr/bin/env node
// `/refresh-projects` 회차 시작 점검 — Phase 1(커밋 탐색·짝꿍 드리프트)의
// 기계 파트를 낸다. Phase 2 계획을 짜려면 이것들이 한 화면에 있어야 한다.
//
// 왜 스크립트인가: 회차마다 AI가 프로젝트 4개에 git을 여러 번 걸어 범위를 조회하고, 해시가
// 아직 조상인지 눈으로 확인하고, coupling.json 그룹마다 변경 파일 목록과 손으로 교집합을 냈다.
// 판정에 LLM 몫이 없다.
//
// 게이트 2는 짝꿍 점검이 존재하는 이유가 그대로 증명한다 — 이 주기 점검은 편집 시점 훅이
// 놓친 것을 메우려고 있다. 그 메우는 쪽이 그룹 하나를 조용히 빠뜨리면 아무도 안 잡는다.
//
// 판단은 안 한다:
//   - orphan 해시를 어디로 복구할지 (직전 최신화 지점 재탐색)
//   - 엔트리가 없는 프로젝트의 초기 해시 (README 마지막 「실내용」 변경 등 커밋 메시지를 읽는 일)
//   - 드리프트 후보가 진짜 드리프트인지 (그룹 note를 읽고 정하는 일)
//
// 레지스트리 표는 SKILL.md의 표를 그대로 읽는다. 여기에 사본을 두면 프로젝트가 늘 때
// 두 곳을 고쳐야 하고, 한쪽만 고치면 이 점검이 그 프로젝트를 조용히 건너뛴다.
//
// 사용법:
//   node scripts/refresh-projects-scan.mjs --at KA=<워크트리> --at AC=<워크트리> …
//       → Phase 0이 만든 회차 워크트리를 프로젝트별로 지정한다. **이 회차가 도는 곳이 거기다.**
//         안 주면 레지스트리 표의 경로(로컬 체크아웃)를 본다 — 그 체크아웃이 원격보다 뒤처져
//         있으면 다른 기기에서 쌓인 변경이 범위에서 통째로 빠지고, Phase 0이 막으려던 상황이
//         Phase 1에서 그대로 재현된다.
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

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
const out = [];

// ── Phase 1: 커밋 탐색 ────────────────────────────────────────────────────────
const active = [];
{
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

{
  out.push("", `[짝꿍 드리프트 후보] ${drift.length}건 — 그룹 note를 읽고 진짜 드리프트인지 정한다(자동 수정 아님)`);
  for (const d of drift) {
    out.push(`  ${d.abbr} · ${d.name}`);
    out.push(`      움직임: ${d.moved.join(", ")}`);
    out.push(`      안 움직임: ${d.still.join(", ")}`);
    // note는 자르지 않는다 — 판정 재료가 바로 이것이고, 잘리는 뒷부분이 대개 「무엇을 함께 고쳐야 하는가」다.
    if (d.note) out.push(`      note: ${d.note}`);
  }
}

console.log(out.join("\n"));
