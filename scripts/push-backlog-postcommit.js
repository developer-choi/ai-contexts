#!/usr/bin/env node
// husky post-commit — backlog 브랜치 커밋을 즉시 origin/backlog로 푸시한다.
// 다른 브랜치(master 등)·rebase 재생 중에는 발화하지 않는다.
// post-commit은 커밋을 되돌릴 수 없으므로 푸시 실패는 경고만 하고 exit 0(soft-fail).
const { execFileSync } = require("child_process");
const { rebaseInProgress } = require("./backlog-path-policy");

if (rebaseInProgress()) process.exit(0);

let branch = "";
try {
  branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  process.exit(0); // detached 등 — backlog가 아니므로 skip
}
if (branch !== "backlog") process.exit(0);

try {
  execFileSync("git", ["push", "origin", "backlog"], { stdio: "inherit" });
} catch {
  console.warn("post-commit: origin/backlog 푸시 실패 — 커밋은 로컬에 남아있음. 수동으로 `git push origin backlog` 하세요.");
  process.exit(0);
}
