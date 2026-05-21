const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { readPayload, getCommand } = require("./hook-utils");

const payload = readPayload();
const command = getCommand(payload);
if (!command) process.exit(0);

const m = command.match(/\bgit\s+(?:worktree\s+add|wt-add)\b(.*)/);
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
    if (t.startsWith("--reason=") || t.startsWith("--lock=")) {}
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

if (!fs.existsSync(absWtPath)) process.exit(0);

const pkgJsonPath = path.join(absWtPath, "package.json");
if (!fs.existsSync(pkgJsonPath)) process.exit(0);

if (fs.existsSync(path.join(absWtPath, "node_modules"))) process.exit(0);

let pm = null;
let installCmd = null;
if (fs.existsSync(path.join(absWtPath, "pnpm-lock.yaml"))) {
  pm = "pnpm";
  installCmd = "pnpm install --frozen-lockfile";
} else if (fs.existsSync(path.join(absWtPath, "yarn.lock"))) {
  pm = "yarn";
  installCmd = "yarn install --frozen-lockfile";
} else if (fs.existsSync(path.join(absWtPath, "package-lock.json"))) {
  pm = "npm";
  installCmd = "npm ci";
} else {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    if (pkg.packageManager) {
      const name = String(pkg.packageManager).split("@")[0];
      if (name === "pnpm") {
        pm = "pnpm";
        installCmd = "pnpm install";
      } else if (name === "yarn") {
        pm = "yarn";
        installCmd = "yarn install";
      } else if (name === "npm") {
        pm = "npm";
        installCmd = "npm install";
      }
    }
  } catch {}
}
if (!pm) process.exit(0);

let result = "";
let ok = false;
try {
  execSync(installCmd, { cwd: absWtPath, stdio: "pipe", timeout: 10 * 60 * 1000 });
  ok = true;
  result = `워크트리 의존성 설치 완료 (${pm}): ${absWtPath}`;
} catch (e) {
  const stderr = (e.stderr && e.stderr.toString()) || (e.stdout && e.stdout.toString()) || e.message || "";
  result = `워크트리 의존성 설치 실패 (${pm} @ ${absWtPath}): ${stderr.slice(-400)}`;
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: result,
    },
  }),
);
process.exit(ok ? 0 : 0);
