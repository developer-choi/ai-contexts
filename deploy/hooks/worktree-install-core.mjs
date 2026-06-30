import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// 새 워크트리(absWtPath)가 의존성 미설치 상태의 JS 프로젝트면 패키지 매니저로 설치한다.
// 설치가 끝나면 npm 계열의 prepare(=husky)가 .husky/_ shim과 core.hooksPath를 복구하므로
// raw `git worktree add` / EnterWorktree로 만든 워크트리의 commitlint 우회가 사라진다.
//
// node_modules가 "존재만" 해도 husky 셋업이 깨진(불완전) 워크트리가 있다 — .husky/_ shim 누락 +
// core.hooksPath가 비표준값(.husky)인 채로 상속되면 git이 shebang 없는 user hook을 직접 exec해
// "Exec format error"로 모든 커밋이 막힌다. node_modules 존재만으로 "설치됨"을 판정해 스킵하면
// 이 상태가 복구되지 않으므로, 존재 시에도 husky 완전성을 검사해 불완전하면 prepare를 실행한다.
// 반환: { ran, ok, message }
function installWorktreeDeps(absWtPath) {
  if (!absWtPath || !fs.existsSync(absWtPath)) return { ran: false, ok: true, message: "" };

  const pkgJsonPath = path.join(absWtPath, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return { ran: false, ok: true, message: "" };

  const { pm, installCmd } = detectPm(absWtPath, pkgJsonPath);

  if (fs.existsSync(path.join(absWtPath, "node_modules"))) {
    // deps 설치는 스킵. 단 husky 완전성이 깨졌으면 prepare로 shim·hooksPath만 복구한다.
    if (!usesHusky(absWtPath, pkgJsonPath) || huskyHooksHealthy(absWtPath)) {
      return { ran: false, ok: true, message: "" };
    }
    const preparePm = pm || "npm";
    try {
      execSync(`${preparePm} run prepare`, { cwd: absWtPath, stdio: "pipe", timeout: 5 * 60 * 1000 });
      return { ran: true, ok: true, message: `워크트리 husky 셋업 복구 (${preparePm} run prepare): ${absWtPath}` };
    } catch (e) {
      const stderr = (e.stderr && e.stderr.toString()) || (e.stdout && e.stdout.toString()) || e.message || "";
      return { ran: true, ok: false, message: `워크트리 husky 복구 실패 (${preparePm} run prepare @ ${absWtPath}): ${stderr.slice(-400)}` };
    }
  }

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

// husky를 쓰는 프로젝트인지: 커밋된 .husky/ 디렉토리가 있거나 prepare 스크립트가 husky를 호출한다.
function usesHusky(absWtPath, pkgJsonPath) {
  if (fs.existsSync(path.join(absWtPath, ".husky"))) return true;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    const prepare = pkg.scripts && pkg.scripts.prepare;
    return typeof prepare === "string" && prepare.includes("husky");
  } catch {
    return false;
  }
}

// husky 훅 셋업이 온전한지: .husky/_ shim 디렉토리 존재 + core.hooksPath가 .husky/_(표준값)인지.
function huskyHooksHealthy(absWtPath) {
  if (!fs.existsSync(path.join(absWtPath, ".husky", "_"))) return false;
  try {
    const hooksPath = execSync("git config core.hooksPath", { cwd: absWtPath, stdio: "pipe" })
      .toString()
      .trim()
      .replace(/\\/g, "/")
      .replace(/\/$/, "");
    return hooksPath.endsWith(".husky/_");
  } catch {
    // core.hooksPath 미설정 → 표준 셋업 아님 → 불완전.
    return false;
  }
}

export { installWorktreeDeps };
