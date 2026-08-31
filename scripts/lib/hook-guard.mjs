import fs from 'node:fs';
import path from 'node:path';

import {
  HOOKS_DIR,
  assertGitSupportsConfigHooks,
  hasLegacyRepoHooks,
  missingRepoHookWiring,
  registerRepoHookWiring,
} from './git-hooks.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

function ensureHooksReady() {
  let state = checkHooks();

  if (!state.ok && state.repairable) {
    console.log('AC git hook 준비 상태가 불완전합니다. 전역 훅 재등록으로 복구를 시도합니다.');
    registerRepoHookWiring();
    state = checkHooks();
  }

  if (state.ok) {
    return;
  }

  const lines = [
    'AC git hook 준비 상태가 올바르지 않습니다.',
    ...state.issues.map((issue) => `- ${issue}`),
    '',
    '의존성이 없으면 이 worktree에서 npm ci를 실행하세요.',
  ];
  throw new Error(lines.join('\n'));
}

function checkHooks() {
  const issues = [];
  let repairable = false;

  // 훅은 .githooks 파일(체크아웃에 항상 딸려옴) + 기기 전역의 설정 훅 배선 두 짝으로 발동한다.
  // 파일은 존재만 확인하고, git이 못 나르는 배선 쪽은 재등록으로 복구한다.
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

  const missing = missingRepoHookWiring();
  if (missing.length) {
    issues.push(`전역 설정 훅 배선이 빠짐: ${missing.join(', ')}`);
    repairable = true;
  }

  // 옛 레포별 등록이 남아 있으면 전역 훅과 둘 다 돌아 같은 검사가 두 번 실행된다.
  // 지우는 것은 기기당 한 번이라 자동 복구 대상으로 두지 않고 할 일을 알려준다.
  if (hasLegacyRepoHooks(repoRoot)) {
    issues.push("옛 레포별 훅 등록이 남아 있음: git config --local --remove-section hook.repo-<이벤트>");
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
