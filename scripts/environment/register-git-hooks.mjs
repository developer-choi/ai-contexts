#!/usr/bin/env node
// 이 레포 하나의 `.githooks/` 를 git 설정 훅으로 등록한다. AC 의 prepare 가 부른다.
//
// 전 레포 스윕은 `npm run sync:environment` 가 한다. 이 CLI 는 AC 를 갓 클론한 직후
// (아직 sync:environment 를 못 돌린 상태) `npm install` 만으로 AC 훅이 살게 하려고 둔다.
import { registerRepoHooks } from '../lib/git-hooks.mjs';

const repoPath = process.argv[2] || process.cwd();

try {
  const { changed, hooks } = registerRepoHooks(repoPath);
  if (hooks.length === 0) {
    console.log('.githooks 에 추적되는 훅이 없습니다.');
  } else {
    console.log(`${changed ? '등록' : '이미 등록됨'}: ${hooks.join(', ')}`);
  }
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
