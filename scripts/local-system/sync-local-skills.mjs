#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ensureHooksReady } from '../lib/hook-guard.mjs';
import { copyPath, ensureDir, injectSkillName, listEntries, resolveUserPath } from '../lib/deploy-lib.mjs';

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

// local/ 하위에서 claude·codex 공통으로 배포하는 디렉토리. hooks는 settings projection이
// .claude/hooks·.codex/hooks로 따로 투영하므로 제외한다(settings/.json 파일은 디렉토리가 아니라 자연 제외).
// contexts는 스킬 supporting file의 단일 정본(local/contexts/, git 추적·비배포)이라 제외한다 — 배포하면
// .claude/contexts·.agents/contexts로 복제돼 한 파일이 3벌이 되므로, 스킬은 repo-상대 local/contexts/...로 참조한다.
const LOCAL_DEPLOY_EXCLUDE = new Set(['hooks', 'contexts']);

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
  const claudeAgents = resolveClaudeAgents(repo);
  const hasAgents = claudeAgents !== null;

  if (deployDirs.length === 0 && !hasAgents) {
    return { repo, status: 'skipped', detail: 'no local/ deploy dirs or CLAUDE.md' };
  }

  try {
    const synced = [];
    const claudeDir = path.join(repo, '.claude');
    const agentsDir = path.join(repo, '.agents');
    for (const name of deployDirs) {
      const source = path.join(repo, 'local', name);
      ensureDir(claudeDir);
      ensureDir(agentsDir);
      for (const targetDir of [claudeDir, agentsDir]) {
        const dest = path.join(targetDir, name);
        copyPath(source, dest);
        // 스킬 SKILL.md에는 폴더명 name을 주입한다(Antigravity는 name 필수 — deploy-lib 참고).
        if (name === 'skills') {
          for (const skill of listEntries(dest)) {
            if (skill.isDirectory()) injectSkillName(path.join(dest, skill.name));
          }
        }
      }
      synced.push(`local/${name} -> .claude/${name}, .agents/${name}`);
    }
    if (hasAgents) {
      copyPath(claudeAgents, path.join(repo, 'AGENTS.md'));
      copyPath(claudeAgents, path.join(repo, 'GEMINI.md'));
      synced.push(`${shortSource(repo, claudeAgents)} -> AGENTS.md, GEMINI.md`);
    }
    return { repo, status: 'synced', detail: synced.join(', ') };
  } catch (error) {
    return { repo, status: 'failed', detail: error.message };
  }
}

function printResults(results) {
  console.log('로컬 스킬 동기화 결과');
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

function resolveClaudeAgents(repo) {
  const candidate = path.join(repo, 'CLAUDE.md');
  return fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : null;
}

function shortSource(repo, file) {
  return path.relative(repo, file).replaceAll(path.sep, '/');
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
