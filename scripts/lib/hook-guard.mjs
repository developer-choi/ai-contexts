import fs from 'node:fs';
import path from 'node:path';

import { HOOKS_DIR, assertGitSupportsConfigHooks, registerRepoHooks, repoHooksState } from './git-hooks.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

function ensureHooksReady() {
  let state = checkHooks();

  if (!state.ok && state.repairable) {
    console.log('AC git hook 준비 상태가 불완전합니다. 설정 훅 재등록으로 복구를 시도합니다.');
    registerRepoHooks(repoRoot);
    state = checkHooks();
  }

  if (state.ok) {
    return;
  }

  const lines = [
    'AC git hook 준비 상태가 올바르지 않습니다.',
    ...state.issues.map((issue) => `- ${issue}`),
    '',
    '의존성이 없으면 이 worktree에서 npm ci를 실행하세요. 등록만 다시 하려면 npm run prepare입니다.',
  ];
  throw new Error(lines.join('\n'));
}

function checkHooks() {
  const issues = [];
  let repairable = false;

  // 훅은 .githooks 파일(체크아웃에 항상 딸려옴) + git 설정 등록(워크트리끼리 공유) 두 짝으로 발동한다.
  // 파일은 존재만 확인하고, git이 못 나르는 등록 쪽은 재등록으로 복구한다.
  for (const name of ['commit-msg', 'pre-commit']) {
    if (!isFile(path.join(repoRoot, HOOKS_DIR, name))) {
      issues.push(`${HOOKS_DIR}/${name} 파일이 없음`);
    }
  }

  // 버전이 낮으면 등록해도 git이 조용히 무시한다 — 재등록으로 못 고치므로 repairable이 아니다.
  try {
    assertGitSupportsConfigHooks();
  } catch (error) {
    issues.push(error.message);
    return { ok: false, issues, repairable: false };
  }

  const state = repoHooksState(repoRoot);
  if (!state.registered) {
    issues.push('git 설정 훅이 .githooks와 어긋남 (미등록이거나 목록 불일치)');
    repairable = true;
  }

  // core.hooksPath가 남아 있으면 파일 훅과 설정 훅이 둘 다 돌아 같은 검사가 두 번 실행된다.
  if (state.hooksPath) {
    issues.push(`core.hooksPath가 남아 있음: ${state.hooksPath}`);
    repairable = true;
  }

  if (!isFile(commitlintBin())) {
    issues.push('commitlint 실행 파일이 없음: npm ci 필요');
  }

  return { ok: issues.length === 0, issues, repairable };
}

function commitlintBin() {
  return path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'commitlint.cmd' : 'commitlint');
}

function isFile(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

export { ensureHooksReady };
