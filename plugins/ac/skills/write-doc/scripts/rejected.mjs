// 금지 표현 목록(AC `scripts/hooks/blocked-expressions.json`) 중 write-doc 글과 커밋 메시지에 거는 행
// (scope가 DOC·BOTH)을 읽고 본문에서 찾는다. 행의 꼴과 등재·수정은 그 목록 옆 `blocked-expressions.mjs`가
// 정본이고, 여기서는 읽기만 한다.
//
// 목록과 매칭 코드는 프롬프트 md 커밋 훅(check-wording.mjs)과 같은 것을 쓴다. 매칭을 여기 따로 두면
// 같은 행이 훅과 채점에서 다르게 걸린다. 찾는 자리는 두 곳 중 먼저 있는 쪽이다.
// - AC 체크아웃 안에서 도는 소스본: 네 단계 위 레포 루트의 `scripts/hooks/`
// - 스킬 배포본: sync:environment가 훅과 목록을 복사해 두는 `~/.ai-contexts/`
// 등재 스크립트는 원본과 `~/.ai-contexts/` 사본을 함께 고치므로 배포본도 등재 즉시 새 행을 본다.
//
// 목록은 스크립트(채점기·리뷰어 입력 조립·커밋 메시지 훅)만 읽는다. 세션이 목록을 통째로 Read하면 쌓일수록
// 모든 회차의 맥락이 늘어난다. 리뷰어에게는 본문에 걸린 행만 넘긴다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// AC 원본(plugins/ac/skills/write-doc/scripts)에서 레포 루트까지 다섯 단계다.
const SOURCE_DIR = path.resolve(import.meta.dirname, "..", "..", "..", "..", "..", "scripts", "hooks");
const DEPLOYED_DIR = path.join(os.homedir(), ".ai-contexts");
const LIST_DIR = fs.existsSync(path.join(SOURCE_DIR, "check-wording.mjs")) ? SOURCE_DIR : DEPLOYED_DIR;
export const LIST_FILE = path.join(LIST_DIR, "blocked-expressions.json");

// 훅 모듈이 없거나 옛 꼴이면(sync 전) null로 두고, 부르는 쪽이 건너뛴 까닭을 한 줄 낸다.
let matcher = null;
try {
  const mod = await import(pathToFileURL(path.join(LIST_DIR, "check-wording.mjs")).href);
  if (typeof mod.inScope === "function" && typeof mod.loadBlockedRows === "function") matcher = mod;
} catch {
  matcher = null;
}

// write-doc 글·커밋 메시지에 거는 행. 읽을 수 없으면 rows가 null이고 note에 까닭이 든다.
export function loadDocRows() {
  if (!matcher) return { rows: null, note: `건너뜀: 매칭 모듈이 없거나 옛 꼴 (${LIST_DIR}). sync:environment가 필요하다` };
  if (!fs.existsSync(LIST_FILE)) return { rows: null, note: `건너뜀: 파일 없음 (${LIST_FILE})` };
  const rows = matcher.loadBlockedRows(LIST_FILE).filter((row) => matcher.inScope(row, "DOC"));
  const n = (lane) => rows.filter((row) => row.lane === lane).length;
  return { rows, note: `읽음 ${LIST_FILE}: ALWAYS_BANNED ${n("ALWAYS_BANNED")}행 · NEEDS_REVIEW ${n("NEEDS_REVIEW")}행` };
}

const insteadOf = (row, word) => {
  if (!Array.isArray(row.instead)) return row.instead;
  const i = row.words.findIndex((candidate) => candidate.toLowerCase() === word.toLowerCase());
  return i === -1 ? row.instead.join("·") : row.instead[i];
};

// 본문 줄([줄 번호, 줄])에서 행이 걸린 자리. 인라인 코드는 훅과 같이 걷고 본다. 코드 이름을 부르는 자리다.
export function findListHits(lines, rows) {
  if (!matcher || !rows) return [];
  const hits = [];
  for (const [lineno, ln] of lines) {
    const clean = ln.replace(/`[^`\n]*`/g, " ");
    for (const { row, word } of matcher.blockedHits(rows, clean)) {
      hits.push({ word, lane: row.lane, swap: insteadOf(row, word), why: row.why, lineno, line: ln.trim() });
    }
  }
  return hits;
}

// 이 글에서만 반려한 표현(패키지 frontmatter `rejected`)은 목록 행이 아니라 {word, lane, swap} 꼴이라
// 문자열 포함으로 찾는다.
export function findRejectedHits(lines, entries) {
  const hits = [];
  for (const e of entries) {
    for (const [lineno, ln] of lines) if (ln.includes(e.word)) hits.push({ ...e, lineno, line: ln.trim() });
  }
  return hits;
}
