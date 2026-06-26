// backlog 브랜치 경로 정책 — pre-commit과 reference-transaction이 공유하는 단일 판정 로직.
// 드리프트 방지를 위해 "어떤 변경이 위반인가"는 여기 한 곳에서만 정의한다.
//
// 규칙 SSOT: deploy/skills/backlog/SKILL.md 「active / inactive / domains 격리」 + 브랜치 운영방침.
//   Rule B (브랜치 스코프): backlog 브랜치에선 backlog/ · archives/ 하위만 수정·생성·삭제 가능.
//   Rule A (경로 스코프):  backlog/projects/<project>/ 직속은 active/ · inactive/ 만(신규 배치 한정).
// rules-as-code: 파일 구조·금지 경로는 LLM 판단 0인 강제 칸.

const ALLOWED_TOP = /^(backlog|archives)\//;
const PROJECTS = "backlog/projects/";
const ALLOWED_CHILD = new Set(["active", "inactive"]);

// git `--name-status -z` 출력을 [{status, path}]로 파싱한다.
// A/M/D: <status>\0<path>\0,  R/C: <status>\0<old>\0<new>\0 (new를 path로 쓴다).
function parseNameStatusZ(buf) {
  const fields = buf.split("\0").filter((s) => s.length > 0);
  const out = [];
  for (let i = 0; i < fields.length; ) {
    const status = fields[i][0]; // R100 → 'R'
    if (status === "R" || status === "C") {
      out.push({ status, path: fields[i + 2] });
      i += 3;
    } else {
      out.push({ status, path: fields[i + 1] });
      i += 2;
    }
  }
  return out;
}

// changes: [{status, path}], branch: 현재(또는 갱신 대상) 브랜치명.
// 반환: [{path, rule, msg}] 위반 목록.
function findViolations(changes, branch) {
  const out = [];
  for (const { status, path } of changes) {
    const p = path.replace(/\\/g, "/");

    // Rule B — backlog 브랜치는 backlog/ · archives/ 만. 수정·생성·삭제 전부.
    if (branch === "backlog" && !ALLOWED_TOP.test(p)) {
      out.push({ path: p, rule: "B", msg: "backlog 브랜치는 backlog/ · archives/ 하위만 변경 가능" });
      continue; // Rule B 위반이면 Rule A는 볼 필요 없음
    }

    // Rule A — projects/<project>/ 직속 신규 배치(A/C/R)는 active/ · inactive/ 만.
    // 기존 폴더 안 파일의 수정(M)·삭제(D)는 정리를 위해 허용한다.
    if ((status === "A" || status === "C" || status === "R") && p.startsWith(PROJECTS)) {
      const segs = p.slice(PROJECTS.length).split("/");
      if (segs.length >= 2 && !ALLOWED_CHILD.has(segs[1])) {
        out.push({ path: p, rule: "A", msg: "projects/<project>/ 직속은 active/ · inactive/ 만" });
      }
    }
  }
  return out;
}

function formatViolations(violations) {
  const lines = ["✘ backlog 경로 정책 위반:"];
  const byRule = { B: [], A: [] };
  for (const v of violations) byRule[v.rule].push(v.path);
  if (byRule.B.length) {
    lines.push("", "[backlog 브랜치 허용 범위 초과] backlog/ · archives/ 하위만 수정·생성·삭제 가능합니다:");
    byRule.B.forEach((p) => lines.push(`  - ${p}`));
    lines.push("  → 인프라(스킬·룰·스크립트 등)는 master에서 작업하고, backlog는 master 위 rebase로 받습니다.");
  }
  if (byRule.A.length) {
    lines.push("", "[구조 위반] projects/<project>/ 바로 아래 허용 폴더는 active/ · inactive/ 뿐입니다:");
    byRule.A.forEach((p) => lines.push(`  - ${p}`));
    lines.push("  → active/ 또는 inactive/ 하위로 옮기세요. (domains는 그 하위 중첩)");
  }
  return lines.join("\n");
}

module.exports = { parseNameStatusZ, findViolations, formatViolations };
