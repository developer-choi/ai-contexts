#!/usr/bin/env node
// reference-transaction hook — backlog 브랜치 tip 갱신마다 경로 정책을 강제한다.
// pre-commit이 못 잡는 cherry-pick·merge·amend까지 잡는다(모든 ref 갱신에 발화하므로).
// abort는 prepared 단계에서 exit 1로 한다(committed 단계는 이미 확정이라 못 막음).
//
// rebase 진행 중(rebase-merge/apply 존재)엔 skip한다 — backlog를 master 위로 rebase해
// 인프라를 받는 정상 흐름은 master의 커밋을 backlog 히스토리에 넣으므로, 막으면 안 된다.
// (GIT_REFLOG_ACTION은 이 hook에 전달되지 않아 rebase 디렉토리 존재로 판별한다 — 실측 확인.)
const { execFileSync } = require("child_process");
const fs = require("fs");
const { parseNameStatusZ, findViolations, formatViolations, rebaseInProgress } = require("./backlog-path-policy");

if (process.argv[2] !== "prepared") process.exit(0);
if (rebaseInProgress()) process.exit(0);

const ZERO = "0".repeat(40);
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"; // git의 빈 트리(브랜치 신규 생성 시 base)

let stdin = "";
try {
  stdin = fs.readFileSync(0, "utf8");
} catch {
  process.exit(0);
}

for (const line of stdin.split("\n")) {
  const [oldOid, newOid, ref] = line.split(" ");
  if (ref !== "refs/heads/backlog") continue;
  if (!newOid || newOid === ZERO) continue; // 브랜치 삭제는 무관

  const base = oldOid && oldOid !== ZERO ? oldOid : EMPTY_TREE;
  let raw;
  try {
    raw = execFileSync("git", ["diff", "--name-status", "-z", base, newOid], { encoding: "utf8" });
  } catch {
    continue;
  }
  const violations = findViolations(parseNameStatusZ(raw), "backlog");
  if (violations.length) {
    process.stderr.write(formatViolations(violations) + "\n");
    process.exit(1); // prepared 단계 abort → ref 갱신 취소
  }
}
process.exit(0);
