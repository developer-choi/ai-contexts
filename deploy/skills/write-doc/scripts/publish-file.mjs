#!/usr/bin/env node
// 패키지 본문을 발행 파일에 쓴다. 패키지 frontmatter는 떼고, 발행 파일이 원래 가진 frontmatter만 남긴다.
//
// 메인이 git 원본과 견줘 손으로 떼면 필드가 하나 더 지워지거나 남아도 아무 데서도 안 걸린다.
// 남길 frontmatter 블록은 이렇게 고른다.
//   - 패키지와 발행 파일이 같으면 `git show <base>:<파일>`의 블록(기본 HEAD). 추적되지 않았거나 원본에 블록이 없으면 붙이지 않는다.
//     그 블록에 패키지 필드가 있으면 멈춘다 — 붙인 frontmatter가 작업 중에 커밋돼, 원본으로 보면 하나도 안 떼진다.
//     그때는 붙이기 전 커밋을 --base로 준다.
//   - 다르면 발행 파일이 지금 가진 블록. 파일이 없으면 폴더째 만든다.
// 남은 `[//]: #` 주석은 보지 않는다 — 마무리 단계의 남은 주석 확인(`score.mjs --residual`)이 모든 발행처에 먼저 돈다.
//
// 사용: node publish-file.mjs <패키지.md> <발행 파일> [--base <커밋>]   (두 경로가 같아도 된다)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// 패키지에만 쓰는 필드. check-package-frontmatter 훅이 패키지로 알아보는 필수 필드(type 밖)와 같다.
const PACKAGE_ONLY_FIELDS = ["audience_knowledge", "purpose", "key_message"];

// 맨 앞 `---`~`---` 블록과 나머지 본문으로 가른다. 블록이 없으면 block은 null.
function split(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const m = /^---\n[\s\S]*?\n---\n/.exec(normalized);
  return m ? { block: m[0], body: normalized.slice(m[0].length) } : { block: null, body: normalized };
}

const keys = (block) => (block ? [...block.matchAll(/^([A-Za-z_][\w-]*):/gm)].map((m) => m[1]) : []);

function committedVersion(file, base) {
  const dir = path.dirname(path.resolve(file));
  const run = (args) => spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" });
  const rel = run(["ls-files", "--full-name", "--", path.basename(file)]).stdout?.trim();
  if (!rel) return null;
  const show = run(["show", `${base}:${rel}`]);
  return show.status === 0 ? show.stdout : null;
}

const args = process.argv.slice(2);
const baseAt = args.indexOf("--base");
const base = baseAt === -1 ? "HEAD" : args.splice(baseAt, 2)[1];
const [pkg, dest] = args;
if (!pkg || !dest || !base) {
  console.error("사용: node publish-file.mjs <패키지.md> <발행 파일> [--base <커밋>]");
  process.exit(1);
}

const pkgParts = split(fs.readFileSync(pkg, "utf8"));
const same = path.resolve(pkg) === path.resolve(dest);
const original = same ? committedVersion(dest, base) : fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : null;
const kept = original === null ? null : split(original).block;

const leaked = keys(kept).filter((k) => PACKAGE_ONLY_FIELDS.includes(k));
if (same && leaked.length) {
  console.error(`${base}의 frontmatter에 패키지 필드(${leaked.join(", ")})가 커밋돼 있다 — 붙이기 전 커밋을 --base로 준다`);
  process.exit(1);
}

// 원래 CRLF였던 파일을 LF로 바꾸면 모든 줄이 diff에 잡힌다.
const out = (kept ?? "") + pkgParts.body.replace(/^\n+/, kept ? "\n" : "");
fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true });
fs.writeFileSync(dest, /\r\n/.test(original ?? "") ? out.replace(/\n/g, "\r\n") : out);

const removed = keys(pkgParts.block).filter((k) => !keys(kept).includes(k));
console.log(`발행: ${dest}`);
console.log(`뗀 필드: ${removed.join(", ") || "없음"}`);
console.log(`남긴 필드: ${keys(kept).join(", ") || "없음"}`);
