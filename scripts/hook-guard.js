const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');

function ensureHooksReady() {
  let state = checkHooks();

  if (!state.ok && state.repairable) {
    console.log('AC git hook 준비 상태가 불완전합니다. npm run prepare로 복구를 시도합니다.');
    runPrepare();
    state = checkHooks();
  }

  if (state.ok) {
    return;
  }

  const lines = [
    'AC git hook 준비 상태가 올바르지 않습니다.',
    ...state.issues.map((issue) => `- ${issue}`),
    '',
    '하네스로 만든 worktree는 self-heal hook이 의존성을 자동 설치합니다. 자동 복구가 안 됐다면 이 worktree에서 npm ci 후 npm run prepare를 실행하세요.',
  ];
  throw new Error(lines.join('\n'));
}

function checkHooks() {
  const issues = [];
  let repairable = false;

  const hooksPath = readGitConfig('core.hooksPath');
  if (normalizeGitPath(hooksPath) !== '.husky/_') {
    issues.push(`core.hooksPath가 .husky/_가 아님: ${hooksPath || '(unset)'}`);
    repairable = hasHuskyBin();
  }

  if (!isFile(path.join(repoRoot, '.husky', 'commit-msg'))) {
    issues.push('.husky/commit-msg 파일이 없음');
  }

  if (!isFile(path.join(repoRoot, '.husky', '_', 'commit-msg'))) {
    issues.push('.husky/_/commit-msg shim이 없음');
    repairable = hasHuskyBin();
  }

  if (!isFile(path.join(repoRoot, '.husky', 'pre-commit'))) {
    issues.push('.husky/pre-commit 파일이 없음');
  }

  if (!isFile(path.join(repoRoot, '.husky', '_', 'pre-commit'))) {
    issues.push('.husky/_/pre-commit shim이 없음');
    repairable = hasHuskyBin();
  }

  if (!isFile(path.join(repoRoot, '.husky', 'reference-transaction'))) {
    issues.push('.husky/reference-transaction 파일이 없음');
  }

  if (!isFile(path.join(repoRoot, '.husky', '_', 'reference-transaction'))) {
    // husky가 안 만드는 추가 shim. prepare 체인(install-husky-extra)이 복구한다.
    issues.push('.husky/_/reference-transaction shim이 없음');
    repairable = hasHuskyBin();
  }

  if (!isFile(commitlintBin())) {
    issues.push('commitlint 실행 파일이 없음: npm ci 필요');
  }

  if (!isFile(huskyBin())) {
    issues.push('husky 실행 파일이 없음: npm ci 필요');
  }

  return { ok: issues.length === 0, issues, repairable };
}

function readGitConfig(key) {
  const result = spawnSync('git', ['config', '--get', key], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status === 1) {
    return '';
  }

  if (result.status !== 0) {
    throw new Error((result.stderr || result.error?.message || `git config ${key} 실패`).trim());
  }

  return result.stdout.trim();
}

function runPrepare() {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['run', 'prepare'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(result.error?.message || 'npm run prepare 실패');
  }
}

function normalizeGitPath(value) {
  return value.trim().replaceAll('\\', '/').replace(/\/+$/, '');
}

function commitlintBin() {
  return path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'commitlint.cmd' : 'commitlint');
}

function huskyBin() {
  return path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'husky.cmd' : 'husky');
}

function hasHuskyBin() {
  return isFile(huskyBin());
}

function isFile(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

module.exports = { ensureHooksReady };
