#!/usr/bin/env node
// 정책 hook(git 계열 + 삭제 가드)의 판정을 회귀 검증한다.
//
// 이 훅들은 실패해도 아무 소리를 내지 않는다 — 등록은 정상이고 명령도 정상 실행되며,
// 다만 특정 형태만 검사를 빠져나간다(`git commit`은 잡는데 `git -C <path> commit`은 놓치는 식).
// 사람이 눈으로 볼 방법이 없으므로 대표 명령을 실제 payload로 흘려 판정을 고정한다.
// sync:system이 배포 전 fail-fast로 돌려, 구멍 난 훅이 배포되는 것을 막는다.

import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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

  // --- 경로 필수: 메시지를 넘기는 형태와 무관하게 (2026-08-05 PP 사고) ---
  ['check-git-commit-policy.mjs', "git commit -F - <<'MSG'\nfix: x\nMSG", 'deny', 'heredoc 표식이 경로로 오인되지 않는다'],
  ['check-git-commit-policy.mjs', 'git commit -F msg.txt', 'deny', '-F 파일로 넘겨도 경로는 필수'],
  ['check-git-commit-policy.mjs', 'git commit -m "x" > out.txt', 'deny', '리다이렉션 대상이 경로로 오인되지 않는다'],
  ['check-git-commit-policy.mjs', 'git commit --amend --no-edit', 'deny', 'amend도 staging 전체를 커밋하므로 경로 필수'],
  ['check-git-commit-policy.mjs', 'git commit --squash HEAD~1', 'deny', '--squash도 경로 필수'],
  ['check-git-commit-policy.mjs', 'git commit -C HEAD~1', 'deny', '-C(메시지 재사용)도 경로 필수'],
  ['check-git-commit-policy.mjs', 'git commit a.txt', 'deny', '메시지 없는 커밋은 에디터를 띄운다'],

  // --- 통과해야 하는 형태 (오탐 방지) ---
  ['check-git-commit-policy.mjs', 'git commit a.txt -m "x"', 'pass', '파일 지정 커밋'],
  ['check-git-commit-policy.mjs', 'git commit -m "x" a.txt', 'pass', '파일이 -m 뒤에 와도 지정된 것'],
  ['check-git-commit-policy.mjs', "git commit a.txt -F - <<'MSG'\nfix: x\nMSG", 'pass', '-F도 경로만 있으면 통과'],
  ['check-git-commit-policy.mjs', 'git commit --amend --no-edit a.txt', 'pass', '경로를 준 amend는 통과'],
  ['check-git-commit-policy.mjs', 'git commit --allow-empty -m "x"', 'pass', '빈 커밋은 경로가 없는 게 정상'],
  ['check-git-staging-policy.mjs', 'git commit a.txt -m "git add . 를 금지"', 'pass', '메시지 안의 문구는 옵션이 아니다'],
  ['check-git-staging-policy.mjs', 'git commit a.txt -m "-a 옵션 관련 수정"', 'pass', '메시지 값이 옵션으로 오인되지 않는다'],
  ['check-git-staging-policy.mjs', 'git commit --amend --allow-empty a.txt', 'pass', '--amend/--allow-empty는 -a가 아니다'],
  ['check-git-staging-policy.mjs', 'git add src/a.ts', 'pass', '개별 파일 staging'],
  ['check-git-reset-policy.mjs', 'git reset --soft HEAD~1', 'pass', '--soft는 허용'],

  // --- push·merge: 파서를 공용 모듈로 뺀 뒤의 회귀 확인 ---
  // git 상태를 조회하지 않고 판정이 끝나는 케이스만 고른다(검증이 실행 환경에 의존하지 않게).
  ['check-git-push-policy.mjs', 'git push --no-verify', 'deny', 'push --no-verify 금지'],
  ['check-git-push-policy.mjs', 'git reset --soft HEAD~1 && git push --force', 'deny', 'rewrite+force push chain 금지'],
  ['check-git-push-policy.mjs', 'git push origin main', 'ask', '보호 브랜치 push는 승인 창을 띄운다'],
  ['check-git-push-policy.mjs', 'git -C ~/repo push origin develop', 'ask', 'git -C가 껴도 보호 브랜치 push를 잡는다'],
  ['check-git-merge-policy.mjs', 'git -C ~/repo branch -f master', 'deny', '보호 브랜치 포인터 강제 이동'],
  ['check-git-merge-policy.mjs', 'git rebase --abort', 'pass', '진행 중 작업 중단은 허용'],

  // --- chain ---
  ['check-git-staging-policy.mjs', 'git status && git -C ~/repo add -A', 'deny', 'chain 뒷단의 위반도 잡는다'],

  // --- 삭제 가드: 전 경로 검사 + 예외만 통과 ---
  ['check-rm-policy.mjs', 'rm -rf C:/Windows/Temp/x', 'ask', '시스템 경로 삭제도 잡는다'],
  ['check-rm-policy.mjs', 'rm -rf ~/x', 'ask', '홈 디렉터리 삭제도 잡는다'],
  ['check-rm-policy.mjs', 'rm -rf ~/WebstormProjects/main/x', 'ask', '작업 폴더 삭제(기존 동작 유지)'],
  ['check-rm-policy.mjs', 'rm -rf node_modules', 'pass', '빌드 산출물은 묻지 않는다'],
  ['check-rm-policy.mjs', `rm -rf "${path.join(os.tmpdir(), 'claude', 'scratch.txt')}"`, 'pass', '임시 디렉터리 하위는 묻지 않는다'],
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

// 미등록 파일 경고는 명령 문자열만으로 판정되지 않는다 — 실제 레포 상태를 봐야 한다.
// tracked 하나, untracked 하나를 가진 임시 레포를 만들어 판정을 고정한다.
function withUntrackedFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-policy-fixture-'));
  const run = (cmd) => childProcess.execSync(cmd, { cwd: dir, stdio: 'pipe' });
  try {
    run('git init -q');
    fs.writeFileSync(path.join(dir, 'tracked.txt'), 'a\n');
    run('git add tracked.txt');
    run('git -c user.email=verify@local -c user.name=verify commit -q -m init tracked.txt');
    fs.writeFileSync(path.join(dir, 'new.txt'), 'b\n');
    return fn(dir.replace(/\\/g, '/'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const untrackedCases = (dir) => [
  ['check-git-commit-policy.mjs', `git -C ${dir} commit . -m "x"`, 'ask', '경로 안의 미등록 파일을 알린다'],
  ['check-git-commit-policy.mjs', `git -C ${dir} commit tracked.txt -m "x"`, 'pass', '미등록 파일이 없는 경로는 조용하다'],
];

function main() {
  console.log('정책 hook 판정 검증 중...');
  const failures = [];
  // fixture 안에서 실행까지 끝낸다 — 케이스 목록만 만들어 나오면 임시 레포가 먼저 지워져
  // 미등록 파일이 사라진 상태로 판정된다(레포 부재 → 조회 실패 → pass로 통과, 위양성 없이 조용히 무력화).
  withUntrackedFixture((dir) => {
    for (const [file, command, expected, note] of [...CASES, ...untrackedCases(dir)]) {
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
  });
  if (failures.length) {
    console.error(`정책 hook 판정 검증 실패: ${failures.length}건`);
    process.exit(1);
  }
  console.log('정책 hook 판정 정상');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
