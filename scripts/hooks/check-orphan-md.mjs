#!/usr/bin/env node
// 전역 git pre-commit 훅. 이 커밋 때문에 아무도 안 부르게 된 프롬프트 md를 알린다(차단하지 않는다).
// ~/.ai-contexts/에 그대로 복사돼 어느 레포에서든 돌므로 AC의 다른 모듈을 import하지 않는다.
//
// 아무도 안 부르는 md는 있어도 안 읽히고, 낡아도 아무도 모른다. 레포 전체의 고아는
// AC `scripts/check-links.mjs`가 찾지만, 등록 레포를 다 훑어 한 번에 1분 가까이 걸려 커밋마다
// 돌릴 수 없다. 그래서 이 커밋이 만든 고아만 본다 — 새로 만든 md, 옮긴 md, 그리고 이 커밋이
// 지운 줄에 이름이 나오던 md. 레포 전체를 훑지 않으니 커밋을 늦추지 않는다.
//
// 「부른다」는 다른 추적 파일 어디에든 그 파일 이름이 나오는 것으로 본다(링크·백틱 경로·산문 모두).
// 폴더째 읽는 자리(「checklist/ 하위를 참조한다」)를 놓치지 않게, 그 파일이 든 폴더 이름이
// 다른 곳에 나와도 부른 것으로 친다 — check-links의 바구니 판정과 같은 이유다.
import { execFileSync } from "node:child_process";
import path from "node:path";

// 위치로 찾히는 진입점이라 아무도 이름을 안 불러도 정상이다.
const ENTRY_BASENAMES = new Set(["readme.md", "claude.md", "agents.md", "gemini.md", "skill.md", "map.md", "todo.md"]);

// 백로그 레포의 항목은 원래 아무도 안 부른다. 그 레포의 local/만 프롬프트 md다.
const BACKLOG_REPO = "backlog";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function repoName() {
  const common = git(["rev-parse", "--path-format=absolute", "--git-common-dir"]).trim();
  return path.basename(path.dirname(common));
}

// 프롬프트 md만 본다 — 지식 글·산출물까지 걸면 정상이 다 고아로 걸린다.
function isPromptMd(rel, repo) {
  if (!rel.toLowerCase().endsWith(".md")) return false;
  if (rel.startsWith("local/")) return true;
  if (repo === BACKLOG_REPO) return false;
  return rel.startsWith("deploy/") || /^(CLAUDE|AGENTS|GEMINI)\.md$/i.test(rel);
}

function stagedStatus() {
  const out = git(["diff", "--cached", "--name-status", "-M", "-z"]);
  const parts = out.split("\0").filter(Boolean);
  const rows = [];
  for (let i = 0; i < parts.length; ) {
    const status = parts[i++];
    if (status.startsWith("R") || status.startsWith("C")) rows.push({ status: status[0], from: parts[i++], to: parts[i++] });
    else rows.push({ status: status[0], to: parts[i++] });
  }
  return rows;
}

// 이 커밋이 지운 줄에 나온 md 이름. 링크를 걷거나 경로를 고친 자리에서 고아가 생긴다.
function removedMdNames() {
  const diff = git(["diff", "--cached", "-U0", "--no-color"]);
  const names = new Set();
  for (const line of diff.split("\n")) {
    if (!line.startsWith("-") || line.startsWith("---")) continue;
    for (const m of line.matchAll(/[\w\-./가-힣]+\.md\b/g)) names.add(path.posix.basename(m[0]));
  }
  return names;
}

function indexFiles() {
  return git(["ls-files", "--cached", "-z"]).split("\0").filter(Boolean);
}

// 그 낱말이 자기 말고 다른 추적 파일에 나오는가. 인덱스(이번 커밋 뒤 모습)를 본다.
function mentionedElsewhere(word, self) {
  let out = "";
  try {
    out = git(["grep", "--cached", "-l", "-F", "-I", "-e", word]);
  } catch {
    return false; // git grep은 찾은 게 없으면 1로 끝난다
  }
  return out.split("\n").some((f) => f && f !== self);
}

// 폴더 이름이 폴더 자체로 나오는가. `dir/파일.md`처럼 바로 뒤에 파일 이름이 붙은 것은 그 파일을
// 부른 것이지 폴더째 읽는 게 아니다(옮긴 뒤 안 고친 링크가 여기 걸린다).
function folderMentioned(dir, self) {
  let out = "";
  try {
    out = git(["grep", "--cached", "-h", "-F", "-I", "-e", `${dir}/`, "--", ":!" + self]);
  } catch {
    return false;
  }
  const esc = dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const asFolder = new RegExp(`${esc}/(?![\\w\\-가-힣./]*\\.md\\b)`);
  return out.split("\n").some((line) => asFolder.test(line));
}

// 폴더째 읽히는 자리인가. 폴더 이름이 어딘가에 나오는데 그 안의 md가 하나도 이름으로 안 불리면
// 그 폴더를 통째로 읽는 것으로 본다. 형제 하나라도 이름으로 불리면 파일마다 부르는 자리라, 거기서
// 혼자 안 불리는 파일은 고아다 — `contexts/b.md` 링크 안의 「contexts/」를 폴더째 읽기로 오인하지 않는다.
function inBasket(rel, all) {
  const dirPath = path.posix.dirname(rel);
  const dir = path.posix.basename(dirPath);
  if (!dir || dir === ".") return false;
  if (!folderMentioned(dir, rel)) return false;
  const siblings = all.filter((f) => f !== rel && path.posix.dirname(f) === dirPath && f.toLowerCase().endsWith(".md"));
  return !siblings.some((s) => mentionedElsewhere(path.posix.basename(s), s));
}

function main() {
  const repo = repoName();
  const all = indexFiles();
  const inIndex = new Set(all);
  const candidates = new Set();

  for (const row of stagedStatus()) {
    if (row.status === "A" || row.status === "R" || row.status === "C") candidates.add(row.to);
  }
  const removed = removedMdNames();
  if (removed.size) {
    for (const f of all) if (removed.has(path.posix.basename(f))) candidates.add(f);
  }

  const orphans = [];
  for (const rel of candidates) {
    if (!inIndex.has(rel) || !isPromptMd(rel, repo)) continue;
    const base = path.posix.basename(rel);
    if (ENTRY_BASENAMES.has(base.toLowerCase())) continue;
    if (mentionedElsewhere(base, rel)) continue;
    if (inBasket(rel, all)) continue;
    orphans.push(rel);
  }

  if (!orphans.length) return;
  console.error(
    [
      `[고아 md] 이 커밋 뒤로 아무도 이름을 부르지 않는 md가 ${orphans.length}건 있다:`,
      ...orphans.map((f) => `  ${f}`),
      "판단: 부를 자리(SKILL.md·인덱스 등)에 링크를 걸거나, 쓸 데가 없으면 지운다.",
      "      폴더째 읽히거나 다른 레포에서만 부르는 파일이면 그대로 둔다.",
    ].join("\n"),
  );
}

try {
  main();
} catch (e) {
  // 검사기가 깨져도 커밋은 막지 않는다 — 알림 훅이다.
  console.error(`[고아 md] 검사 실패: ${e.message}`);
}
