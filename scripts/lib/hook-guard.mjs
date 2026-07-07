import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

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

  // AC는 추적되는 .githooks 붙박이 훅을 쓴다. 훅 파일은 체크아웃에 항상 딸려오므로 존재만 확인하고,
  // git이 못 나르는 core.hooksPath(=.githooks) 한 줄은 npm run prepare(= git config core.hooksPath .githooks)로 복구한다.
  const hooksPath = readGitConfig('core.hooksPath');
  if (normalizeGitPath(hooksPath) !== '.githooks') {
    issues.push(`core.hooksPath가 .githooks가 아님: ${hooksPath || '(unset)'}`);
    repairable = true;
  }

  if (!isFile(path.join(repoRoot, '.githooks', 'commit-msg'))) {
    issues.push('.githooks/commit-msg 파일이 없음');
  }

  if (!isFile(path.join(repoRoot, '.githooks', 'pre-commit'))) {
    issues.push('.githooks/pre-commit 파일이 없음');
  }

  if (!isFile(commitlintBin())) {
    issues.push('commitlint 실행 파일이 없음: npm ci 필요');
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

function isFile(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

export { ensureHooksReady };
