#!/usr/bin/env node
// 사용법: sync-local-skills.md (같은 폴더)
//
// 레포마다 local/의 원본을 Claude가 읽는 자리(.claude/)로 복사한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ensureHooksReady } from '../lib/hook-guard.mjs';
import { readTreeEntries, resolveUserPath, syncTree } from '../lib/deploy-lib.mjs';

const defaultRoots = [
  path.join(os.homedir(), 'WebstormProjects', 'main'),
  path.join(os.homedir(), 'WebstormProjects', 'my-else'),
];

function main(opts = {}) {
  if (opts.ensureHooks !== false) ensureHooksReady();

  const roots = process.argv.slice(2).map((root) => resolveUserPath(root));
  const scanRoots = roots.length > 0 ? roots : defaultRoots;

  const results = [];
  for (const root of scanRoots) {
    if (!existsDir(root)) {
      results.push({ repo: root, status: 'skipped', detail: 'root not found' });
      continue;
    }

    if (isGitWorktree(root)) {
      results.push(syncRepo(root));
      continue;
    }

    for (const entry of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      const repo = path.join(root, entry.name);
      if (!isGitWorktree(repo)) continue;
      results.push(syncRepo(repo));
    }
  }

  printResults(results);

  if (results.some((result) => result.status === 'failed')) {
    process.exit(1);
  }
}

// local/ 하위에서 .claude/로 배포하는 디렉토리. hooks는 settings projection이 .claude/hooks로
// 따로 투영하므로 제외한다(settings/.json 파일은 디렉토리가 아니라 자연 제외).
// contexts는 배포한다. 원래 이유는 스킬 본문의 `../../contexts/...`가 배포본 옆에서 풀려야 해서였는데, 레포 스킬이
// 원본 `local/contexts/`를 직접 가리키게 된 뒤로는 그 이유가 없어졌다. 배포를 걷을지는 따로 정한다.
// 한때 사본이 세 벌 되는 것을 피하려 제외했는데, 제외해도 그전에 배포된 사본은 남고 sync가 더는
// 덮어쓰지 않아 조용히 낡는다. KA가 그 상태로 2026-06-14자 규칙을 두 달간 읽었다(2026-08-14 발견).
// 배포하면 sync마다 원본과 맞춰져 낡을 수 없고, 원본에서 사라진 파일은 sync가 지운다.
// skills는 원본을 각 레포 `.claude/skills/`에 커밋해 Claude Code가 그대로 읽으므로 배포하지 않는다.
// `local/skills`가 다시 생겨도 커밋된 스킬을 덮어쓰지 않게 막는다.
const LOCAL_DEPLOY_EXCLUDE = new Set(['hooks', 'skills']);

function localDeployDirs(repo) {
  const localDir = path.join(repo, 'local');
  if (!existsDir(localDir)) return [];
  return fs
    .readdirSync(localDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !LOCAL_DEPLOY_EXCLUDE.has(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function syncRepo(repo) {
  const deployDirs = localDeployDirs(repo);

  if (deployDirs.length === 0) {
    return { repo, status: 'skipped', detail: 'no local/ deploy dirs' };
  }

  try {
    const synced = [];
    const claudeDir = path.join(repo, '.claude');
    // 내용이 바뀐 파일만 쓰고, 원본에서 사라진 파일만 지운다(이유는 deploy-lib의 writeIfChanged 주석).
    let changed = 0;
    for (const name of deployDirs) {
      const source = path.join(repo, 'local', name);
      const dest = path.join(claudeDir, name);
      const { written, removed } = syncTree(dest, readTreeEntries(source));
      changed += written.length + removed.length;
      synced.push(`local/${name} -> .claude/${name}`);
    }
    if (changed === 0) return { repo, status: 'unchanged', detail: synced.join(', ') };
    return { repo, status: 'synced', detail: synced.join(', ') };
  } catch (error) {
    return { repo, status: 'failed', detail: error.message };
  }
}

function printResults(results) {
  console.log('로컬 자산 동기화 결과');
  console.log('---');

  if (results.length === 0) {
    console.log('대상 레포 없음');
    return;
  }

  for (const result of results) {
    console.log(`${shortRepo(result.repo)} | ${result.status} | ${result.detail}`);
  }
}

function shortRepo(repo) {
  const home = os.homedir();
  return repo.startsWith(home) ? repo.slice(home.length + 1) : repo;
}

function isGitWorktree(repo) {
  return fs.existsSync(path.join(repo, '.git'));
}

function existsDir(target) {
  return fs.existsSync(target) && fs.statSync(target).isDirectory();
}

export { main as syncLocalSkills };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}
