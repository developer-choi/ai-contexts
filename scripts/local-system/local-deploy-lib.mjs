// 로컬판 settings/hooks 배포 라이브러리.
//
// local/의 settings 재료와 hook을 repo-local 산출물(.claude/settings.json·.claude/hooks/)로
// 배포한다. settings.json은 통째 덮어쓰지 않고 deploy-lib의 부분키 머지(mergeSettings,
// .ac-keys 매니페스트)를 그대로 재사용한다. 분기점은 settings-projection의 LOCAL_ADAPTERS
// (repo-relative command)뿐이다.
//
// **per-repo 일반화**: 경로는 repo를 인자로 받는 localPaths(repo)에서 파생한다. 인자를
// 생략하면 AC(repoDir)로 흘러 기존 호출부·AC 산출물이 불변이다. base-settings를 가진 임의
// 레포(KA 등)가 자기 .claude/로 로컬 hook을 배포할 수 있다(projectRepoLocalSettings).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildHooks, LOCAL_ADAPTERS, localHookCommand } from '../settings/settings-projection.mjs';
import {
  logTreeChanges,
  mergeSettings,
  readJson,
  readTreeEntries,
  removePath,
  repoDir,
  settingsManifestPath,
  splitSettings,
  syncTree,
  verifySettings,
  writeJson,
} from '../lib/deploy-lib.mjs';

// repo 루트 → 로컬 배포 경로 묶음. 모든 경로 파생의 단일 출처.
function localPaths(repo) {
  const localSourceDir = path.join(repo, 'local');
  const localClaudeDir = path.join(repo, '.claude');
  return {
    localSourceDir,
    localBaseSettingsSource: path.join(localSourceDir, 'base-settings.json'),
    localClaudeDir,
    localClaudeSettingsPath: path.join(localClaudeDir, 'settings.json'),
    localHooksSource: path.join(localSourceDir, 'hooks'),
    localClaudeHooksDir: path.join(localClaudeDir, 'hooks'),
  };
}

// AC(repoDir) 기준 경로 상수 — 기존 호출부(sync/unsync-local-system) 호환.
const {
  localSourceDir,
  localClaudeDir,
  localClaudeSettingsPath,
  localHooksSource,
  localClaudeHooksDir,
} = localPaths(repoDir);

const buildOpts = { adapters: LOCAL_ADAPTERS, makeCommand: localHookCommand };

function loadLocalBaseSettings(repo = repoDir) {
  const { localBaseSettingsSource } = localPaths(repo);
  if (!fs.existsSync(localBaseSettingsSource) || !fs.statSync(localBaseSettingsSource).isFile()) {
    throw new Error(`local/base-settings.json을 찾을 수 없습니다: ${localBaseSettingsSource}`);
  }
  return readJson(localBaseSettingsSource);
}

function loadLocalOverride(name, repo = repoDir) {
  const overridePath = path.join(localPaths(repo).localSourceDir, name);
  return fs.existsSync(overridePath) && fs.statSync(overridePath).isFile() ? readJson(overridePath) : {};
}

// .claude/settings.json에 부분 머지될 객체(hooks + claude 전용 override).
function localClaudeSettingsObject(repo = repoDir) {
  return { hooks: buildHooks(loadLocalBaseSettings(repo).hooks, 'claude', buildOpts), ...loadLocalOverride('claude-settings.json', repo) };
}

// base-settings.json이 있는가 = 로컬 settings/hooks 배포 대상 레포인가.
function hasLocalSettings(repo) {
  const { localBaseSettingsSource } = localPaths(repo);
  return fs.existsSync(localBaseSettingsSource) && fs.statSync(localBaseSettingsSource).isFile();
}

// local/hooks/*.mjs를 .claude/hooks/에 맞춘다. 내용이 바뀐 파일만 쓰고, 소스에서 사라진
// hook(고아)은 지운다.
function copyLocalHooks(log = console.log, repo = repoDir) {
  const p = localPaths(repo);
  if (!fs.existsSync(p.localHooksSource) || !fs.statSync(p.localHooksSource).isDirectory()) {
    throw new Error(`local/hooks/를 찾을 수 없습니다: ${p.localHooksSource}`);
  }
  const entries = readTreeEntries(p.localHooksSource);
  const hooksDir = p.localClaudeHooksDir;
  logTreeChanges(log, `${path.relative(repo, hooksDir).replaceAll(path.sep, '/')}/`, syncTree(hooksDir, entries));
}

// AC가 생성한 로컬 산출물만 제거한다. .claude/settings.json은 splitSettings로 AC 키만
// 부분 제거(사용자 키 보존), .claude/hooks 디렉토리는 AC 전유라 통째 제거.
function uninstallLocal(log = console.log, repo = repoDir) {
  const p = localPaths(repo);
  let removed = 0;

  if (splitSettings(localClaudeSettingsObject(repo), p.localClaudeSettingsPath)) {
    log('  SPLIT .claude/settings.json');
    removed += 1;
  }
  if (fs.existsSync(p.localClaudeHooksDir)) {
    removePath(p.localClaudeHooksDir);
    log('  DEL   .claude/hooks/');
    removed += 1;
  }
  return removed;
}

// 한 레포의 로컬 settings/hooks를 투영한다(sync-local-system part-2를 추출·일반화).
// hook 맞추기(고아 제거 포함) → claude 부분키 머지 → 배포 후 검증.
// 반환: 실패 메시지 배열(빈 배열이면 성공).
async function projectRepoLocalSettings(repo, { log = console.log } = {}) {
  const p = localPaths(repo);
  const failures = [];

  // 지우고 다시 쓰지 않는다 — 바뀐 파일만 쓴다(이유는 deploy-lib의 writeIfChanged 주석).
  // settings.json의 고아 키는 mergeSettings가 .ac-keys 매니페스트로 걷는다.
  copyLocalHooks(log, repo);

  if (mergeSettings(localClaudeSettingsObject(repo), p.localClaudeSettingsPath)) {
    log('  MERGE .claude/settings.json');
  }

  if (verifySettings(localClaudeSettingsObject(repo), p.localClaudeSettingsPath)) {
    log('  PASS  .claude/settings.json (merged)');
  } else {
    failures.push(`${repo}: .claude/settings.json 머지 결과 키 불일치`);
    console.error('  FAIL  .claude/settings.json 머지 결과 키 불일치');
  }

  return failures;
}

const defaultLocalRoots = [
  path.join(os.homedir(), 'WebstormProjects', 'main'),
  path.join(os.homedir(), 'WebstormProjects', 'my-else'),
];

// scanRoots 아래의 git 워크트리(직속 자식, 또는 root 자체가 워크트리면 그것)를 나열한다.
// sync-local-assets의 스캔과 동일 규칙. .claude/worktrees 같은 중첩은 재귀하지 않는다.
function listLocalRepos(scanRoots = defaultLocalRoots) {
  const isDir = (t) => fs.existsSync(t) && fs.statSync(t).isDirectory();
  const isGitWorktree = (r) => fs.existsSync(path.join(r, '.git'));
  const repos = [];
  for (const root of scanRoots) {
    if (!isDir(root)) continue;
    if (isGitWorktree(root)) {
      repos.push(root);
      continue;
    }
    for (const entry of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      const repo = path.join(root, entry.name);
      if (isGitWorktree(repo)) repos.push(repo);
    }
  }
  return repos;
}

export {
  buildOpts,
  copyLocalHooks,
  defaultLocalRoots,
  hasLocalSettings,
  listLocalRepos,
  loadLocalBaseSettings,
  localClaudeDir,
  localClaudeHooksDir,
  localClaudeSettingsObject,
  localClaudeSettingsPath,
  localHooksSource,
  localPaths,
  localSourceDir,
  mergeSettings,
  projectRepoLocalSettings,
  settingsManifestPath,
  uninstallLocal,
  writeJson,
};
