#!/usr/bin/env node
// 세션 마감 전에 훑어야 할 상태 셋 — 압축 스냅샷, 보강 매칭 근거, squash 전후 동일성.
//
// 셋 다 산문이 "확인한다"까지만 적고 확인 수단은 세션마다 즉흥으로 정해지던 자리다.
//
//   snapshots — 스냅샷을 *쓰는* 쪽은 코드인데(hooks/snapshot-precompact-transcript.mjs) 읽는
//     진입점이 없어, 폴더 경로와 파일명 규약을 산문에서 읽어 손으로 글롭했다. 빗나가면
//     "이 세션은 압축이 없었다"로 결론내고 넘어가 압축 구간의 사용자 교정이 통째로 유실된다.
//   changed — 보강 매칭 조건의 파일 쪽 절반(plan/pr{N}/**·knowledge/**·refresh-prompts/state.json)을
//     세션 변경 목록과 눈으로 대조했다. 놓치면 보강이 통째로 안 돌고, 안 돈 사실은 아무 데도 안 남는다.
//   squash-check — 「합친 뒤 정리 전과 파일 내용이 같은지 확인한다」. Step 3은 사용자 지시를
//     기다리지 않으므로 사람 눈이 안 거친다. rebase 중 hunk가 빠져도 로그는 깔끔해 보이고,
//     잃은 변경은 다음 세션에 "왜 이게 없지"로 나타난다. 트리 해시 둘을 맞대면 끝날 일이다.
//
// 판단은 안 한다 — 어느 보강을 돌릴지(대화 쪽 조건은 세션만 안다), 어느 커밋이 한 작업인지,
// 스냅샷에서 무엇을 회수할지는 부르는 쪽이 정한다.
//
// 사용:
//   node <이 파일> snapshots --session <session_id>
//   node <이 파일> changed --repo <레포> [--base <ref>]
//   node <이 파일> squash-check --repo <레포> --before <정리 전 ref>

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 스냅샷 위치·파일명 규약의 정본은 쓰는 쪽(deploy/hooks/snapshot-precompact-transcript.mjs)이다.
// 여기 사본을 두는 이유는 훅이 배포돼 나가는 파일이라 import가 안 되기 때문이고, 그래서
// meta/coupling.json에 짝꿍으로 올려 뒀다.
const SNAPSHOT_DIR = path.join(os.homedir(), '.claude', 'precompact-snapshots');

// 보강 매칭 조건 중 **파일로 판정되는 것만**. 대화 쪽 조건(그 스킬을 불렀는가)은 세션만 안다.
const AUGMENTATION_PATHS = [
  { key: 'workflow', re: /(^|\/)plan\/pr\d+\// },
  { key: 'digest', re: /(^|\/)knowledge\// },
  { key: 'refresh-prompts', re: /refresh-prompts\/state\.json$/ },
];

const [command, ...rest] = process.argv.slice(2);
const optOf = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return { error: `${e.stderr || e.message}`.trim().split('\n').pop() };
  }
}

if (command === 'snapshots') {
  const session = optOf('session');
  if (!session) {
    console.error('snapshots 에는 --session <session_id> 가 필요합니다.');
    process.exit(1);
  }
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    console.log(`스냅샷 폴더가 없다 (${SNAPSHOT_DIR}) — 이 기기에서 압축이 일어난 적이 없다.`);
    process.exit(0);
  }
  const hits = fs
    .readdirSync(SNAPSHOT_DIR)
    .filter((f) => f.startsWith(session) && f.endsWith('.jsonl'))
    .map((f) => ({ f, at: fs.statSync(path.join(SNAPSHOT_DIR, f)).mtimeMs }))
    .sort((a, b) => b.at - a.at);

  if (!hits.length) {
    console.log('이 세션의 스냅샷 없음 — 압축이 없었던 세션이다. 회수 단계를 건너뛴다.');
    process.exit(0);
  }
  console.log(`[압축 스냅샷] ${hits.length}건 (최신순). 가장 위를 Read해 압축 이전 구간의 교정을 회수한다:`);
  hits.forEach(({ f }, i) => console.log(`  ${i === 0 ? '→' : ' '} ${path.join(SNAPSHOT_DIR, f)}`));
  process.exit(0);
}

if (command === 'changed') {
  const repo = optOf('repo') ?? process.cwd();
  const base = optOf('base');
  const args = base ? ['diff', '--name-only', `${base}...HEAD`] : ['status', '--porcelain=v1', '--untracked-files=all'];
  const out = git(repo, args);
  if (out.error) {
    console.error(`git 실행 실패: ${out.error}`);
    process.exit(1);
  }
  const files = out
    .split('\n')
    .filter(Boolean)
    .map((l) => (base ? l : l.slice(3)))
    .map((f) => f.replaceAll('\\', '/'));

  console.log(`[변경 파일] ${files.length}건 (${base ? `${base}...HEAD` : '작업 트리'})`);
  const matched = AUGMENTATION_PATHS.filter(({ re }) => files.some((f) => re.test(f)));
  console.log(`\n[파일로 걸리는 보강] ${matched.length}건`);
  for (const { key, re } of matched) {
    console.log(`  ${key} — ${files.filter((f) => re.test(f)).slice(0, 4).join(', ')}`);
  }
  console.log('\n  대화 쪽 조건(그 스킬을 이 세션에서 불렀는가)은 세션만 아는 사실이라 여기서 안 본다.');
  process.exit(0);
}

if (command === 'squash-check') {
  const repo = optOf('repo') ?? process.cwd();
  const before = optOf('before');
  if (!before) {
    console.error('squash-check 에는 --before <정리 전 ref> 가 필요합니다. 정리를 시작하기 전에 그 SHA를 잡아둔다.');
    process.exit(1);
  }
  // 커밋 로그가 아니라 **트리**를 맞댄다. 합치는 일은 히스토리를 바꾸는 것이고, 바뀌면 안 되는
  // 것은 최종 파일 내용이다.
  const diff = git(repo, ['diff', '--stat', before, 'HEAD']);
  if (diff.error) {
    console.error(`git diff 실패: ${diff.error}`);
    process.exit(1);
  }
  const commits = git(repo, ['rev-list', '--count', `${before}..HEAD`]);
  console.log(`[squash 전후 대조] ${before.slice(0, 8)} → HEAD (그 사이 커밋 ${commits}개)`);
  if (!diff) {
    console.log('  파일 내용 차이 없음 — 합치기가 내용을 안 건드렸다.');
    process.exit(0);
  }
  console.log('  ✗ 파일 내용이 달라졌다. 합치다 hunk가 빠졌을 수 있다:');
  console.log(diff.split('\n').map((l) => `    ${l}`).join('\n'));
  process.exit(1);
}

console.error(`모르는 명령: ${command ?? '(없음)'}`);
process.exit(1);
