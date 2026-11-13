#!/usr/bin/env node
// 사용법: unsync-local-assets.md (같은 폴더)
//
// sync-local-assets.mjs가 만든 산출물을 걷는다. sync만 있고 걷는 쪽이 없으면 원본에서 지운 자산이
// 배포 자리에 남아 계속 읽힌다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { resolveUserPath } from '../lib/deploy-lib.mjs';

const defaultRoots = [
  path.join(os.homedir(), 'WebstormProjects', 'main'),
  path.join(os.homedir(), 'WebstormProjects', 'my-else'),
];

function main() {
  const roots = process.argv.slice(2).map((root) => resolveUserPath(root));
  const scanRoots = roots.length > 0 ? roots : defaultRoots;

  const results = [];
  for (const root of scanRoots) {
    if (!existsDir(root)) {
      results.push({ repo: root, status: 'skipped', detail: 'root not found' });
      continue;
    }

    if (isGitWorktree(root)) {
      results.push(unsyncRepo(root));
      continue;
    }

    for (const entry of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      const repo = path.join(root, entry.name);
      if (!isGitWorktree(repo)) continue;
      results.push(unsyncRepo(repo));
    }
  }

  printResults(results);
}

// 배포 디렉토리 판정은 sync-local-assets.mjs와 같은 제외 집합을 쓴다. hooks는 settings projection이
// .claude/hooks로 따로 처리하므로 제외. skills는 `.claude/skills/`가 커밋된 원본이라 지우면 안 된다.
// contexts는 배포하지 않으므로 지울 산출물이 없다(옛 사본은 sync가 지운다).
const LOCAL_DEPLOY_EXCLUDE = new Set(['hooks', 'skills', 'contexts']);

function localDeployDirs(repo) {
  const localDir = path.join(repo, 'local');
  if (!existsDir(localDir)) return [];
  return fs
    .readdirSync(localDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !LOCAL_DEPLOY_EXCLUDE.has(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function unsyncRepo(repo) {
  try {
    const removed = [];
    const deployDirs = localDeployDirs(repo);
    const claudeDir = path.join(repo, '.claude');

    // .claude/<X>는 local/<X>에서 배포된 gitignore 산출물이다. 동일성 비교 없이
    // 카테고리 단위로 통째 제거한다 — 원본에서 사라진 파일(orphan)도 함께 청소된다. 원본은
    // local/에 남아 re-sync로 복구되므로 사용자 데이터 손실 위험이 없다. (경로 자체가 AC 관리
    // 산출물임을 보장하므로 deploy-conventions의 "AC 관리 여부 확인"을 경로로 충족한다.)
    for (const name of deployDirs) {
      const target = path.join(claudeDir, name);
      if (!existsDir(target)) continue;
      fs.rmSync(target, { recursive: true, force: true });
      removed.push(`.claude/${name}`);
    }

    if (removed.length === 0) {
      return { repo, status: 'skipped', detail: 'no generated local artifacts' };
    }

    return { repo, status: 'removed', detail: removed.join(', ') };
  } catch (error) {
    return { repo, status: 'failed', detail: error.message };
  }
}

function printResults(results) {
  console.log('로컬 자산 제거 결과');
  console.log('---');

  if (results.length === 0) {
    console.log('대상 레포 없음');
    return;
  }

  for (const result of results) {
    console.log(`${shortRepo(result.repo)} | ${result.status} | ${result.detail}`);
  }

  if (results.some((result) => result.status === 'failed')) {
    process.exit(1);
  }
}

function shortRepo(repo) {
  return repo.startsWith(os.homedir()) ? repo.slice(os.homedir().length + 1) : repo;
}

function isGitWorktree(repo) {
  return fs.existsSync(path.join(repo, '.git'));
}

function existsDir(target) {
  return fs.existsSync(target) && fs.statSync(target).isDirectory();
}

export { main as unsyncLocalAssets };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
