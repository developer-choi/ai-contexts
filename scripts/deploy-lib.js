const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CATEGORIES = ['rules', 'contexts', 'agents', 'hooks'];
const SKILLS_PRESERVE = new Set([
  '.system',
  'vercel-composition-patterns',
  'vercel-react-best-practices',
  'web-design-guidelines',
]);

const repoDir = path.resolve(__dirname, '..');
const sourceDir = path.join(repoDir, 'deploy');

function defaultClaudeDir() {
  return path.join(os.homedir(), '.claude');
}

function defaultCodexDir() {
  return path.join(os.homedir(), '.codex');
}

function resolveUserPath(input) {
  if (!input || input === '~') return os.homedir();
  if (input.startsWith(`~${path.sep}`) || input.startsWith('~/') || input.startsWith('~\\')) {
    return path.join(os.homedir(), input.slice(2));
  }
  return path.resolve(input);
}

function ensureDeploySource() {
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`Deploy source not found: ${sourceDir}`);
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function removePath(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyPath(src, dest) {
  removePath(dest);
  ensureDir(path.dirname(dest));
  fs.cpSync(src, dest, { recursive: true, force: true, errorOnExist: false });
}

function readJson(file) {
  const raw = fs.readFileSync(file, 'utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function mergeSettings(deployPath, targetPath) {
  const deploy = readJson(deployPath);
  const existing = fs.existsSync(targetPath) ? readJson(targetPath) : {};
  writeJson(targetPath, { ...existing, ...deploy });
}

function splitSettings(deployPath, targetPath) {
  if (!fs.existsSync(targetPath)) return false;

  const deploy = readJson(deployPath);
  const existing = readJson(targetPath);
  for (const key of Object.keys(deploy)) {
    delete existing[key];
  }

  if (Object.keys(existing).length === 0) {
    removePath(targetPath);
  } else {
    writeJson(targetPath, existing);
  }
  return true;
}

function verifySettings(deployPath, targetPath) {
  if (!fs.existsSync(targetPath)) return false;

  const deploy = readJson(deployPath);
  const target = readJson(targetPath);
  return Object.keys(deploy).every((key) => stableJson(deploy[key]) === stableJson(target[key]));
}

function stableJson(value) {
  return JSON.stringify(value);
}

function listEntries(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
}

function comparePaths(left, right) {
  if (!fs.existsSync(left) || !fs.existsSync(right)) return false;

  const leftStat = fs.statSync(left);
  const rightStat = fs.statSync(right);
  if (leftStat.isDirectory() !== rightStat.isDirectory()) return false;

  if (leftStat.isDirectory()) {
    const leftEntries = listEntries(left);
    const rightEntries = listEntries(right);
    if (leftEntries.length !== rightEntries.length) return false;

    for (let i = 0; i < leftEntries.length; i += 1) {
      if (leftEntries[i].name !== rightEntries[i].name) return false;
      if (!comparePaths(path.join(left, leftEntries[i].name), path.join(right, rightEntries[i].name))) {
        return false;
      }
    }
    return true;
  }

  return fs.readFileSync(left).equals(fs.readFileSync(right));
}

function deployRootFiles(targetDir, log) {
  let copied = 0;
  for (const entry of listEntries(sourceDir)) {
    if (!entry.isFile()) continue;

    const src = path.join(sourceDir, entry.name);
    const dest = path.join(targetDir, entry.name);
    if (entry.name === 'settings.json') {
      mergeSettings(src, dest);
      log(`  MERGE ${entry.name}`);
    } else {
      copyPath(src, dest);
      log(`  COPY  ${entry.name}`);
    }
    copied += 1;
  }
  return copied;
}

function deploySkills(targetDir, log) {
  const srcSkills = path.join(sourceDir, 'skills');
  if (!fs.existsSync(srcSkills) || !fs.statSync(srcSkills).isDirectory()) return 0;

  const targetSkills = path.join(targetDir, 'skills');
  ensureDir(targetSkills);

  let copied = 0;
  for (const entry of listEntries(srcSkills)) {
    const src = path.join(srcSkills, entry.name);
    copyPath(src, path.join(targetSkills, entry.name));
    log(`  COPY  skills/${entry.name}`);
    copied += 1;
  }
  return copied;
}

function uninstallSkills(targetDir, log) {
  const skillsDir = path.join(targetDir, 'skills');
  let removed = 0;
  for (const entry of listEntries(skillsDir)) {
    if (SKILLS_PRESERVE.has(entry.name)) continue;

    removePath(path.join(skillsDir, entry.name));
    log(`  DEL   skills/${entry.name}`);
    removed += 1;
  }
  return removed;
}

function deployCodexGlobals(targetDir, log = console.log) {
  ensureDir(targetDir);
  uninstallCodexGlobals(targetDir, log);

  let copied = 0;
  const srcContexts = path.join(sourceDir, 'contexts');
  if (fs.existsSync(srcContexts) && fs.statSync(srcContexts).isDirectory()) {
    copyPath(srcContexts, path.join(targetDir, 'contexts'));
    log('  COPY  contexts/');
    copied += 1;
  }

  copied += deploySkills(targetDir, log);
  return copied;
}

function uninstallCodexGlobals(targetDir, log = console.log) {
  let removed = 0;
  const contextsDir = path.join(targetDir, 'contexts');
  if (fs.existsSync(contextsDir) && fs.statSync(contextsDir).isDirectory()) {
    removePath(contextsDir);
    log('  DEL   contexts/');
    removed += 1;
  }
  removed += uninstallSkills(targetDir, log);
  return removed;
}

function uninstallTarget(targetDir, options = {}) {
  const log = options.log ?? console.log;
  const removeAlias = options.removeAlias ?? true;
  let removed = 0;

  for (const category of CATEGORIES) {
    const target = path.join(targetDir, category);
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      removePath(target);
      log(`  DEL   ${category}/`);
      removed += 1;
    }
  }

  removed += uninstallSkills(targetDir, log);

  for (const entry of listEntries(sourceDir)) {
    if (!entry.isFile()) continue;

    const target = path.join(targetDir, entry.name);
    if (entry.name === 'settings.json') {
      if (splitSettings(path.join(sourceDir, entry.name), target)) {
        log(`  SPLIT ${entry.name}`);
        removed += 1;
      }
    } else if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      removePath(target);
      log(`  DEL   ${entry.name}`);
      removed += 1;
    }
  }

  if (removeAlias) {
    unsetWtAddAlias(log);
  }

  return removed;
}

function registerWtAddAlias(log = console.log) {
  const aliasValue = '!f() { branch="$1"; path="$2"; base="${3:-$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed s,^origin/,,)}"; base="${base:-master}"; git worktree add -b "$branch" "$path" "$base" || return $?; if [ -f "$path/package.json" ]; then ( cd "$path" && npm ci ); fi; }; f';
  childProcess.execFileSync('git', ['config', '--global', 'alias.wt-add', aliasValue], { stdio: 'ignore' });
  log('  OK   git wt-add 등록 완료 (사용법: git wt-add <branch> <path> [base])');
}

function unsetWtAddAlias(log = console.log) {
  const result = childProcess.spawnSync('git', ['config', '--global', '--unset', 'alias.wt-add'], {
    stdio: 'ignore',
  });
  if (result.error && result.error.code !== 'ENOENT') {
    throw result.error;
  }
  log('  OK   git wt-add 제거 완료');
}

module.exports = {
  CATEGORIES,
  comparePaths,
  copyPath,
  defaultCodexDir,
  defaultClaudeDir,
  deployCodexGlobals,
  deployRootFiles,
  deploySkills,
  ensureDeploySource,
  ensureDir,
  listEntries,
  registerWtAddAlias,
  repoDir,
  resolveUserPath,
  sourceDir,
  uninstallCodexGlobals,
  uninstallTarget,
  verifySettings,
};
