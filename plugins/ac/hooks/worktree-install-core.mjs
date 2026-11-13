import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// 훅 발동 자체는 이 설치와 무관하다 — 훅은 git 설정으로 등록돼 있고 그 설정은 워크트리끼리
// 공유되므로, 새 워크트리는 아무것도 안 해도 훅이 돈다. 여기서 채우는 것은 훅이 부르는 도구
// (commitlint 등)의 의존성이다. 없으면 훅이 도구를 못 찾아 커밋이 막히므로 — 조용히 통과하는
// 게 아니라 시끄럽게 막힌다 — 이 설치는 안전 장치가 아니라 편의(DX)다.
//
// 대상 워크트리를 명령 문자열에서 파싱하지 않는다 — 훅은 셸이 실행하기 전의 텍스트를 보므로
// -C 옵션·셸 변수·명령치환이 끼면 경로를 알 수 없다(2026-07-10·2026-08-03 사고). 대신
// git 에게 워크트리 목록을 물어 의존성이 빠진 곳을 채운다. 명령이 어떤 형태든 결과가 같다.
//
// gitignore된 env 파일도 같은 루프에서 primary 로부터 채운다. 워크트리에 env 가 없으면 코드와
// 무관하게 빌드·dev 서버가 실패하고, 그 가짜 실패를 원래 있던 실패로 오판하게 된다(2026-09-30
// MP examples 빌드). 의존성 설치와 따로 부르는 것은 node_modules 가 이미 있어 설치를 건너뛰는
// 워크트리에도 env 는 채워야 해서다.
function installMissingWorktreeDeps() {
  const messages = [];
  const envFilesByPrimary = new Map();

  for (const { worktree, primary } of listCandidateWorktrees()) {
    if (!envFilesByPrimary.has(primary)) envFilesByPrimary.set(primary, listIgnoredEnvFiles(primary));
    const copied = copyMissingEnvFiles(primary, worktree, envFilesByPrimary.get(primary));
    // 값은 싣지 않는다 — 경로만.
    if (copied.length) messages.push(`워크트리 env 복사 (${copied.length}개): ${worktree} ← ${copied.join(", ")}`);

    const result = installWorktreeDeps(worktree);
    if (result.ran) messages.push(result.message);
  }

  return messages;
}

// ~/WebstormProjects/<group>/<repo> 의 링크 워크트리를 그 primary 경로와 함께 모은다.
// primary 는 이미 셋업돼 있으므로 제외.
function listCandidateWorktrees() {
  const projectsRoot = path.join(os.homedir(), "WebstormProjects");
  const found = [];

  for (const group of readDirsSafe(projectsRoot)) {
    for (const repo of readDirsSafe(path.join(projectsRoot, group))) {
      const repoPath = path.join(projectsRoot, group, repo);
      if (!isDirectory(path.join(repoPath, ".git"))) continue; // primary 워크트리만 조회 시작점으로 쓴다

      const result = spawnSync("git", ["-C", repoPath, "worktree", "list", "--porcelain"], { encoding: "utf8" });
      if (result.status !== 0) continue;

      for (const line of result.stdout.split("\n")) {
        if (!line.startsWith("worktree ")) continue;
        const wtPath = line.slice("worktree ".length).trim();
        if (path.resolve(wtPath) === path.resolve(repoPath)) continue;
        found.push({ worktree: wtPath, primary: repoPath });
      }
    }
  }

  return found;
}

// primary 에서 이름이 .env 로 시작하고 gitignore된 파일을 primary 기준 상대 경로로 모은다.
// git ls-files --ignored 는 .claude/worktrees 아래 옛 워크트리 잔여 폴더까지 내려가 느리고
// 경고를 쏟으므로, 얕게 직접 훑은 뒤 후보만 check-ignore 에 묻는다. 추적 파일(.env.example 등)은
// 패턴에 걸려도 check-ignore 가 무시된다고 답하지 않아 여기서 빠진다 — 워크트리에 이미 있다.
const ENV_SCAN_DEPTH = 3;

function listIgnoredEnvFiles(primary) {
  const candidates = [];
  collectEnvCandidates(primary, "", 0, candidates);
  if (candidates.length === 0) return [];

  // -z: 기본 출력은 비ASCII 경로를 8진수 이스케이프로 감싸 그대로 경로로 못 쓴다. -z 는 --stdin 과만 쓰인다.
  const result = spawnSync("git", ["-C", primary, "check-ignore", "-z", "--stdin"], {
    encoding: "utf8",
    input: candidates.join("\0") + "\0",
  });
  // 0 = 하나 이상 무시됨, 1 = 무시된 것 없음, 그 밖 = 오류.
  if (result.status !== 0) return [];
  return result.stdout.split("\0").filter(Boolean);
}

// 숨김 폴더(.git·.claude·.next·.turbo 등)와 node_modules 는 들어가지 않는다. .git 이 든 폴더(서브모듈·
// 중첩 레포)도 건너뛴다 — 그 안의 경로가 하나라도 섞이면 check-ignore 가 통째로 실패한다.
function collectEnvCandidates(root, relDir, depth, out) {
  let entries;
  try {
    entries = fs.readdirSync(path.join(root, relDir), { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (entry.isFile() && entry.name.startsWith(".env")) out.push(relPath);
    else if (entry.isDirectory() && depth < ENV_SCAN_DEPTH && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      if (fs.existsSync(path.join(root, relPath, ".git"))) continue;
      collectEnvCandidates(root, relPath, depth + 1, out);
    }
  }
}

// 워크트리의 같은 상대 경로에 없는 env 파일만 복사한다. 이미 있으면 덮어쓰지 않고, 담을 폴더가
// 없으면(그 브랜치에 그 앱이 없음) 만들지 않고 건너뛴다. 반환: 복사한 상대 경로 목록.
function copyMissingEnvFiles(primary, worktree, envFiles) {
  const copied = [];

  for (const relPath of envFiles) {
    const dest = path.join(worktree, relPath);
    if (!isDirectory(path.dirname(dest))) continue;
    try {
      fs.copyFileSync(path.join(primary, relPath), dest, fs.constants.COPYFILE_EXCL);
      copied.push(relPath);
    } catch {
      // EEXIST(이미 있음)를 포함해 복사 못 한 파일은 건너뛴다.
    }
  }

  return copied;
}

function readDirsSafe(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

// 워크트리 하나에 의존성이 없으면 패키지 매니저로 설치한다.
// 반환: { ran, ok, message }
function installWorktreeDeps(absWtPath) {
  if (!absWtPath || !fs.existsSync(absWtPath)) return { ran: false, ok: true, message: "" };

  const pkgJsonPath = path.join(absWtPath, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return { ran: false, ok: true, message: "" };

  // deps가 이미 있으면 할 일 없음.
  if (fs.existsSync(path.join(absWtPath, "node_modules"))) return { ran: false, ok: true, message: "" };

  const { pm, installCmd } = detectPm(absWtPath, pkgJsonPath);
  if (!pm) return { ran: false, ok: true, message: "" };

  try {
    execSync(installCmd, { cwd: absWtPath, stdio: "pipe", timeout: 10 * 60 * 1000 });
    return { ran: true, ok: true, message: `워크트리 의존성 설치 완료 (${pm}): ${absWtPath}` };
  } catch (e) {
    const stderr = (e.stderr && e.stderr.toString()) || (e.stdout && e.stdout.toString()) || e.message || "";
    return { ran: true, ok: false, message: `워크트리 의존성 설치 실패 (${pm} @ ${absWtPath}): ${stderr.slice(-400)}` };
  }
}

// 락파일·packageManager 필드로 패키지 매니저와 full-install 명령을 정한다. 못 정하면 pm=null.
function detectPm(absWtPath, pkgJsonPath) {
  if (fs.existsSync(path.join(absWtPath, "pnpm-lock.yaml"))) return { pm: "pnpm", installCmd: "pnpm install --frozen-lockfile" };
  if (fs.existsSync(path.join(absWtPath, "yarn.lock"))) return { pm: "yarn", installCmd: "yarn install --frozen-lockfile" };
  if (fs.existsSync(path.join(absWtPath, "package-lock.json"))) return { pm: "npm", installCmd: "npm ci" };
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    if (pkg.packageManager) {
      const name = String(pkg.packageManager).split("@")[0];
      if (name === "pnpm") return { pm: "pnpm", installCmd: "pnpm install" };
      if (name === "yarn") return { pm: "yarn", installCmd: "yarn install" };
      if (name === "npm") return { pm: "npm", installCmd: "npm install" };
    }
  } catch {}
  return { pm: null, installCmd: null };
}

export { installMissingWorktreeDeps };
