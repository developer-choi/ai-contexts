#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 채용과제 레포(`~/WebstormProjects/recruitment/` 아래)의 커밋에 로컬 전용 맥락이 새거나
// 한국어가 빠지는 것을 막는다. 2026-09 채용과제 커밋 메시지에 `plan/` 경로와 개인 레포 약어가
// 실제로 새 나갔고, 채용 담당자가 보는 이력이라 흔적 하나도 남으면 안 된다.
//
// 한 파일이 두 곳에서 쓰인다.
// - git 훅: `sync:environment`가 `~/.ai-contexts/`에 복사해 전역 설정 훅으로 건다. 인자가 있으면
//   commit-msg(메시지 파일), 없으면 pre-commit(staged 변경)으로 돈다. 채용 레포 안에는 흔적이
//   남지 않고, 레포가 husky로 `core.hooksPath`를 바꿔도 설정 훅은 따로 돈다
// - Claude 훅: check-git-commit-policy.mjs가 판정 함수를 import해 한 번 더 막는다
// 복사돼 홀로 돌아야 하므로 AC의 다른 모듈을 import하지 않는다.

// 예외 허용 목록을 두지 않는다 — 예외 통로가 곧 누출 통로다. 오탐을 실제로 본 뒤에만 연다.
// 두 글자 약어는 대소문자 구분 + 단어 경계로만 잡는다(`mp4`·`accept`는 통과). JS의 `\b`는
// 한글을 단어 문자로 안 보므로 `MP원본`도 잡힌다.
//
// `messageOnly`는 커밋 메시지에만 쓴다. 과제 코드에는 `/api/plan/1`·`enum { AC }`·`const MP`가
// 멀쩡히 나오는데, 코드 줄에서 이것을 막으면 우회할 길이 없다(`--no-verify`는 Claude 훅이 막는다).
// 코드 쪽 `plan/`은 파일 경로 검사가 맡는다.
export const LEAK_PATTERNS = [
  { label: "plan/", re: /plan\//, messageOnly: true },
  { label: "monorepo-playground", re: /monorepo-playground/i },
  { label: "ai-contexts", re: /ai-contexts/i },
  { label: "MP", re: /\bMP\b/, messageOnly: true },
  { label: "AC", re: /\bAC\b/, messageOnly: true },
];

const HANGUL_RE = /[가-힣]/;

// git이 스스로 만드는 subject는 한국어 검사에서 뺀다 — 막으면 `git merge`가 매번 멈춘다.
// 로컬 맥락 검사는 그대로 받는다.
const GENERATED_SUBJECT_RE = /^Merge /;

function normalize(p) {
  return path.resolve(p).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

// 테스트가 실제 채용 폴더를 안 건드리도록 루트를 환경 변수로 바꿀 수 있다.
export function recruitmentRoot() {
  return process.env.AI_CONTEXTS_RECRUITMENT_ROOT || path.join(os.homedir(), "WebstormProjects", "recruitment");
}

export function isUnderRecruitment(dir) {
  if (!dir) return false;
  const root = normalize(recruitmentRoot());
  return normalize(dir).startsWith(`${root}/`);
}

// 줄마다 걸린 패턴을 모은다. `code`면 메시지 전용 패턴을 뺀다. 반환: [{ line, labels }]
export function findLeaks(text, { code = false } = {}) {
  const patterns = LEAK_PATTERNS.filter(({ messageOnly }) => !(code && messageOnly));
  const hits = [];
  for (const line of text.split(/\r?\n/)) {
    const labels = patterns.filter(({ re }) => re.test(line)).map(({ label }) => label);
    if (labels.length > 0) hits.push({ line, labels });
  }
  return hits;
}

// 커밋 메시지 판정. 반환: 거부 사유 줄 목록(비면 통과).
export function checkMessage(message) {
  const lines = message.split(/\r?\n/).filter((line) => !line.startsWith("#"));
  const body = lines.join("\n");
  const problems = findLeaks(body).map(({ line, labels }) => `메시지에 로컬 맥락(${labels.join(", ")}): ${line.trim()}`);

  const subject = (lines.find((line) => line.trim() !== "") || "").trim();
  if (!GENERATED_SUBJECT_RE.test(subject) && !HANGUL_RE.test(subject)) {
    problems.push(`subject에 한글이 없습니다 — 채용과제 커밋은 한국어로 씁니다: ${subject || "(빈 subject)"}`);
  }
  return problems;
}

// staged 변경 판정. 추가된 줄만 본다 — 원래 있던 줄까지 보면 손대지 않은 코드 때문에 커밋이 막힌다.
export function checkStaged({ files, diff }) {
  const problems = files
    .filter((file) => file.startsWith("plan/"))
    .map((file) => `plan/ 아래 파일이 staged 됐습니다: ${file}`);

  let currentFile = "";
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ ")) {
      currentFile = line.replace(/^\+\+\+ (b\/)?/, "");
      continue;
    }
    if (!line.startsWith("+")) continue;
    for (const { line: text, labels } of findLeaks(line.slice(1), { code: true })) {
      problems.push(`${currentFile}에 로컬 맥락(${labels.join(", ")}): ${text.trim()}`);
    }
  }
  return problems;
}

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error((result.stderr || `git ${args.join(" ")} 실패`).trim());
  return result.stdout;
}

function main(messageFile) {
  // 채용 레포인지 가리기 전의 실패는 통과시킨다 — 전역 훅이라 여기서 막으면 모든 레포가 막힌다.
  let toplevel;
  try {
    toplevel = git(["rev-parse", "--show-toplevel"]).trim();
  } catch {
    return 0;
  }
  if (!isUnderRecruitment(toplevel)) return 0;

  const problems = messageFile
    ? checkMessage(fs.readFileSync(messageFile, "utf8"))
    : checkStaged({
        files: git(["diff", "--cached", "--name-only", "--no-renames"]).split("\n").filter(Boolean),
        diff: git(["diff", "--cached", "-U0", "--no-color", "--no-ext-diff", "--no-renames"]),
      });
  if (problems.length === 0) return 0;

  console.error("[채용 레포 커밋 검사] 커밋을 거부합니다.");
  for (const problem of problems) console.error(`  - ${problem}`);
  return 1;
}

// import될 때(Claude 훅)는 돌지 않고, 직접 실행될 때(git 훅)만 돈다.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv[2]));
}
