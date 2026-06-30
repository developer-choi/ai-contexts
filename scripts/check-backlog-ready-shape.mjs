#!/usr/bin/env node
// husky pre-commit — staged 변경 중 ai-contexts·private-playground의 active/ .md에서
// `### 기대상황`을 갖는 `## [ready]` 트래커 항목이 현재상태·현재 생각중인 방법을 비어있지 않게
// 가졌는지 강제한다(커밋 전 차단). 판정 로직은 backlog-ready-shape.mjs 한 곳을 공유한다.
//
// rebase 재생 커밋은 신규 변경이 아니므로 skip(backlog-path-policy와 같은 이유).
import { execFileSync } from "node:child_process";
import { parseNameStatusZ, rebaseInProgress } from "./backlog-path-policy.mjs";
import { isTrackerPath, findViolations, formatViolations } from "./backlog-ready-shape.mjs";

if (rebaseInProgress()) process.exit(0);

let raw;
try {
  raw = execFileSync("git", ["diff", "--cached", "--name-status", "-z"], { encoding: "utf8" });
} catch {
  console.error("git diff --cached 실행 실패");
  process.exit(1);
}

// A(추가)·M(수정)·C(복사)·R(이름변경)만 검사한다. D(삭제)는 무관.
const files = [];
for (const { status, path } of parseNameStatusZ(raw)) {
  if (status === "D") continue;
  if (!isTrackerPath(path)) continue;
  try {
    const content = execFileSync("git", ["show", `:${path}`], { encoding: "utf8" });
    files.push({ path, content });
  } catch {
    /* staged blob 읽기 실패 — 스킵(삭제 경합 등) */
  }
}

const violations = findViolations(files);
if (violations.length) {
  console.error(formatViolations(violations));
  process.exit(1);
}
