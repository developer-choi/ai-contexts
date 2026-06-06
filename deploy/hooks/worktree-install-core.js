const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 새 워크트리(absWtPath)가 의존성 미설치 상태의 JS 프로젝트면 패키지 매니저로 설치한다.
// 설치가 끝나면 npm 계열의 prepare(=husky)가 .husky/_ shim과 core.hooksPath를 복구하므로
// raw `git worktree add` / EnterWorktree로 만든 워크트리의 commitlint 우회가 사라진다.
// 반환: { ran, ok, message }
function installWorktreeDeps(absWtPath) {
  if (!absWtPath || !fs.existsSync(absWtPath)) return { ran: false, ok: true, message: "" };

  const pkgJsonPath = path.join(absWtPath, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return { ran: false, ok: true, message: "" };
  if (fs.existsSync(path.join(absWtPath, "node_modules"))) return { ran: false, ok: true, message: "" };

  let pm = null;
  let installCmd = null;
  if (fs.existsSync(path.join(absWtPath, "pnpm-lock.yaml"))) {
    pm = "pnpm";
    installCmd = "pnpm install --frozen-lockfile";
  } else if (fs.existsSync(path.join(absWtPath, "yarn.lock"))) {
    pm = "yarn";
    installCmd = "yarn install --frozen-lockfile";
  } else if (fs.existsSync(path.join(absWtPath, "package-lock.json"))) {
    pm = "npm";
    installCmd = "npm ci";
  } else {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      if (pkg.packageManager) {
        const name = String(pkg.packageManager).split("@")[0];
        if (name === "pnpm") {
          pm = "pnpm";
          installCmd = "pnpm install";
        } else if (name === "yarn") {
          pm = "yarn";
          installCmd = "yarn install";
        } else if (name === "npm") {
          pm = "npm";
          installCmd = "npm install";
        }
      }
    } catch {}
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

module.exports = { installWorktreeDeps };
