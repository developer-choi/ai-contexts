const { execSync } = require("child_process");
const os = require("os");
const path = require("path");
const { deny, getCommand, readPayload } = require("./hook-utils");

const cmd = getCommand(readPayload());
if (typeof cmd !== "string") process.exit(0);

const pushInvocations = findGitInvocations(cmd, "push");
if (pushInvocations.length === 0) process.exit(0);

const cdMatch = cmd.match(/(?:^|[;&|])\s*cd\s+(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/);
let cdCwd = cdMatch && (cdMatch[1] || cdMatch[2] || cdMatch[3]);
cdCwd = normalizeCwd(cdCwd);

const protectedBranches = /^(master|main|develop|release)$/;

for (const inv of pushInvocations) {
  if (inv.args.includes("--no-verify")) {
    deny("--no-verify is not allowed. Do not bypass pre-push hooks.");
  }

  // git -C <path>가 우선. 없으면 cd 추출 cwd로 fallback.
  const invCwd = normalizeCwd(inv.cwd) || cdCwd;
  const gitOpts = invCwd ? { encoding: "utf8", cwd: invCwd } : { encoding: "utf8" };
  const gitOptsQuiet = { ...gitOpts, stdio: "pipe" };

  const explicitTarget = extractPushTargetBranch(inv.args);

  if (explicitTarget && protectedBranches.test(explicitTarget)) {
    deny(`Pushing to protected branch ${explicitTarget} is not allowed.`);
  }

  let branch;
  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD", gitOpts).trim();
  } catch (e) {
    // execSync throw 시 process가 비정상 종료되어 deny()가 호출되지 못한다 → 보호 브랜치 검증 우회.
    deny(`Hook could not determine branch (cwd=${invCwd ?? "<inherit>"}): ${e.message}`);
  }
  const targetBranch = explicitTarget || branch;

  if (protectedBranches.test(targetBranch)) {
    deny(`Pushing to protected branch ${targetBranch} is not allowed.`);
  }

  try {
    const prState = execSync(`gh pr view ${targetBranch} --json state -q .state`, gitOptsQuiet).toString().trim();
    if (prState === "OPEN") {
      deny(`${targetBranch} has an open PR. Ask the user to push directly.`);
    }
  } catch {
    // No PR, gh unavailable, or no GitHub remote. Continue with local checks.
  }

  if (inv.args.some((t) => /^(--force|--force-with-lease|-f)$|^--force-with-lease=/.test(t))) {
    try {
      execSync(`git fetch origin ${branch}`, gitOptsQuiet);
    } catch {
      continue;
    }

    try {
      execSync(`git diff origin/${branch} HEAD --quiet`, gitOptsQuiet);
    } catch {
      deny(`Force push blocked: origin/${branch} differs from HEAD. Only history-only rewrites are allowed.`);
    }
  }
}

function findGitInvocations(command, subcommand) {
  const segments = splitSegments(command);
  const out = [];
  for (const seg of segments) {
    const tokens = tokenize(seg);
    for (let i = 0; i < tokens.length; i += 1) {
      if (tokens[i] !== "git") continue;
      const parsed = parseGitInvocation(tokens, i + 1);
      if (parsed && parsed.subcommand === subcommand) {
        out.push({ args: parsed.args, cwd: parsed.cwd });
      }
      break;
    }
  }
  return out;
}

function parseGitInvocation(tokens, startIdx) {
  let i = startIdx;
  let cwd = null;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === undefined) {
      i += 1;
      continue;
    }
    if (t === "-C") {
      if (tokens[i + 1]) cwd = tokens[i + 1];
      i += 2;
      continue;
    }
    if (t === "-c") {
      i += 2;
      continue;
    }
    if (t === "--git-dir" || t === "--work-tree" || t === "--namespace" || t === "--super-prefix" || t === "--exec-path") {
      i += 2;
      continue;
    }
    if (t.startsWith("--") && t.includes("=")) {
      i += 1;
      continue;
    }
    if (t.startsWith("-")) {
      i += 1;
      continue;
    }
    return { subcommand: t, args: tokens.slice(i + 1), cwd };
  }
  return null;
}

function splitSegments(command) {
  const out = [];
  let buf = "";
  let quote = null;
  let i = 0;
  while (i < command.length) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
      buf += c;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      buf += c;
      i += 1;
      continue;
    }
    if (c === ";" || c === "\n") {
      out.push(buf);
      buf = "";
      i += 1;
      continue;
    }
    if ((c === "&" && command[i + 1] === "&") || (c === "|" && command[i + 1] === "|")) {
      out.push(buf);
      buf = "";
      i += 2;
      continue;
    }
    if (c === "|") {
      out.push(buf);
      buf = "";
      i += 1;
      continue;
    }
    buf += c;
    i += 1;
  }
  if (buf) out.push(buf);
  return out;
}

function tokenize(value) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(value))) {
    tokens.push(match[1] || match[2] || match[3]);
  }
  return tokens;
}

function extractPushTargetBranch(args) {
  const positional = [];
  for (const token of args) {
    if (!token) continue;
    if (token.startsWith("-")) continue;
    positional.push(token);
  }

  const refspec = positional[1];
  if (!refspec) return null;

  const branch = refspec.includes(":") ? refspec.split(":").pop() : refspec;
  if (!branch || branch === "HEAD") return null;
  return branch.replace(/^refs\/heads\//, "");
}

function normalizeCwd(value) {
  if (!value) return null;
  let c = value;
  // child_process는 ~를 expand하지 않음. 미해석 cwd면 spawnSync가 ENOENT throw → catch 없으면 hook 우회됨.
  if (c.startsWith("~")) c = c.replace(/^~(?=$|[/\\])/, os.homedir());
  // Windows에서 MSYS/Git Bash 경로(/c/foo) → C:\foo. path.normalize가 /c/를 \c\로 잘못 변환해 spawnSync ENOENT.
  if (process.platform === "win32") {
    const msys = c.match(/^\/([a-zA-Z])(\/|$)/);
    if (msys) c = `${msys[1].toUpperCase()}:\\${c.slice(3).replace(/\//g, "\\")}`;
  }
  // tilde expand 결과가 백슬래시(homedir)+슬래시(상대) mix면 gh CLI가 cwd를 git repo로 인식 못 해 OPEN PR deny가 우회됨.
  return path.normalize(c);
}
