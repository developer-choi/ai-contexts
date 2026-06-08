#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const { ensureHooksReady } = require('./hook-guard');
const { copyPath, ensureDir, resolveUserPath } = require('./deploy-lib');

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

function syncRepo(repo) {
  const claudeSkills = path.join(repo, '.claude', 'skills');
  const claudeAgents = resolveClaudeAgents(repo);
  const hasSkills = existsDir(claudeSkills);
  const hasAgents = claudeAgents !== null;

  if (!hasSkills && !hasAgents) {
    return { repo, status: 'skipped', detail: 'no .claude/skills or CLAUDE.md' };
  }

  try {
    const synced = [];
    const agentsDir = path.join(repo, '.agents');
    if (hasSkills) {
      ensureDir(agentsDir);
      copyPath(claudeSkills, path.join(agentsDir, 'skills'));
      synced.push('.claude/skills -> .agents/skills');
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

module.exports = { syncLocalSkills: main };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}
