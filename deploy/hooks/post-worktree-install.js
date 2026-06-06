const fs = require("fs");
const path = require("path");
const { readPayload, getCommand } = require("./hook-utils");
const { installWorktreeDeps } = require("./worktree-install-core");

const payload = readPayload();
const command = getCommand(payload);
if (!command) process.exit(0);

const m = command.match(/\bgit\s+worktree\s+add\b(.*)/);
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
