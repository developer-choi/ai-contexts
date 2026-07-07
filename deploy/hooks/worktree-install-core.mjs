import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// 새 워크트리(absWtPath)가 의존성 미설치 상태의 JS 프로젝트면 패키지 매니저로 설치한다.
//
// 훅 발동 자체는 이 설치에 의존하지 않는다 — 개인 레포는 추적되는 .githooks 붙박이 훅으로
// 전환돼, 훅 파일이 체크아웃에 항상 딸려오고 core.hooksPath(.git/config 공용)를 상속한다.
// deps가 없어도 훅은 fail-loud로 커밋을 막으므로(예: commitlint 미설치 시 npx --no exit 1),
// 이 설치는 "안전"이 아니라 "편의(DX)"다 — AI가 새 워크트리에서 바로 커밋할 수 있게 deps를 채운다.
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

export { installWorktreeDeps };
