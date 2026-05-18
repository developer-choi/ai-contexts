#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const { comparePaths, resolveUserPath } = require('./deploy-lib');

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

function unsyncRepo(repo) {
  try {
    const removed = [];
    const claudeSkills = path.join(repo, '.claude', 'skills');
    const agentsSkills = path.join(repo, '.agents', 'skills');
    const agentsDir = path.join(repo, '.agents');

    if (existsDir(agentsSkills)) {
      if (existsDir(claudeSkills) && comparePaths(claudeSkills, agentsSkills)) {
        fs.rmSync(agentsSkills, { recursive: true, force: true });
        removed.push('.agents/skills');
      } else {
        return { repo, status: 'skipped', detail: '.agents/skills differs from .claude/skills' };
      }
    }

    const claudeAgents = path.join(repo, 'CLAUDE.md');
    const agentsFile = path.join(repo, 'AGENTS.md');
    if (isFile(agentsFile)) {
      if (isFile(claudeAgents) && sameFile(claudeAgents, agentsFile)) {
        fs.rmSync(agentsFile, { force: true });
        removed.push('AGENTS.md');
      } else {
        return { repo, status: 'skipped', detail: 'AGENTS.md differs from CLAUDE.md' };
      }
    }

    if (existsDir(agentsDir) && fs.readdirSync(agentsDir).length === 0) {
      fs.rmSync(agentsDir, { recursive: true, force: true });
      removed.push('.agents/');
    }

    if (removed.length === 0) {
      return { repo, status: 'skipped', detail: 'no generated local skills' };
    }

    return { repo, status: 'removed', detail: removed.join(', ') };
  } catch (error) {
    return { repo, status: 'failed', detail: error.message };
  }
}

function printResults(results) {
  console.log('로컬 스킬 제거 결과');
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

function isFile(target) {
  return fs.existsSync(target) && fs.statSync(target).isFile();
}

function sameFile(left, right) {
  return fs.readFileSync(left).equals(fs.readFileSync(right));
}

main();
