#!/usr/bin/env node
'use strict';

/**
 * backlog 워크트리의 origin/backlog ↔ local backlog 상태를 판정해 정리한다.
 *
 *   갈라짐 (양쪽 고유 커밋)  → 냅둠 (직접 충돌 해결)
 *   origin 앞섬              → ff merge (pull)
 *   local 앞섬               → push
 *   동일                     → origin/master 위로 1커밋 스쿼시 (force-push는 사용자가 직접)
 *
 * force-push는 Claude 정책 hook에서 막혀 있고 origin 푸시는 사용자 몫이므로,
 * 스쿼시까지만 하고 마지막 `git push --force` 명령은 출력만 한다.
 *
 *   node scripts/backlog-squash.js            실행
 *   node scripts/backlog-squash.js --dry-run  판정·계획만 출력 (변경 없음)
 */

const path = require('path');
const childProcess = require('child_process');

const REPO = path.resolve(__dirname, '..');
const WT = path.resolve(REPO, '..', 'ai-contexts-backlog');
const BRANCH = 'backlog';
const REMOTE = 'origin';
const DRY = process.argv.includes('--dry-run');

function git(args, opts = {}) {
  return childProcess
    .execFileSync('git', ['-C', WT, ...args], { encoding: 'utf8', ...opts })
    .trim();
}

function gitInherit(args) {
  childProcess.execFileSync('git', ['-C', WT, ...args], { stdio: 'inherit' });
}

/** 변경을 일으키는 git 명령. dry-run이면 실행 대신 출력만 한다. */
function mutate(args) {
  if (DRY) {
    console.log(`  [dry-run] git ${args.join(' ')}`);
    return;
  }
  gitInherit(args);
}

/** origin/master 위로 rebase. 충돌 시 --abort 후 중단한다. */
function rebaseOntoMaster() {
  if (DRY) {
    console.log(`  [dry-run] git rebase ${REMOTE}/master`);
    return;
  }
  try {
    gitInherit(['rebase', `${REMOTE}/master`]);
  } catch {
    try {
      gitInherit(['rebase', '--abort']);
    } catch {
      /* abort 실패는 무시하고 안내만 */
    }
    fail(`${REMOTE}/master 위로 rebase 중 충돌. --abort로 되돌렸습니다. 백로그 워크트리에서 직접 해결하세요.`);
  }
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function sameTree(a, b) {
  try {
    git(['diff', '--quiet', a, b]);
    return true;
  } catch {
    return false;
  }
}

// 0. 워크트리·브랜치·청결 확인
let current;
try {
  current = git(['rev-parse', '--abbrev-ref', 'HEAD']);
} catch {
  fail(`backlog 워크트리를 찾을 수 없습니다: ${WT}\n  git worktree add ${WT} backlog 로 먼저 생성하세요.`);
}
if (current !== BRANCH) {
  fail(`backlog 워크트리가 '${BRANCH}'가 아니라 '${current}'에 있습니다. 정리 후 다시 실행하세요.`);
}
if (git(['status', '--porcelain'])) {
  fail('backlog 워크트리에 미커밋 변경이 있습니다. 커밋·정리 후 다시 실행하세요.');
}

// 1. fetch (판정 정확도를 위해 dry-run에서도 수행 — 로컬 변경 없음)
console.log(`fetch ${REMOTE} ${BRANCH} master...`);
gitInherit(['fetch', REMOTE, BRANCH, 'master']);

// 3. origin/backlog ↔ local backlog 4갈래 판정
const local = git(['rev-parse', BRANCH]);
const remote = git(['rev-parse', `${REMOTE}/${BRANCH}`]);
const base = git(['merge-base', BRANCH, `${REMOTE}/${BRANCH}`]);

if (local !== remote && local === base) {
  // origin 앞섬 → ff pull
  console.log('origin/backlog가 앞섭니다. ff merge로 당깁니다.');
  mutate(['merge', '--ff-only', `${REMOTE}/${BRANCH}`]);
  process.exit(0);
}

if (local !== remote && remote === base) {
  // local 앞섬 → push
  console.log('local backlog가 앞섭니다. push합니다.');
  mutate(['push', REMOTE, BRANCH]);
  process.exit(0);
}

if (local !== remote) {
  // 갈라짐. 단, 트리가 origin과 동일하면 "이미 스쿼시됨, force-push만 남음" 상태
  if (sameTree(BRANCH, `${REMOTE}/${BRANCH}`)) {
    console.log('이미 로컬에서 스쿼시됨 (트리는 origin과 동일). force-push만 남았습니다:\n');
    console.log(`  git -C ${WT} push --force ${REMOTE} ${BRANCH}\n`);
    process.exit(0);
  }
  console.log('origin/backlog와 local backlog가 갈라졌습니다 (양쪽 다 고유 커밋). 자동 처리하지 않습니다 — 직접 충돌 해결하세요.');
  process.exit(0);
}

// 4. 동일 → 최신 master 위로 스쿼시
//    베이스는 backlog가 갈라져 나온 지점(merge-base)이다. origin/master로 바로
//    reset하면 backlog가 더 옛 master 기반일 때 그 사이 master 커밋들이 커밋 트리에서
//    빠져 조용히 되돌려진다. 그래서 옛 베이스에서 1커밋으로 모은 뒤 master 위로 rebase한다.
const squashBase = git(['merge-base', `${REMOTE}/master`, BRANCH]);
const masterHead = git(['rev-parse', `${REMOTE}/master`]);
const onLatest = squashBase === masterHead;
const count = parseInt(git(['rev-list', '--count', `${squashBase}..${BRANCH}`]), 10);

if (count <= 1 && onLatest) {
  console.log(`이미 ${REMOTE}/master 위 ${count}커밋입니다. 정리할 것이 없습니다.`);
  process.exit(0);
}

if (count > 1) {
  console.log(`백로그 커밋 ${count}개를 1개로 스쿼시합니다 (베이스 ${squashBase.slice(0, 7)}).`);
  mutate(['reset', '--soft', squashBase]);
  mutate(['commit', '-m', 'chore(backlog): 백로그 커밋 정리']);
}

if (!onLatest) {
  console.log(`${REMOTE}/master 위로 rebase합니다.`);
  rebaseOntoMaster();
}

if (!DRY) {
  console.log(`\n정리 완료: ${git(['rev-parse', '--short', BRANCH])} (${REMOTE}/master 위 1커밋)`);
}
console.log('\nforce-push는 정책 hook·푸시 권한상 스크립트가 하지 않습니다. 직접 실행하세요:\n');
console.log(`  git -C ${WT} push --force ${REMOTE} ${BRANCH}\n`);
