const { execSync } = require("child_process");
const os = require("os");
const path = require("path");
const { deny, getCommand, readPayload } = require("./hook-utils");

const cmd = getCommand(readPayload());
if (typeof cmd !== "string" || !/\bgit\s+push\b/.test(cmd)) process.exit(0);

if (/\bgit\s+push\b.*--no-verify\b/.test(cmd)) {
  deny("--no-verify is not allowed. Do not bypass pre-push hooks.");
}

const cdMatch = cmd.match(/(?:^|[;&|])\s*cd\s+(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/);
let cwd = cdMatch && (cdMatch[1] || cdMatch[2] || cdMatch[3]);
// child_process는 ~를 expand하지 않음. 미해석 cwd면 spawnSync가 ENOENT throw → catch 없으면 hook 우회됨.
if (cwd && cwd.startsWith("~")) cwd = cwd.replace(/^~(?=$|[/\\])/, os.homedir());
// tilde expand 결과가 백슬래시(homedir)+슬래시(상대) mix면 gh CLI가 cwd를 git repo로 인식 못 해 OPEN PR deny가 우회됨.
if (cwd) cwd = path.normalize(cwd);
const gitOpts = cwd ? { encoding: "utf8", cwd } : { encoding: "utf8" };
const gitOptsQuiet = { ...gitOpts, stdio: "pipe" };

const explicitTarget = extractPushTargetBranch(cmd);
const protectedBranches = /^(master|main|develop|release)$/;

if (explicitTarget && protectedBranches.test(explicitTarget)) {
  deny(`Pushing to protected branch ${explicitTarget} is not allowed.`);
}

let branch;
try {
  branch = execSync("git rev-parse --abbrev-ref HEAD", gitOpts).trim();
} catch (e) {
  // execSync throw 시 process가 비정상 종료되어 deny()가 호출되지 못한다 → 보호 브랜치 검증 우회.
  deny(`Hook could not determine branch (cwd=${cwd ?? "<inherit>"}): ${e.message}`);
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

if (/--force\b|--force-with-lease\b/.test(cmd)) {
  try {
    execSync(`git fetch origin ${branch}`, gitOptsQuiet);
  } catch {
    process.exit(0);
  }

  try {
    execSync(`git diff origin/${branch} HEAD --quiet`, gitOptsQuiet);
  } catch {
    deny(`Force push blocked: origin/${branch} differs from HEAD. Only history-only rewrites are allowed.`);
  }
}

function extractPushTargetBranch(command) {
  const pushMatch = command.match(/\bgit\s+push\b([\s\S]*)/);
  if (!pushMatch) return null;

  const tokens = tokenize(pushMatch[1]);
  const positional = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) continue;
    if (token === "&&" || token === ";" || token === "||") break;
    if (token.startsWith("-")) continue;
    positional.push(token);
  }

  const refspec = positional[1];
  if (!refspec) return null;

  const branch = refspec.includes(":") ? refspec.split(":").pop() : refspec;
  if (!branch || branch === "HEAD") return null;
  return branch.replace(/^refs\/heads\//, "");
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
