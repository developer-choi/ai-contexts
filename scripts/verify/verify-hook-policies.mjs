#!/usr/bin/env node
// git 정책 hook의 판정을 회귀 검증한다.
//
// 이 훅들은 실패해도 아무 소리를 내지 않는다 — 등록은 정상이고 명령도 정상 실행되며,
// 다만 특정 형태만 검사를 빠져나간다(`git commit`은 잡는데 `git -C <path> commit`은 놓치는 식).
// 사람이 눈으로 볼 방법이 없으므로 대표 명령을 실제 payload로 흘려 판정을 고정한다.
// sync:system이 배포 전 fail-fast로 돌려, 구멍 난 훅이 배포되는 것을 막는다.

import childProcess from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const hooksDir = path.join(import.meta.dirname, '..', '..', 'deploy', 'hooks');

// [hook 파일, 명령, 기대 판정, 설명]
// 기대 판정: 'deny' | 'ask' | 'pass'(훅이 아무 결정도 내지 않음)
const CASES = [
  // --- git -C 우회 (이 검증의 존재 이유) ---
  ['check-git-commit-policy.mjs', 'git -C ~/repo commit -m "x"', 'deny', 'git -C가 껴도 bare commit을 잡는다'],
  ['check-git-staging-policy.mjs', 'git -C ~/repo add .', 'deny', 'git -C가 껴도 add .를 잡는다'],
  ['check-git-staging-policy.mjs', 'git -C ~/repo commit -am "x"', 'deny', 'git -C가 껴도 commit -a를 잡는다'],
  ['check-git-reset-policy.mjs', 'git -C ~/repo reset --hard', 'deny', 'reset은 원래 파서라 회귀 없음'],

  // --- 인접 형태 (기존 동작 유지) ---
  ['check-git-commit-policy.mjs', 'git commit -m "x"', 'deny', 'bare commit'],
  ['check-git-commit-policy.mjs', 'git commit --no-verify -m "x" a.txt', 'deny', '--no-verify 금지'],
  ['check-git-staging-policy.mjs', 'git add .', 'deny', 'add .'],
  ['check-git-staging-policy.mjs', 'git add -A', 'deny', 'add -A'],

  // --- 새로 막히는 형태 ---
  ['check-git-staging-policy.mjs', 'git add -f .', 'deny', '플래그가 앞에 와도 add .를 잡는다'],
  ['check-git-staging-policy.mjs', 'git add --all', 'deny', 'add --all'],

  // --- 통과해야 하는 형태 (오탐 방지) ---
  ['check-git-commit-policy.mjs', 'git commit a.txt -m "x"', 'pass', '파일 지정 커밋'],
  ['check-git-commit-policy.mjs', 'git commit -m "x" a.txt', 'pass', '파일이 -m 뒤에 와도 지정된 것'],
  ['check-git-commit-policy.mjs', 'git commit --amend --no-edit', 'pass', 'amend는 메시지 플래그가 없다'],
  ['check-git-staging-policy.mjs', 'git commit a.txt -m "git add . 를 금지"', 'pass', '메시지 안의 문구는 옵션이 아니다'],
  ['check-git-staging-policy.mjs', 'git commit a.txt -m "-a 옵션 관련 수정"', 'pass', '메시지 값이 옵션으로 오인되지 않는다'],
  ['check-git-staging-policy.mjs', 'git commit --amend --allow-empty a.txt', 'pass', '--amend/--allow-empty는 -a가 아니다'],
  ['check-git-staging-policy.mjs', 'git add src/a.ts', 'pass', '개별 파일 staging'],
  ['check-git-reset-policy.mjs', 'git reset --soft HEAD~1', 'pass', '--soft는 허용'],

  // --- push·merge: 파서를 공용 모듈로 뺀 뒤의 회귀 확인 ---
  // git 상태를 조회하지 않고 판정이 끝나는 케이스만 고른다(검증이 실행 환경에 의존하지 않게).
  ['check-git-push-policy.mjs', 'git push --no-verify', 'deny', 'push --no-verify 금지'],
  ['check-git-push-policy.mjs', 'git reset --soft HEAD~1 && git push --force', 'deny', 'rewrite+force push chain 금지'],
  ['check-git-merge-policy.mjs', 'git -C ~/repo branch -f master', 'deny', '보호 브랜치 포인터 강제 이동'],
  ['check-git-merge-policy.mjs', 'git rebase --abort', 'pass', '진행 중 작업 중단은 허용'],

  // --- chain ---
  ['check-git-staging-policy.mjs', 'git status && git -C ~/repo add -A', 'deny', 'chain 뒷단의 위반도 잡는다'],
];

function runHook(file, command) {
  const res = childProcess.spawnSync(process.execPath, [path.join(hooksDir, file)], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
  });
  if (res.error) throw res.error;
  const out = (res.stdout || '').trim();
  if (!out) return { decision: 'pass', stderr: res.stderr };
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch {
    return { decision: `<파싱 불가: ${out.slice(0, 80)}>`, stderr: res.stderr };
  }
  return { decision: parsed.hookSpecificOutput?.permissionDecision || 'pass', stderr: res.stderr };
}

function main() {
  console.log('git 정책 hook 판정 검증 중...');
  const failures = [];
  for (const [file, command, expected, note] of CASES) {
    const { decision, stderr } = runHook(file, command);
    const label = `${file} :: ${command} → ${expected} (${note})`;
    if (decision === expected) {
      console.log(`  PASS  ${label}`);
    } else {
      console.error(`  FAIL  ${label} — 실제: ${decision}`);
      if (stderr) console.error(`        stderr: ${stderr.trim().split('\n')[0]}`);
      failures.push(label);
    }
  }
  if (failures.length) {
    console.error(`git 정책 hook 판정 검증 실패: ${failures.length}건`);
    process.exit(1);
  }
  console.log('git 정책 hook 판정 정상');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
