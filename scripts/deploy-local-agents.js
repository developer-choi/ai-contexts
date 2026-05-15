#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const { copyPath, ensureDir, resolveUserPath } = require('./deploy-lib');

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
      results.push(deployRepo(root));
      continue;
    }

    for (const entry of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      const repo = path.join(root, entry.name);
      if (!isGitWorktree(repo)) continue;
      results.push(deployRepo(repo));
    }
  }

  printResults(results);

  if (results.some((result) => result.status === 'failed')) {
    process.exit(1);
  }
}

function deployRepo(repo) {
  const claudeSkills = path.join(repo, '.claude', 'skills');
  const claudeAgents = resolveClaudeAgents(repo);
  const hasSkills = existsDir(claudeSkills);
  const hasAgents = claudeAgents !== null;

  if (!hasSkills && !hasAgents) {
    return { repo, status: 'skipped', detail: 'no .claude/skills or CLAUDE.md' };
  }

  try {
    const deployed = [];
    const agentsDir = path.join(repo, '.agents');
    if (hasSkills) {
      ensureDir(agentsDir);
      copyPath(claudeSkills, path.join(agentsDir, 'skills'));
      deployed.push('.claude/skills -> .agents/skills');
    }
    if (hasAgents) {
      copyPath(claudeAgents, path.join(repo, 'AGENTS.md'));
      deployed.push(`${shortSource(repo, claudeAgents)} -> AGENTS.md`);
    }
    return { repo, status: 'deployed', detail: deployed.join(', ') };
  } catch (error) {
    return { repo, status: 'failed', detail: error.message };
  }
}

function printResults(results) {
  console.log('로컬 스킬 배포 결과');
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

main();
