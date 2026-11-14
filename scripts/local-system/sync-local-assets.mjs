#!/usr/bin/env node
// 사용법: sync-local-assets.md (같은 폴더)
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

// local/ 하위에서 .claude/로 배포하는 디렉토리. hooks는 원본을 각 레포 `.claude/hooks/`에 커밋하므로
// 제외한다(settings/.json 파일은 디렉토리가 아니라 자연 제외).
// skills는 원본을 각 레포 `.claude/skills/`에 커밋해 Claude Code가 그대로 읽으므로 배포하지 않는다.
// `local/skills`가 다시 생겨도 커밋된 스킬을 덮어쓰지 않게 막는다.
// contexts는 배포하지 않는다. 스킬 본문의 `../../contexts/...`가 배포본 옆에서 풀려야 해서 복사했는데,
// 레포 스킬이 원본 `local/contexts/`를 직접 가리키게 된 뒤로 사본을 읽는 곳이 없다.
// agents도 원본을 각 레포 `.claude/agents/`에 커밋하므로 배포하지 않는다. skills와 같은 이유로 막는다.
// RETIRED_DEPLOY_DIRS에 넣으면 sync가 커밋한 `.claude/agents/`를 지우므로 넣지 않는다.
const LOCAL_DEPLOY_EXCLUDE = new Set(['hooks', 'skills', 'contexts', 'agents']);

// 배포를 멈춘 폴더의 옛 사본. 제외만 하면 그전에 배포된 사본이 남고 아무도 덮어쓰지 않아 조용히 낡는다
// (KA가 그 상태로 낡은 사본의 옛 규칙을 두 달간 읽었다). 그래서 sync가 지운다. 기기마다 sync를 한 번씩
// 돌면 할 일이 끝나므로, 쓰는 기기 모두에서 사본이 사라진 뒤에는 이 목록과 removeRetiredDeployDirs를 걷어도 된다.
const RETIRED_DEPLOY_DIRS = ['contexts'];

function removeRetiredDeployDirs(repo) {
  const removed = [];
  for (const name of RETIRED_DEPLOY_DIRS) {
    const target = path.join(repo, '.claude', name);
    if (!existsDir(target)) continue;
    fs.rmSync(target, { recursive: true, force: true });
    removed.push(`.claude/${name}`);
  }
  return removed;
}

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
  try {
    const retired = removeRetiredDeployDirs(repo).map((directory) => `removed ${directory}`);
    const deployDirs = localDeployDirs(repo);

    if (deployDirs.length === 0) {
      if (retired.length > 0) return { repo, status: 'synced', detail: retired.join(', ') };
      return { repo, status: 'skipped', detail: 'no local/ deploy dirs' };
    }

    const synced = [];
    const claudeDir = path.join(repo, '.claude');
    // 내용이 바뀐 파일만 쓰고, 원본에서 사라진 파일만 지운다(이유는 deploy-lib의 writeIfChanged 주석).
    let changed = retired.length;
    for (const name of deployDirs) {
      const source = path.join(repo, 'local', name);
      const dest = path.join(claudeDir, name);
      const { written, removed } = syncTree(dest, readTreeEntries(source));
      changed += written.length + removed.length;
      synced.push(`local/${name} -> .claude/${name}`);
    }
    const detail = [...synced, ...retired].join(', ');
    if (changed === 0) return { repo, status: 'unchanged', detail };
    return { repo, status: 'synced', detail };
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

export { main as syncLocalAssets };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}
