#!/usr/bin/env node
// pr-body 재료 자리 찾기 — 대상 레포 메인 체크아웃의 `plan/` 아래 이름 목록과 todo가 든 md 목록을 낸다.
//
// `plan/`은 git 밖이라 워크트리에 따라오지 않아, 워크트리에서 작업해도 메인 체크아웃 쪽을 봐야 한다.
// 메인 체크아웃 찾기·이름 나열·todo 검색은 판단 없는 명령이라 손으로 돌리지 않는다. 파일 내용은 내지 않는다 —
// 어느 것이 이 PR의 재료인지는 이름을 보고 메인이 추론하고, 후보마다 열면 쓰지 않을 재료까지 컨텍스트에 실린다.
//
// 사용: node plan-materials.mjs <대상 레포 안 아무 경로>
//
// todo는 파일 이름이나 내용에 todo가 든 md(대소문자 무시)다. md만 본다 — 코드의 TODO 주석은 노이즈다.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// `git worktree list --porcelain`의 첫 worktree가 메인 체크아웃이다.
function mainCheckout(anyPath) {
  const out = execFileSync("git", ["-C", anyPath, "worktree", "list", "--porcelain"], { encoding: "utf8" });
  const first = out.split(/\r?\n/).find((ln) => ln.startsWith("worktree "));
  return path.resolve(first.slice("worktree ".length));
}

function walk(dir, rel = "") {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(`${r}/`, ...walk(path.join(dir, e.name), r));
    else out.push(r);
  }
  return out;
}

function main() {
  const anyPath = process.argv[2];
  if (!anyPath) {
    console.error("사용: node plan-materials.mjs <대상 레포 안 아무 경로>");
    process.exit(1);
  }
  const root = mainCheckout(anyPath);
  const plan = path.join(root, "plan");
  console.log(`메인 체크아웃: ${root}`);
  if (!fs.existsSync(plan)) {
    console.log("plan/ 없음 — 재료 자리 찾기를 건너뛴다");
    return;
  }
  const entries = walk(plan);
  console.log(`\n## plan/ 아래 이름 (${entries.length}개)`);
  console.log(entries.map((e) => `- ${e}`).join("\n") || "- 없음");

  const todos = entries.filter(
    (e) => e.endsWith(".md") && (/todo/i.test(path.basename(e)) || /todo/i.test(fs.readFileSync(path.join(plan, e), "utf8"))),
  );
  console.log("\n## todo가 든 md (이름이나 내용)");
  console.log(todos.map((e) => `- plan/${e}`).join("\n") || "- 없음");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
