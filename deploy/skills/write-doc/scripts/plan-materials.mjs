#!/usr/bin/env node
// pr-body 재료 자리 찾기 — 대상 레포 메인 체크아웃의 `plan/` 아래 이름 목록과 todo가 든 md 목록을 낸다.
//
// `plan/`은 git 밖이라 워크트리에 따라오지 않아, 워크트리에서 작업해도 메인 체크아웃 쪽을 봐야 한다.
// 메인 체크아웃 찾기·이름 나열·todo 검색은 판단 없는 명령이라 손으로 돌리지 않는다. 파일 내용은 내지 않는다 —
// 어느 것이 이 PR의 재료인지는 이름을 보고 메인이 추론하고, 후보마다 열면 쓰지 않을 재료까지 컨텍스트에 실린다.
//
// 사용: node plan-materials.mjs <대상 레포 안 아무 경로>
//
// todo는 파일 이름에 todo가 든 md(대소문자 무시), 곧 메모 바구니다. 내용은 보지 않는다 — 내용에 낱말이 한 번 나온
// 계획 문서·회고까지 섞여, 이름 목록만 보고 추론하려던 것이 깨진다.
//
// node_modules와 점으로 시작하는 폴더(.reviewed 리뷰 장부, .expo 등)는 이름만 내고 안으로 들어가지 않는다. plan/ 안에 실험용 앱을 두면
// 의존 패키지의 README·CHANGELOG까지 수만 줄이 나와, 「이름 목록만 보고 추론한다」가 출력 단계에서 깨진다.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// `git worktree list --porcelain`의 첫 worktree가 메인 체크아웃이다.
function mainCheckout(anyPath) {
  const out = execFileSync("git", ["-C", anyPath, "worktree", "list", "--porcelain"], { encoding: "utf8" });
  const first = out.split(/\r?\n/).find((line) => line.startsWith("worktree "));
  return path.resolve(first.slice("worktree ".length));
}

const isSkippedDir = (name) => name === "node_modules" || name.startsWith(".");

function walk(dir, rel = "") {
  const out = [];
  const dirents = fs.readdirSync(dir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  for (const dirent of dirents) {
    const relPath = rel ? `${rel}/${dirent.name}` : dirent.name;
    if (!dirent.isDirectory()) out.push(relPath);
    else if (isSkippedDir(dirent.name)) out.push(`${relPath}/ (안 들어감)`);
    else out.push(`${relPath}/`, ...walk(path.join(dir, dirent.name), relPath));
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
  console.log(entries.map((entry) => `- ${entry}`).join("\n") || "- 없음");

  const todos = entries.filter((relPath) => relPath.endsWith(".md") && /todo/i.test(path.basename(relPath)));
  console.log("\n## todo md");
  console.log(todos.map((relPath) => `- plan/${relPath}`).join("\n") || "- 없음");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
