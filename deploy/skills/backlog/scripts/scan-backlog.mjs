#!/usr/bin/env node
// 백로그 항목 색인·검색 — `/backlog` 캡처 전 「기존 항목 대조」의 기계 파트.
//
// 왜 스크립트인가: 대조는 "빠짐없이 훑었는가"가 전부인데, LLM에게 Glob·Read를 맡기면
// topic 디렉토리 하나만 보고 넘어가거나 inactive/를 빼먹는다. 목록 나열은 판단이 필요 없는
// 기계적 작업이라 여기서 결정론적으로 끝내고, LLM에는 "이 후보가 같은 항목인가"라는
// 판단 하나만 남긴다.
//
// 사용법:
//   node scan-backlog.mjs --project ai-contexts
//       → 그 프로젝트의 active/·inactive/ 전 항목을 `경로 :: status :: title`로 나열
//   node scan-backlog.mjs --project ai-contexts --grep "frontmatter,어휘,화이트리스트"
//       → 키워드(쉼표 구분) 중 하나라도 걸리는 항목만, 걸린 줄과 함께 나열
//   node scan-backlog.mjs --grep "..."            (--project 생략 = 전 프로젝트)
//   node scan-backlog.mjs --target deploy/skills/backlog/
//       → frontmatter target이 그 경로와 겹치는 항목 (커밋 deps 게이트 선점검용)
//   --root <경로>  백로그 레포 루트 (기본 ~/WebstormProjects/main/backlog)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const ROOT =
  opt("root") || path.join(os.homedir(), "WebstormProjects", "main", "backlog");
const PROJECT = opt("project");
const GREP = (opt("grep") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TARGET = opt("target");

const base = PROJECT ? path.join(ROOT, "projects", PROJECT) : path.join(ROOT, "projects");
if (!fs.existsSync(base)) {
  console.error(`경로 없음: ${base}`);
  console.error(PROJECT ? `프로젝트 '${PROJECT}'가 아직 없다 — 이 프로젝트의 첫 항목이다.` : "");
  process.exit(1);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
  }
  return out;
}

// frontmatter는 첫 줄이 `---`일 때만 유효하다. 없으면 본문 `# H1`이 제목 역할.
function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  let fm = [];
  let body = lines;
  if (lines[0]?.trim() === "---") {
    const end = lines.indexOf("---", 1);
    if (end > 0) {
      fm = lines.slice(1, end);
      body = lines.slice(end + 1);
    }
  }
  const scalar = (key) => {
    const hit = fm.find((l) => l.startsWith(`${key}:`));
    return hit ? hit.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : "";
  };
  // target은 스칼라·리스트 둘 다 온다.
  const targets = [];
  const ti = fm.findIndex((l) => l.startsWith("target:"));
  if (ti >= 0) {
    const inline = fm[ti].slice(7).trim();
    if (inline && !inline.startsWith("[")) targets.push(inline);
    if (inline.startsWith("[")) targets.push(...inline.slice(1, -1).split(",").map((s) => s.trim()));
    for (let i = ti + 1; i < fm.length && /^\s*-\s+/.test(fm[i]); i++) {
      targets.push(fm[i].replace(/^\s*-\s+/, "").trim());
    }
  }
  const h1 = body.find((l) => /^#\s+/.test(l)) || "";
  return {
    title: scalar("title") || h1.replace(/^#\s+/, "").trim() || "(제목 없음)",
    status: scalar("status") || "(무상태)",
    targets: targets.map((t) => t.replace(/\/+$/, "")),
    text,
    body,
  };
}

const files = walk(base).sort();
const rows = [];

for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const item = parse(file);

  if (TARGET) {
    const want = TARGET.replace(/\/+$/, "");
    const overlap = item.targets.some((t) => t.startsWith(want) || want.startsWith(t));
    if (!overlap) continue;
    rows.push(`${rel} :: ${item.status} :: ${item.title}\n    target: ${item.targets.join(", ")}`);
    continue;
  }

  if (GREP.length) {
    const hits = [];
    for (const kw of GREP) {
      const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const line = item.text.split(/\r?\n/).find((l) => re.test(l));
      if (line) hits.push(`[${kw}] ${line.trim().slice(0, 120)}`);
    }
    if (!hits.length) continue;
    rows.push(`${rel} :: ${item.status} :: ${item.title}\n    ${hits.join("\n    ")}`);
    continue;
  }

  rows.push(`${rel} :: ${item.status} :: ${item.title}`);
}

console.log(rows.join("\n"));
console.log(
  `\n--- ${rows.length}건 / 스캔 ${files.length}건 (${PROJECT ? `projects/${PROJECT}` : "projects 전체"}, active·inactive 포함) ---`,
);
if (GREP.length && !rows.length) {
  console.log("키워드 히트 0건 — 다른 표현으로 한 번 더 돌려본 뒤 신규로 판단한다.");
}
