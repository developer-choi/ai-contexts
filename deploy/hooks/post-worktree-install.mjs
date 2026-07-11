import fs from "node:fs";
import path from "node:path";
import { readPayload, getCommand } from "./hook-utils.mjs";
import { installWorktreeDeps } from "./worktree-install-core.mjs";

const payload = readPayload();
const command = getCommand(payload);
if (!command) process.exit(0);

// git 과 worktree add 사이에 전역 옵션(-C <path>, -c k=v 등)이 껴도 매칭.
// non-greedy + `.`은 개행 미포함 → 단일 라인 명령에 안전.
const m = command.match(/\bgit\b.*?\bworktree\s+add\b(.*)/);
if (!m) process.exit(0);

const argStr = m[1];

function tokenize(s) {
  const out = [];
  let cur = "";
  let q = null;
  for (const ch of s) {
    if (q) {
      if (ch === q) q = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      q = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

const tokens = tokenize(argStr);
const valueFlags = new Set(["-b", "-B", "--reason", "--lock"]);
let wtPath = null;
for (let i = 0; i < tokens.length; i++) {
  const t = tokens[i];
  if (t.startsWith("-")) {
    if (valueFlags.has(t)) i++;
    continue;
  }
  wtPath = t;
  break;
}
if (!wtPath) process.exit(0);

let cwd = process.cwd();
const cdMatch = command.match(/^\s*cd\s+("([^"]+)"|'([^']+)'|(\S+))\s*&&/);
if (cdMatch) {
  const raw = cdMatch[2] || cdMatch[3] || cdMatch[4];
  if (raw && raw.startsWith("~")) {
    cwd = path.join(process.env.HOME || process.env.USERPROFILE || cwd, raw.slice(1));
  } else if (raw) {
    cwd = path.resolve(cwd, raw);
  }
}

// git ... -C <dir> ... worktree add 의 <dir>을 상대경로 워크트리 대상의 기준 cwd로
// 쓴다(cd X && 와 병행). 하네스 가드가 cd && git 을 막아 워크트리 생성은 항상
// git -C <path> worktree add 형태이므로 이 해석이 필요하다. -C 는 1회만 오므로 첫 매치로 충분.
const cMatch = command.match(/\bgit\b[^\n]*?\s-C\s+("([^"]+)"|'([^']+)'|(\S+))/);
if (cMatch) {
  const raw = cMatch[2] || cMatch[3] || cMatch[4];
  if (raw && raw.startsWith("~")) {
    cwd = path.join(process.env.HOME || process.env.USERPROFILE || cwd, raw.slice(1));
  } else if (raw) {
    cwd = path.resolve(cwd, raw);
  }
}

const absWtPath = path.isAbsolute(wtPath) ? wtPath : path.resolve(cwd, wtPath);

const result = installWorktreeDeps(absWtPath);
if (!result.ran) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: result.message,
    },
  }),
);
process.exit(0);
