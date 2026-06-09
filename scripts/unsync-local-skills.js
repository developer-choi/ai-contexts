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

// sync-local-skills.js와 동일 규칙: local/ 하위에서 claude·codex 공통 배포 디렉토리(hooks 제외).
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

function unsyncRepo(repo) {
  try {
    const removed = [];
    const deployDirs = localDeployDirs(repo);
    const claudeDir = path.join(repo, '.claude');
    const agentsDir = path.join(repo, '.agents');

    for (const name of deployDirs) {
      const source = path.join(repo, 'local', name);
      for (const [label, base] of [['.claude', claudeDir], ['.agents', agentsDir]]) {
        const target = path.join(base, name);
        if (!existsDir(target)) continue;
        if (existsDir(source) && comparePaths(source, target)) {
          fs.rmSync(target, { recursive: true, force: true });
          removed.push(`${label}/${name}`);
        } else {
          return { repo, status: 'skipped', detail: `${label}/${name} differs from local/${name}` };
        }
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

    const geminiFile = path.join(repo, 'GEMINI.md');
    if (isFile(geminiFile)) {
      if (isFile(claudeAgents) && sameFile(claudeAgents, geminiFile)) {
        fs.rmSync(geminiFile, { force: true });
        removed.push('GEMINI.md');
      } else {
        return { repo, status: 'skipped', detail: 'GEMINI.md differs from CLAUDE.md' };
      }
    }

    if (existsDir(agentsDir) && fs.readdirSync(agentsDir).length === 0) {
      fs.rmSync(agentsDir, { recursive: true, force: true });
      removed.push('.agents/');
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

module.exports = { unsyncLocalSkills: main };

if (require.main === module) {
  main();
}
