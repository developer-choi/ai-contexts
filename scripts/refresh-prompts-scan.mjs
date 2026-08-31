#!/usr/bin/env node
// `/refresh-prompts` step 1 「범위 한정」의 기계 파트 — 무엇이 아직 정비 안 됐고, 정비된 것 중
// 무엇이 그 뒤로 많이 바뀌었는지를 낸다.
//
// 왜 스크립트인가: 회차마다 AI가 대상 레포를 손으로 열거하고, 그 안의 프롬프트 md를 세고,
// state.json 키와 하나씩 맞대보고, 키마다 커밋을 훑어 변경량을 셌다. 판정에 LLM 몫이 없는데
// 대조 대상이 수백 개다. 한 폴더를 빠뜨리면 그 폴더는 "정비 대상이 아니다"가 아니라 **아무도
// 안 본 채로 영영 랭킹 밖에 남는다** — 미정비가 목록에 안 뜨는 것이 곧 조용한 실패다.
//
// 판단은 안 한다:
//   - 이번 회차에 어느 덩이를 자를지 (한 회차 = state.json 키 하나)
//   - dangling 키가 「지워졌다」인지 「옮겨졌다」인지 — 그 레포 git 이력이 가르고, 잘못 옮기면
//     안 훑은 내용이 훑은 것으로 기록돼 랭킹에서 사라진다
//
// 사용법:
//   node scripts/refresh-prompts-scan.mjs
//   node scripts/refresh-prompts-scan.mjs --model claude-opus-5[1m]
//       → 기록 model이 그보다 낮은 키를 함께 낸다(모델 업그레이드 발동 판정)
//   node scripts/refresh-prompts-scan.mjs --state <path> --root <dir,dir>
//       → state.json 위치·스캔 루트를 바꾼다(픽스처 검증용)

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

import { defaultLocalRoots, listLocalRepos } from "./local-system/local-deploy-lib.mjs";

const argv = process.argv.slice(2);
const optOf = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const ROOTS = optOf("root") ? optOf("root").split(",").map((s) => s.trim()).filter(Boolean) : defaultLocalRoots;
const MODEL = optOf("model");
// 네트워크가 없거나 픽스처로 돌릴 때만 끈다. 끄면 「뒤처짐」 판정이 마지막 fetch 시점에 멈춘다.
const NO_FETCH = argv.includes("--no-fetch");

// 정비 대상이 아닌데 조건에는 걸리는 곳. 안 적으면 회차마다 다시 후보로 올라온다.
//   test-playground — 스캔 루트 안이고 CLAUDE.md도 있지만 실험장이라 정비하지 않는다
//   coding-standards — 후보 대부분이 코드 예시로 자명한 무해 부연이라 ROI가 낮고 사용자가 대부분 되돌렸다
const EXCLUDED_REPOS = new Set(["test-playground"]);
// 런타임 산출물은 규약 문서가 아니라 그 규약이 만들어낸 데이터다. 자산 폴더 안에 살지만
// 정비 대상이 아니고, 안 빼면 회차마다 미정비 목록의 대부분을 차지해 진짜 후보를 덮는다.
const EXCLUDED_PATHS = [
  "deploy/contexts/coding-standards",
  "local/contexts/recruitment/applications",
  "local/contexts/recruitment/outputs",
];

// 배포 산출물·의존성. 원본만 센다.
const SKIP_DIRS = new Set([".git", ".claude", ".agents", "node_modules", ".idea"]);

function git(cwd, args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

function walkMd(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkMd(full, out);
    else if (name.endsWith(".md")) out.push(full);
  }
  return out;
}

// 그 레포에서 프롬프트로 배포되는 md. 목록을 손으로 적지 않는다 — 배포가 무엇을 집어가는지가
// 이미 코드에 있고(local/* 중 hooks 제외), 새 자산 폴더가 생기면 여기도 같이 따라간다.
// `deploy/`는 전역 자산의 원본이라 그 폴더를 가진 레포에서만 잡힌다.
// 대상 레포도 같은 이유로 나열하지 않는다 — 배포가 닿는 스캔 루트가 곧 정비 대상이라,
// 새 레포가 생겨도 손볼 것이 없어야 한다.
function promptFiles(repo) {
  const files = [];
  const claudeMd = join(repo, "CLAUDE.md");
  if (existsSync(claudeMd)) files.push(claudeMd);

  // README는 프롬프트가 아니라 대표 창구다 — `/refresh-projects` Phase 4-readme가 소유한다.
  const isReadme = (f) => basename(f) === "README.md";

  const localDir = join(repo, "local");
  if (existsSync(localDir)) {
    for (const name of readdirSync(localDir)) {
      if (name === "hooks" || SKIP_DIRS.has(name)) continue;
      const full = join(localDir, name);
      if (statSync(full).isDirectory()) walkMd(full, files);
    }
  }

  const deployDir = join(repo, "deploy");
  if (existsSync(deployDir)) walkMd(deployDir, files);

  return files.filter((f) => !isReadme(f));
}

// 워크트리는 본체와 같은 레포다. `.git`이 파일이면 워크트리라 본체만 남긴다 — 안 그러면
// 회차용 워크트리가 새 레포로 잡혀 같은 파일이 두 번 세어진다.
function primaryRepos() {
  return listLocalRepos(ROOTS).filter((repo) => {
    if (EXCLUDED_REPOS.has(basename(repo))) return false;
    if (!statSync(join(repo, ".git")).isDirectory()) return false;
    return existsSync(join(repo, "CLAUDE.md")) || existsSync(join(repo, "local"));
  });
}

const repos = primaryRepos();
const backlogRepo = repos.find((r) => basename(r) === "backlog");
const STATE = optOf("state") || (backlogRepo && join(backlogRepo, "refresh-prompts", "state.json"));
if (!STATE || !existsSync(STATE)) {
  console.error(`state.json을 찾을 수 없습니다: ${STATE || "(backlog 레포 없음)"}`);
  process.exit(1);
}
const state = JSON.parse(readFileSync(STATE, "utf8"));
// 경로가 아닌 엔트리(기계강제 스윕 시점 등)는 대조 대상이 아니다.
const pathKeys = Object.keys(state).filter((k) => k.includes("/"));

// 파일마다 가장 길게 맞는 키가 기준점이다. 짧은 키에 걸려 넓게 「정비됨」으로 읽히면
// 실제로 안 훑은 하위 폴더가 랭킹에서 사라진다.
function keyFor(rel) {
  let best = null;
  for (const k of pathKeys) {
    if (rel !== k && !rel.startsWith(`${k}/`)) continue;
    if (!best || k.length > best.length) best = k;
  }
  return best;
}

const unswept = new Map(); // 디렉토리 → 그 아래 미정비 파일들
const behind = [];
const seenKeys = new Set();

for (const repo of repos) {
  const name = basename(repo);
  const branch = git(repo, ["symbolic-ref", "-q", "--short", "HEAD"]);
  if (branch) {
    // fetch를 먼저 한다. `origin/*` ref가 마지막 fetch에 멈춰 있으면 실제로 뒤처진 레포가
    // 「뒤처짐」에 안 뜨고, 그러면 그 레포를 낡은 상태로 정비해 「정비했다고 기록한 경로가 실은
    // 안 본 상태」가 된다 — 이 목록이 막으려던 바로 그것이다.
    if (!NO_FETCH) git(repo, ["fetch", "--quiet", "origin"]);
    const cnt = git(repo, ["rev-list", "--count", `HEAD..origin/${branch}`]);
    if (cnt && Number(cnt) > 0) behind.push(`${name} (${branch}, behind ${cnt})`);
  }

  for (const file of promptFiles(repo)) {
    const rel = `${name}/${relative(repo, file).replace(/\\/g, "/")}`;
    if (EXCLUDED_PATHS.some((p) => rel.includes(p))) continue;
    const key = keyFor(rel);
    if (key) {
      seenKeys.add(key);
      continue;
    }
    // 한 번도 안 훑인 파일은 그 부모 디렉토리로 묶어 낸다 — 회차를 자르는 단위가 폴더다.
    const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : rel;
    if (!unswept.has(dir)) unswept.set(dir, []);
    unswept.get(dir).push(rel.slice(dir.length + 1));
  }
}

// 정비됨: sweptAt 이후 그 경로가 얼마나 바뀌었나. 미정비가 바닥났을 때 순위를 가르는 값이다.
const churn = [];
for (const key of pathKeys) {
  const repoName = key.slice(0, key.indexOf("/"));
  const repo = repos.find((r) => basename(r) === repoName);
  const inRepo = key.slice(key.indexOf("/") + 1);
  if (!repo || !existsSync(join(repo, inRepo))) continue;
  const since = state[key].sweptAt;
  const log = git(repo, ["log", `--since=${since}`, "--format=%H", "--", inRepo]);
  const files = git(repo, ["log", `--since=${since}`, "--format=", "--name-only", "--", inRepo]);
  churn.push({
    key,
    commits: log ? log.split("\n").filter(Boolean).length : 0,
    files: files ? new Set(files.split("\n").filter(Boolean)).size : 0,
    model: state[key].model,
    since,
  });
}

const dangling = pathKeys.filter((k) => !churn.some((c) => c.key === k));

const out = [];
if (behind.length) {
  out.push("[원격보다 뒤처짐] 최신화 전에는 이 레포를 정비하지 않는다 — 낡은 로컬에서 훑으면 다른 기기 변경이 통째로 빠진다");
  behind.forEach((b) => out.push(`  ${b}`));
  out.push("");
}

const unsweptTotal = [...unswept.values()].reduce((a, f) => a + f.length, 0);
out.push(`[미정비] ${unsweptTotal}개 파일 / ${unswept.size}개 폴더 — 여기서 한 덩이를 자른다`);
[...unswept.entries()]
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  .forEach(([dir, files]) => out.push(`  ${dir} (${files.length}) — ${files.slice(0, 6).join(", ")}${files.length > 6 ? " …" : ""}`));

if (dangling.length) {
  out.push("", `[키는 있는데 실물이 없음] ${dangling.length}건 — 지워졌는지 옮겨졌는지는 그 레포 git 이력이 가른다`);
  dangling.forEach((k) => out.push(`  ${k}`));
}

if (!unswept.size) {
  out.push("", "[정비됨 · sweptAt 이후 변경량] 미정비가 바닥났으므로 이 순위로 고른다 (고변경 = 고ROI)");
  churn
    .filter((c) => c.commits > 0)
    .sort((a, b) => b.files - a.files || b.commits - a.commits)
    .forEach((c) => out.push(`  ${c.key} :: 커밋 ${c.commits} · 파일 ${c.files} (${c.since} 이후)`));
}

// ── 기계강제-산문 스윕: 도나 마나 ─────────────────────────────────────────────
// 훅·린트가 그대로면 새 어긋남이 생길 자리가 없으므로 건너뛴다. 그 판정을 손으로 하면
// 「안 바뀌었을 것」이라는 짐작으로 넘기게 되고, 그러면 늘어난 훅과 어긋난 산문이 그대로 남는다.
//
// 경로를 파일 단위로 적지 않고 폴더째 잡는다 — 골라 적으면 새로 생긴 강제 수단이 목록에 안 올라
// 조용히 검사 밖에 남는다(무관한 파일이 걸려 한 번 더 도는 쪽을 값으로 치른다).
const ENFORCEMENT_PATHS = [
  "deploy/hooks",
  "local/hooks",
  ".githooks",
  "scripts",
  "eslint.config.*",
  ".stylelintrc*",
  "tsconfig*.json",
  "commitlint.config.*",
  ".commitlintrc*",
];
const driftSince = state["machine-enforced-drift"]?.sweptAt;
if (driftSince) {
  const changed = [];
  for (const repo of repos) {
    const log = git(repo, ["log", `--since=${driftSince}`, "--format=%h %s", "--", ...ENFORCEMENT_PATHS]);
    if (log) changed.push(`  ${basename(repo)} (${log.split("\n").length}건) — ${log.split("\n")[0]}`);
  }
  out.push(
    "",
    changed.length
      ? `[기계강제-산문 스윕] 돈다 — ${driftSince} 이후 강제 수단이 바뀐 레포 ${changed.length}개`
      : `[기계강제-산문 스윕] 건너뛴다 — ${driftSince} 이후 강제 수단이 안 바뀌었다`,
  );
  out.push(...changed);
}

if (MODEL) {
  const older = churn.filter((c) => c.model && c.model !== MODEL);
  out.push("", `[기록 모델이 현재와 다름] ${older.length}건 — 2순위 옵션(옛 파일 광범위 정비) 판단 재료`);
  older.forEach((c) => out.push(`  ${c.key} :: ${c.model}`));
}

console.log(out.join("\n"));
