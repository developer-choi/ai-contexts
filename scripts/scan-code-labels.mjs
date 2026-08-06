// md 전수를 `check-md-code-labels` 훅에 먹여, 지금 알림이 뜰 토큰을 한 번에 모은다.
//
// 훅은 문서를 쓰는 순간 한 건씩 알리므로 "무엇이 얼마나 걸리는지"를 못 보여준다. 예외로
// 등록할 실존 용어를 고르려면 전수 목록이 필요해서 이 스크립트를 따로 둔다.
//
// 판정은 훅을 그대로 실행해서 받는다 — 여기서 규칙을 다시 구현하면 훅과 어긋난다.
//
// 사용: npm run scan:code-labels [-- <레포경로>...]
//       인자를 생략하면 이 레포의 형제 디렉터리 중 git 레포를 전부 훑는다.
import cp from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "deploy", "hooks", "check-md-code-labels.mjs");
const SKIP_DIRS = new Set(["node_modules", ".git", ".claude", ".agents", ".codex", ".gemini", "dist", "build", "coverage"]);

const roots = process.argv.slice(2).length ? process.argv.slice(2) : siblingRepos();
const tokens = new Map(); // token → { count, files:Set, sample }
let scanned = 0;

for (const root of roots) {
  for (const file of walkMd(root)) {
    scanned++;
    for (const token of hookVerdict(file)) {
      const entry = tokens.get(token) ?? { count: 0, files: new Set(), sample: "" };
      entry.count++;
      entry.files.add(path.relative(path.dirname(root), file));
      if (!entry.sample) entry.sample = sampleLine(file, token);
      tokens.set(token, entry);
    }
  }
}

const rows = [...tokens.entries()].sort((a, b) => b[1].count - a[1].count);
console.log(`md ${scanned}개 훑음 — 알림이 뜨는 토큰 ${rows.length}종\n`);
for (const [token, e] of rows) {
  console.log(`${token.padEnd(8)} ${String(e.count).padStart(3)}회  ${e.files.size}개 파일`);
  console.log(`${" ".repeat(9)}${e.sample}`);
  console.log(`${" ".repeat(9)}${[...e.files][0]}`);
}
console.log(
  `\n기본은 문서를 고치는 것이다. 여러 문서에서 계속 쓸 실존 용어(V8·S3처럼)로 판명된 것만\n` +
    `deploy/hooks/check-md-code-labels.mjs의 KNOWN_TERMS에 넣는다 — 한두 번 나오는 토큰은\n` +
    `등록 비용이 문서를 고치는 것보다 크다.`,
);

// 훅을 실제로 돌려 알림에 실린 토큰 목록을 받는다.
function hookVerdict(file) {
  const payload = { tool_name: "Write", tool_input: { file_path: file, content: fs.readFileSync(file, "utf8") } };
  const res = cp.spawnSync(process.execPath, [HOOK], { input: JSON.stringify(payload), encoding: "utf8" });
  const out = (res.stdout || "").trim();
  if (!out) return [];
  const ctx = JSON.parse(out).hookSpecificOutput?.additionalContext;
  const list = ctx?.match(/토큰이 있다: (.+)/)?.[1];
  return list ? list.split(", ") : [];
}

function sampleLine(file, token) {
  const line = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => new RegExp(`\\b${token}\\b`).test(l));
  return (line ?? "").trim().slice(0, 90);
}

function walkMd(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(abs, out);
    else if (e.name.toLowerCase().endsWith(".md")) out.push(abs);
  }
  return out;
}

// 레포 목록을 하드코딩하면 레포가 늘 때마다 낡는다. 형제 디렉터리에서 찾는다.
// 워크트리는 제외한다 — 같은 파일을 본체와 중복으로 세고, 브랜치마다 내용이 달라 수치가
// 흔들린다. 본체는 `.git`이 폴더이고 워크트리는 파일이라 그것으로 갈린다.
function siblingRepos() {
  const parent = path.resolve(HERE, "..", "..");
  return fs
    .readdirSync(parent, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.statSync(path.join(parent, e.name, ".git"), { throwIfNoEntry: false })?.isDirectory())
    .map((e) => path.join(parent, e.name));
}
