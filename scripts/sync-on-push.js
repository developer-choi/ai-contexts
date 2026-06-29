#!/usr/bin/env node
// husky pre-push — master(메인 브랜치)를 push할 때 sync:system + sync:local-system을 함께 돌린다.
// sync가 하나라도 실패하면 non-zero로 종료해 push 자체를 막는다(gate). 배포가 깨진 채 master가 나가는 것을 방지.
// master가 아닌 브랜치 push나 master 삭제(local sha all-zero)에는 발화하지 않는다.
const path = require("path");
const { execFileSync } = require("child_process");

const ZERO = /^0+$/; // delete 시 local sha가 전부 0
const repoRoot = path.resolve(__dirname, "..");

// pre-push stdin 각 줄: "<local_ref> <local_sha> <remote_ref> <remote_sha>"
function pushingMaster(stdin) {
  return stdin
    .split("\n")
    .map((l) => l.trim().split(/\s+/))
    .some(([, localSha, remoteRef]) => remoteRef === "refs/heads/master" && localSha && !ZERO.test(localSha));
}

function main() {
  let stdin = "";
  try {
    stdin = require("fs").readFileSync(0, "utf8");
  } catch {
    /* stdin 없음 — 아래에서 skip */
  }
  if (!pushingMaster(stdin)) return;

  const steps = [
    ["sync:system", path.join("scripts", "system", "sync-system.js")],
    ["sync:local-system", path.join("scripts", "local-system", "sync-local-system.js")],
  ];
  for (const [name, rel] of steps) {
    console.log(`pre-push: master 푸시 — ${name} 실행`);
    try {
      execFileSync(process.execPath, [path.join(repoRoot, rel)], { cwd: repoRoot, stdio: "inherit" });
    } catch {
      console.error(`pre-push: ${name} 실패 — push를 중단합니다. sync를 고친 뒤 다시 push하세요 (긴급 우회: git push --no-verify).`);
      process.exit(1);
    }
  }
}

if (require.main === module) main();
module.exports = { pushingMaster };
