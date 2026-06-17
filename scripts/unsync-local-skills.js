#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveUserPath } = require('./deploy-lib');

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

    // .claude/<X>·.agents/<X>는 local/<X>에서 배포된 gitignore 산출물이다. 동일성 비교 없이
    // 카테고리 단위로 통째 제거한다 — 원본에서 사라진 스킬(orphan)도 함께 청소된다. 원본은
    // local/에 남아 re-sync로 복구되므로 사용자 데이터 손실 위험이 없다. (경로 자체가 AC 관리
    // 산출물임을 보장하므로 deploy-conventions의 "AC 관리 여부 확인"을 경로로 충족한다.)
    for (const name of deployDirs) {
      for (const [label, base] of [['.claude', claudeDir], ['.agents', agentsDir]]) {
        const target = path.join(base, name);
        if (!existsDir(target)) continue;
        fs.rmSync(target, { recursive: true, force: true });
        removed.push(`${label}/${name}`);
      }
    }

    // AGENTS.md·GEMINI.md는 CLAUDE.md의 투영이다. CLAUDE.md가 있는(=AC 투영 대상) 레포에서만
    // 제거한다 — CLAUDE.md 없는 비-AC 레포의 사용자 AGENTS.md는 건드리지 않는다.
    const claudeAgents = path.join(repo, 'CLAUDE.md');
    if (isFile(claudeAgents)) {
      for (const projected of ['AGENTS.md', 'GEMINI.md']) {
        const file = path.join(repo, projected);
        if (!isFile(file)) continue;
        fs.rmSync(file, { force: true });
        removed.push(projected);
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

module.exports = { unsyncLocalSkills: main };

if (require.main === module) {
  main();
}
