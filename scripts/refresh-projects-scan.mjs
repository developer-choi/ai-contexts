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
//   - 워크트리·브랜치를 지울지 (승인은 사용자)
//
// 레지스트리 표와 정리 대상 루트 표는 SKILL.md의 표를 그대로 읽는다. 여기에 사본을 두면 프로젝트가 늘 때
// 두 곳을 고쳐야 하고, 한쪽만 고치면 이 점검이 그 프로젝트를 조용히 건너뛴다.
//
// 사용법:
//   node scripts/refresh-projects-scan.mjs --at KA=<워크트리> --at AC=<워크트리> …
//       → Phase 0이 만든 회차 워크트리를 프로젝트별로 지정한다. **이 회차가 도는 곳이 거기다.**
//         안 주면 레지스트리 표의 경로(로컬 체크아웃)를 본다 — 그 체크아웃이 원격보다 뒤처져
//         있으면 다른 기기에서 쌓인 변경이 범위에서 통째로 빠지고, Phase 0이 막으려던 상황이
//         Phase 1에서 그대로 재현된다.
//   node scripts/refresh-projects-scan.mjs --state <path> --skill <path>
//   node scripts/refresh-projects-scan.mjs --worktrees [--at <약어>=<워크트리> …] [--backlog <path>]
//       → 대상 레포를 fetch --prune한 뒤 안 쓰는 워크트리·브랜치 표만 낸다. `--at`으로 넘긴 워크트리는 뺀다.
//   node scripts/refresh-projects-scan.mjs --remove <지정값>… [--force]
//       → 표의 「지정값」으로 고른 것만 지운다. 미커밋이 있는 워크트리는 --force일 때만.

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findServers, stopServers } from "../deploy/contexts/stop-servers.mjs";

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
const WORKSPACE = join(homedir(), "WebstormProjects");

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

// `--remove a b`와 `--remove a --remove b` 둘 다 쓰인다. 뒤엣것을 흘리면 고른 것이 말없이 안 지워진다.
// `--worktrees`와 함께 와도 삭제가 이긴다 — 표만 내고 끝나면 지웠다고 믿은 채 넘어간다.
if (argv.includes("--remove")) {
  const targets = [];
  let collecting = false;
  for (const a of argv) {
    if (a === "--remove") collecting = true;
    else if (a.startsWith("--")) collecting = false;
    else if (collecting) targets.push(a);
  }
  if (!targets.length) {
    console.error("--remove 뒤에 표의 지정값을 하나 이상 적는다");
    process.exit(1);
  }
  removeTargets(targets, argv.includes("--force"));
}
if (argv.includes("--worktrees")) {
  console.log(scanWorktrees().join("\n"));
  process.exit(0);
}

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

// ── 안 쓰는 워크트리·브랜치 (--worktrees) ─────────────────────────────────────
// 워크트리 폴더와 그 브랜치는 어느 커밋에도 안 나타나, 증분 추적으로는 영영 안 걸린다.
// 그래서 정리 대상 루트 아래 레포를 전수로 훑어 후보와 판단 재료를 표로만 낸다.
//
// 후보 종류:
//   워크트리          폴더가 살아 있는 워크트리
//   기록만(prunable)  폴더는 없는데 git 기록이 남은 것
//   폴더만            git 기록은 없는데 폴더가 남은 것 — `worktree remove`가 파일 잠금으로 실패하면
//                     기록만 지워지고 이렇게 남는다. `.claude/worktrees/` 아래와, 관리 위치가 생기기
//                     전의 형제 경로(`<레포명>-…`)를 본다
//   브랜치만          어느 워크트리에도 안 물린 로컬 브랜치(기본 브랜치 제외)

function samePath(p) {
  const r = resolve(p).replaceAll("\\", "/").replace(/\/+$/, "");
  return process.platform === "win32" ? r.toLowerCase() : r;
}

function parseWorktreeList(dir) {
  const raw = git(dir, ["worktree", "list", "--porcelain"]) ?? "";
  return raw
    .split(/\r?\n\r?\n/)
    .filter(Boolean)
    .map((block) => {
      const wt = {};
      for (const line of block.split(/\r?\n/)) {
        const [key, ...rest] = line.split(" ");
        const val = rest.join(" ");
        if (key === "worktree") wt.path = val;
        else if (key === "HEAD") wt.head = val;
        else if (key === "branch") wt.branch = val.replace(/^refs\/heads\//, "");
        else if (key === "locked") wt.locked = val || "사유 없음";
        else if (key === "prunable") wt.prunable = true;
      }
      return wt;
    });
}

function defaultBranch(dir) {
  const head = git(dir, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
  if (head) return head.replace(/^origin\//, "");
  return ["main", "master"].find((b) => git(dir, ["rev-parse", "--verify", "--quiet", `refs/heads/${b}`]) !== null) ?? null;
}

// 기본 브랜치에 들어갔나. `branch --merged`는 rebase·squash로 들어간 것을 안 들어감으로 본다.
// `git cherry`는 커밋마다 내용이 같으면(rebase·cherry-pick) 잡고, 여러 커밋을 하나로 합친 squash는
// 브랜치 전체를 한 커밋으로 합친 임시 커밋을 만들어 같은 방식으로 본다. 원격·로컬 기본 브랜치 중
// 어느 쪽에든 들어갔으면 「들어감」 — 다른 기기가 머지했거나, 로컬에서 머지하고 아직 안 올렸거나.
// 임시 커밋은 어디에도 안 물린 객체로 대상 레포에 남는다(gc가 치운다).
function mergedInto(dir, base, ref) {
  const cherry = git(dir, ["cherry", base, ref]);
  if (cherry === null) return null;
  const ahead = cherry.split("\n").filter((l) => l.startsWith("+")).length;
  if (!ahead) return { merged: true, label: "들어감" };
  const mb = git(dir, ["merge-base", base, ref]);
  const tree = git(dir, ["rev-parse", `${ref}^{tree}`]);
  const probe = mb && tree && git(dir, ["commit-tree", tree, "-p", mb, "-m", "squash-probe"]);
  if (probe && git(dir, ["cherry", base, probe])?.startsWith("-")) return { merged: true, label: "들어감(squash)" };
  return { merged: false, label: `안 들어간 커밋 ${ahead}` };
}

function mergeState(dir, def, ref) {
  const bases = [`origin/${def}`, def].filter((b) => git(dir, ["rev-parse", "--verify", "--quiet", b]) !== null);
  const results = bases.map((b) => mergedInto(dir, b, ref)).filter(Boolean);
  return (results.find((r) => r.merged) ?? results[0])?.label ?? "확인 실패";
}

function remoteState(upstream, track) {
  if (!upstream) return "upstream 없음";
  if (track.includes("gone")) return "원격 사라짐(gone)";
  const ahead = /ahead (\d+)/.exec(track)?.[1];
  const behind = /behind (\d+)/.exec(track)?.[1];
  if (!ahead && !behind) return "같음";
  return [ahead && `앞섬 ${ahead}`, behind && `뒤처짐 ${behind}`].filter(Boolean).join(", ");
}

// 커밋 없이 손대던 중인지는 커밋 날짜로 안 보인다. 설치물·빌드물은 수정 시각이 작업과 무관해 뺀다.
function latestMtime(dir) {
  const skip = new Set(["node_modules", ".git", "dist"]);
  let latest = 0;
  const walk = (d) => {
    let names;
    try {
      names = readdirSync(d);
    } catch {
      return;
    }
    for (const name of names) {
      if (skip.has(name)) continue;
      const p = join(d, name);
      let st;
      try {
        st = lstatSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p);
      else if (st.mtimeMs > latest) latest = st.mtimeMs;
    }
  };
  walk(dir);
  if (!latest) {
    try {
      latest = statSync(dir).mtimeMs;
    } catch {
      return "-";
    }
  }
  const d = new Date(latest);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function listMd(dir) {
  const found = [];
  const walk = (d) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) found.push(p);
    }
  };
  walk(dir);
  return found;
}

// 진행 중 항목이 쓰는 워크트리를 날짜·머지 여부만 보고 지우는 사고를 막는다.
function backlogDocs(backlogRoot) {
  const projects = join(backlogRoot, "projects");
  if (!existsSync(projects)) return [];
  return readdirSync(projects)
    .map((p) => join(projects, p, "active"))
    .filter(existsSync)
    .flatMap(listMd)
    .map((file) => ({ rel: relative(backlogRoot, file).replaceAll("\\", "/"), text: readFileSync(file, "utf8") }));
}

// 표와 `--remove`가 같은 지정값을 쓴다. 번호는 다시 스캔하면 밀리므로 지정에 못 쓴다.
function targetOf(row) {
  if (!row.path) return `${row.repo}:${row.branch}`;
  const rel = relative(WORKSPACE, row.path);
  return (rel.startsWith("..") ? row.path : rel).replaceAll("\\", "/");
}

function keyOfTarget(t) {
  const isPath = /^[A-Za-z]:[\\/]/.test(t) || !t.includes(":");
  return isPath ? samePath(isAbsolute(t) ? t : join(WORKSPACE, t)) : t;
}

function keyOfRow(row) {
  return row.path ? samePath(row.path) : `${row.repo}:${row.branch}`;
}

function collectCandidates({ fetch }) {
  const roots = tableRows(skillMd, "정리 대상 루트").map(([p]) => expandHome(unquote(p ?? ""))).filter(Boolean);
  // 표 머리를 바꾸거나 틀리면 루트가 0개가 되고, 그대로 두면 「후보 0건」과 구분되지 않는다.
  if (!roots.length) {
    console.error(`⚠ ${SKILL}에서 「정리 대상 루트」 표를 못 찾았다 — 표 머리가 바뀌었으면 이 스크립트도 고친다.`);
    process.exit(1);
  }
  const excluded = new Set([...AT.values()].map(samePath));
  const notes = [];

  const repos = [];
  const loose = []; // 루트 바로 아래의 레포 아닌 폴더 — 관리 위치가 생기기 전 형제 경로 워크트리의 잔재 후보
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root)) {
      const dir = join(root, name);
      let isDir = false;
      try {
        isDir = statSync(dir).isDirectory();
      } catch {}
      if (!isDir) continue;
      const dotGit = join(dir, ".git");
      if (existsSync(dotGit) && statSync(dotGit).isDirectory()) repos.push({ name, dir });
      else loose.push({ name, dir });
    }
  }

  const rows = [];
  const folderRows = [];
  const registered = new Set();
  const fetchFailed = [];
  for (const repo of repos) {
    // fetch 없이 보면 「원격」 칸이 낡는데, 표만 봐서는 낡은 줄 모른다.
    if (fetch && git(repo.dir, ["remote"]) && git(repo.dir, ["fetch", "--prune", "--quiet"]) === null) fetchFailed.push(repo.name);
    const def = defaultBranch(repo.dir);
    if (!def) {
      notes.push(`⚠ 기본 브랜치를 못 정해 건너뛴 레포: ${repo.dir}`);
      continue;
    }
    const list = parseWorktreeList(repo.dir);
    list.forEach((w) => registered.add(samePath(w.path)));
    const others = list.slice(1); // 첫 줄은 기본 체크아웃
    const excludedBranches = new Set(others.filter((w) => excluded.has(samePath(w.path))).map((w) => w.branch));
    const checkedOut = new Set(list.map((w) => w.branch).filter(Boolean));

    const refs = new Map(
      (git(repo.dir, ["for-each-ref", "--format=%(refname:short)%09%(upstream:short)%09%(upstream:track)", "refs/heads"]) ?? "")
        .split("\n")
        .filter(Boolean)
        .map((l) => {
          const [name, upstream, track] = l.split("\t");
          return [name, { upstream, track: track ?? "" }];
        }),
    );
    const base = { repo: repo.name, repoDir: repo.dir, path: null, branch: null, date: null, subject: null, merged: null, remote: null, mtime: null, dirty: null, locked: null };
    const branchInfo = (branch, head) => {
      const ref = branch ?? head;
      const [date, subject] = (git(repo.dir, ["log", "-1", "--format=%cs%x09%s", ref]) ?? "\t").split("\t");
      const r = branch && refs.get(branch);
      return {
        date: date || null,
        subject: subject || null,
        merged: mergeState(repo.dir, def, ref),
        remote: branch ? remoteState(r?.upstream, r?.track ?? "") : "브랜치 없음(detached)",
      };
    };

    for (const w of others) {
      if (excluded.has(samePath(w.path))) continue;
      const alive = !w.prunable && existsSync(w.path);
      rows.push({
        ...base,
        kind: alive ? "워크트리" : "기록만(prunable)",
        path: w.path,
        branch: w.branch ?? null,
        ...branchInfo(w.branch, w.head),
        mtime: alive ? latestMtime(w.path) : null,
        dirty: alive ? (git(w.path, ["status", "--porcelain"]) ?? "").split("\n").filter(Boolean).length : null,
        locked: w.locked ?? null,
      });
    }

    const managed = join(repo.dir, ".claude", "worktrees");
    const leftovers = existsSync(managed) ? readdirSync(managed).map((n) => join(managed, n)) : [];
    const siblings = loose
      .filter((l) => l.name.startsWith(`${repo.name}-`) && !repos.some((o) => o.name.length > repo.name.length && l.name.startsWith(`${o.name}-`)))
      .map((l) => l.dir);
    for (const dir of [...leftovers, ...siblings]) {
      try {
        if (!statSync(dir).isDirectory()) continue;
      } catch {
        continue;
      }
      folderRows.push({ ...base, kind: "폴더만", path: dir });
    }

    for (const [branch] of refs) {
      if (branch === def || checkedOut.has(branch) || excludedBranches.has(branch)) continue;
      rows.push({ ...base, kind: "브랜치만", branch, ...branchInfo(branch) });
    }
  }

  // 폴더만: 등록된 워크트리 자신이거나, 그것을 품은 컨테이너(`<레포>-worktrees/`)면 뺀다 — 컨테이너를 지우면
  // 안에 살아 있는 워크트리가 함께 사라진다.
  const holdsRegistered = (dir) => {
    const d = samePath(dir);
    return [...registered].some((r) => r === d || r.startsWith(`${d}/`));
  };
  for (const row of folderRows) {
    if (holdsRegistered(row.path) || excluded.has(samePath(row.path))) continue;
    rows.push({ ...row, mtime: latestMtime(row.path) });
  }

  if (fetchFailed.length) notes.push(`⚠ fetch 실패 — 이 레포들의 「원격」 칸은 낡았을 수 있다: ${fetchFailed.join(", ")}`);
  return { rows, notes };
}

function scanWorktrees() {
  const backlogRoot = optOf("backlog") || join(WORKSPACE, "main", "backlog");
  const { rows, notes } = collectCandidates({ fetch: true });

  // 프로세스 표는 한 번만 뜬다(Windows에선 조회 한 번이 수 초). 걸린 게 있을 때만 경로별로 다시 가른다.
  const folders = rows.filter((r) => r.path && existsSync(r.path)).map((r) => r.path);
  const procCount = new Map();
  if (folders.length && findServers({ paths: folders }).hits.length) {
    for (const f of folders) procCount.set(f, findServers({ paths: [f] }).hits.length);
  }

  const docs = backlogDocs(backlogRoot);
  // `feature`·`starter` 같은 한 낱말 이름은 산문 곳곳에 걸려 표를 덮으므로, `/`·`-`·`_`가 든 이름만
  // 앞뒤가 이름 글자가 아닌 자리에서 찾는다(`feature/image`가 `feature/image-x`에 걸리지 않게).
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pointers = (row) => {
    const needles = [row.branch, row.path && basename(row.path)]
      .filter((n) => n && /[/_-]/.test(n))
      .map((n) => new RegExp(`(?<![\\w-])${escapeRe(n)}(?![\\w-])`));
    return docs.filter((d) => needles.some((re) => re.test(d.text))).map((d) => d.rel);
  };

  const cell = (v) => (v === null || v === undefined ? "-" : String(v).replaceAll("|", "\\|"));
  const out = [`[안 쓰는 워크트리·브랜치 후보] ${rows.length}건 — 지울지는 사용자가 고른다(자동 삭제 아님)`, ...notes.map((n) => `  ${n}`)];
  out.push(
    "",
    "| # | 지정값 | 레포 | 종류 | 브랜치 | 마지막 커밋 | 커밋 제목 | 폴더 마지막 수정 | 미커밋 | 기본 브랜치에 | 원격 | 잠김 | 프로세스 | 백로그가 가리킴 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  );
  rows.forEach((r, i) => {
    const procs = r.path && existsSync(r.path) ? (procCount.get(r.path) ?? 0) : null;
    const refsTo = pointers(r);
    out.push(
      `| ${[i + 1, targetOf(r), r.repo, r.kind, r.branch ?? (r.path && r.kind !== "폴더만" ? "(detached)" : null), r.date, r.subject, r.mtime, r.dirty, r.merged, r.remote, r.locked, procs, refsTo.length ? refsTo.join("<br>") : null].map(cell).join(" | ")} |`,
    );
  });
  out.push("", "지우려면 고른 행의 지정값을 `--remove`에 넘긴다.");
  return out;
}

function gitTry(cwd, args) {
  try {
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true };
  } catch (e) {
    return { ok: false, err: String(e.stderr || e.message).trim().split("\n")[0] };
  }
}

// 지우는 순서는 판단이 없는데, 틀리면 조용히 샌다 — 폴더를 잡은 서버를 안 끄고 `worktree remove`하면
// 파일 잠금으로 실패하면서 git 기록만 지워 「폴더만」을 새로 만든다. 그래서 산문 대신 여기서 한다.
// 원격 브랜치는 건드리지 않는다.
function removeTargets(targets, force) {
  const { rows } = collectCandidates({ fetch: false });
  const byKey = new Map(rows.map((r) => [keyOfRow(r), r]));
  const picked = targets.map((t) => ({ t, row: byKey.get(keyOfTarget(t)) }));
  const unknown = picked.filter((p) => !p.row).map((p) => p.t);
  if (unknown.length) {
    console.error(`후보 표에 없는 지정값이라 아무것도 안 지웠다: ${unknown.join(", ")}`);
    process.exit(1);
  }

  const out = [];
  let failed = 0;
  for (const { t, row } of picked) {
    const fail = (why) => {
      failed += 1;
      out.push(`  ✗ ${t} — ${why}`);
    };
    // 안 지울 것의 서버를 끄지 않도록, 거절 판정을 서버 끄기보다 먼저 한다.
    if (row.dirty && !force) {
      fail(`미커밋 ${row.dirty}개 — 사용자가 그걸 알고 골랐으면 --force로 다시 부른다`);
      continue;
    }
    if (row.path && existsSync(row.path)) {
      const { remaining } = stopServers({ paths: [row.path] });
      if (remaining.length) {
        fail(`이 경로를 잡은 프로세스 ${remaining.length}개가 안 꺼졌다 (pid ${remaining.map((p) => p.pid).join(", ")})`);
        continue;
      }
    }
    if (row.kind === "워크트리" || row.kind === "기록만(prunable)") {
      if (row.locked) gitTry(row.repoDir, ["worktree", "unlock", row.path]);
      // `worktree prune`은 그 레포의 prunable을 전부 지우므로 쓰지 않는다. remove는 한 건만 지운다.
      const res = gitTry(row.repoDir, ["worktree", "remove", ...(force ? ["--force"] : []), row.path]);
      if (!res.ok && parseWorktreeList(row.repoDir).some((w) => samePath(w.path) === samePath(row.path))) {
        fail(`worktree remove 실패: ${res.err}`);
        continue;
      }
    }
    if (row.path && existsSync(row.path)) {
      try {
        rmSync(row.path, { recursive: true, force: true });
      } catch {}
    }
    if (row.path && existsSync(row.path)) {
      fail("폴더가 남았다 — 명령줄에 경로가 안 박힌 프로세스가 잡고 있을 수 있다. 완료 아님");
      continue;
    }
    if (row.branch) {
      const res = gitTry(row.repoDir, ["branch", "-D", row.branch]);
      if (!res.ok) {
        fail(`${row.kind === "브랜치만" ? "" : "폴더는 지웠으나 "}branch -D 실패: ${res.err}`);
        continue;
      }
    }
    out.push(`  ✓ ${t}`);
  }
  out.unshift(`[워크트리·브랜치 삭제] ${picked.length - failed}/${picked.length}건 완료`);
  console.log(out.join("\n"));
  process.exit(failed ? 1 : 0);
}

