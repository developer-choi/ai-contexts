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
// contexts는 배포한다 — 스킬 본문의 `../../contexts/...`가 풀리는 자리가 배포본 옆이기 때문이다.
// 한때 사본이 세 벌 되는 것을 피하려 제외했는데, 제외해도 그전에 배포된 사본은 남고 sync가 더는
// 덮어쓰지 않아 조용히 낡는다. KA가 그 상태로 2026-06-14자 규칙을 두 달간 읽었다(2026-08-14 발견).
// 배포하면 sync마다 덮어써져 낡을 수 없고, 고아는 unsync가 청소한다.
const LOCAL_DEPLOY_EXCLUDE = new Set(['hooks']);

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
