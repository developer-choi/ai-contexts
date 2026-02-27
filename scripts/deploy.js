const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const deployDir = path.join(__dirname, "..", "deploy");
const homeDir = os.homedir();
const targets = [".claude", ".gemini"];

function collectFiles(dir, base) {
  const files = [];
  for (const child of fs.readdirSync(dir)) {
    const full = path.join(dir, child);
    const rel = path.join(base, child);
    if (fs.statSync(full).isDirectory()) {
      files.push(...collectFiles(full, rel));
    } else {
      files.push(rel);
    }
  }
  return files;
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  console.log("=== deploy → ~ 복사 시작 ===\n");

  // 겹치는 파일 찾기
  const conflicts = [];
  const newFiles = [];

  for (const target of targets) {
    const src = path.join(deployDir, target);
    if (!fs.existsSync(src)) continue;

    for (const rel of collectFiles(src, target)) {
      const dest = path.join(homeDir, rel);
      if (fs.existsSync(dest)) {
        conflicts.push(rel);
      } else {
        newFiles.push(rel);
      }
    }
  }

  if (newFiles.length > 0) {
    console.log("새로 추가될 파일:");
    for (const f of newFiles) console.log(`  + ~/${f}`);
    console.log();
  }

  if (conflicts.length > 0) {
    console.log("덮어쓸 파일:");
    for (const f of conflicts) console.log(`  ! ~/${f}`);
    console.log();

    const answer = await ask("덮어쓰시겠습니까? (y/n): ");
    if (answer !== "y" && answer !== "yes") {
      console.log("취소되었습니다.");
      return;
    }
    console.log();
  }

  // 복사 실행
  for (const target of targets) {
    const src = path.join(deployDir, target);
    if (!fs.existsSync(src)) continue;
    copyRecursive(src, path.join(homeDir, target));
    console.log(`[OK] ${target} → ~/${target}`);
  }

  console.log("\n=== 완료 ===");
}

main();
