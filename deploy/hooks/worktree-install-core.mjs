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
function installMissingWorktreeDeps() {
  const messages = [];

  for (const worktree of listCandidateWorktrees()) {
    const result = installWorktreeDeps(worktree);
    if (result.ran) messages.push(result.message);
  }

  return messages;
}

// ~/WebstormProjects/<group>/<repo> 의 링크 워크트리를 모은다. primary 는 이미 셋업돼 있으므로 제외.
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
        found.push(wtPath);
      }
    }
  }

  return found;
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
