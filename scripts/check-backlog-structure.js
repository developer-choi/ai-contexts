#!/usr/bin/env node
// backlog/projects/<project>/ 바로 아래 허용 디렉토리는 active/·inactive/ 뿐임을 커밋 시점에 강제한다.
// husky pre-commit에서 호출된다. 위반 경로가 staged면 deny(exit 1)하고 허용 디렉토리를 안내한다.
//
// 규칙 SSOT: deploy/skills/backlog/SKILL.md 「active / inactive / domains 격리」.
//   - active/  : 진행 중·근시일 백로그 (표면화 대상)
//   - inactive/: 보관·아이디어 (표면화 제외). domains는 active/inactive 하위에 중첩.
// rules-as-code 판정: 파일 구조·금지 경로 → hook (LLM 판단 0, 순수 경로 매칭이라 강제 칸).
const { spawnSync } = require("child_process");

const ALLOWED = new Set(["active", "inactive"]);
const PREFIX = "backlog/projects/";

const violations = stagedPaths().filter(isViolation);

if (violations.length) {
  console.error(
    [
      "✘ backlog 구조 위반 — projects/<project>/ 아래 허용 폴더는 active/, inactive/ 뿐입니다.",
      "  (domains는 active/domains/ · inactive/domains/ 로 중첩)",
      "",
      "위반 경로:",
      ...violations.map((p) => `  - ${p}`),
      "",
      "해당 파일을 active/ 또는 inactive/ 하위로 옮긴 뒤 다시 커밋하세요.",
    ].join("\n"),
  );
  process.exit(1);
}

// 새로 추가(A)·이름변경(R)·복사(C)된 경로만 본다. 기존 위반 폴더 안 파일의 수정(M)·삭제(D)는
// 막지 않아야 위반을 정리(이동·삭제)할 수 있다.
function stagedPaths() {
  const out = spawnSync("git", ["diff", "--cached", "--name-only", "-z", "--diff-filter=ACR"], {
    encoding: "utf8",
  });
  if (out.status !== 0) {
    console.error(out.stderr || "git diff --cached 실행 실패");
    process.exit(1);
  }
  return out.stdout
    .split("\0")
    .filter(Boolean)
    .map((p) => p.replace(/\\/g, "/"));
}

function isViolation(p) {
  if (!p.startsWith(PREFIX)) return false;
  const segs = p.slice(PREFIX.length).split("/"); // [<project>, <child>, ...]
  if (segs.length < 2) return false; // projects/<project> 단독은 트리에 남지 않음
  return !ALLOWED.has(segs[1]);
}
