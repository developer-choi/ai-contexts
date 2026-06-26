#!/usr/bin/env node
// husky pre-commit — git commit의 staged 변경에 backlog 경로 정책을 빠르게 강제한다(커밋 전 차단).
// cherry-pick·merge·amend는 pre-commit이 안 도므로 reference-transaction(check-backlog-ref.js)이
// 백스톱으로 같은 정책을 강제한다. 판정 로직은 backlog-path-policy.js 한 곳을 공유한다.
const { execFileSync } = require("child_process");
const { parseNameStatusZ, findViolations, formatViolations } = require("./backlog-path-policy");

let branch = "";
try {
  branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  /* detached 등 — branch는 빈 문자열, Rule B는 backlog일 때만 적용되므로 무해 */
}

let raw;
try {
  raw = execFileSync("git", ["diff", "--cached", "--name-status", "-z"], { encoding: "utf8" });
} catch {
  console.error("git diff --cached 실행 실패");
  process.exit(1);
}

const violations = findViolations(parseNameStatusZ(raw), branch);
if (violations.length) {
  console.error(formatViolations(violations));
  process.exit(1);
}
