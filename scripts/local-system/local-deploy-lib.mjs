// 로컬판 settings/hooks 배포 라이브러리.
//
// 전역 배포(deploy/ → ~/.claude·~/.codex)와 **동일한 메커니즘**을 repo-local 산출물
// (.claude/settings.json·.codex/hooks.json)에 적용한다. 소스는 local/(전역 deploy/의
// 로컬판). settings.json은 통째 덮어쓰지 않고 deploy-lib의 부분키 머지(mergeSettings,
// .ac-keys 매니페스트)를 그대로 재사용한다. 분기점은 settings-projection의 LOCAL_ADAPTERS
// (repo-relative command, codex run_command+Bash 매처)뿐이다.
//
// **per-repo 일반화**: 경로는 repo를 인자로 받는 localPaths(repo)에서 파생한다. 인자를
// 생략하면 AC(repoDir)로 흘러 기존 호출부·AC 산출물이 불변이다. base-settings를 가진 임의
// 레포(KA 등)가 자기 .claude/로 로컬 hook을 배포할 수 있다(projectRepoLocalSettings).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildHooks, LOCAL_ADAPTERS, localHookCommand } from '../settings/settings-projection.mjs';
import {
  copyPath,
  ensureDir,
  mergeSettings,
  readJson,
  removePath,
  repoDir,
  settingsManifestPath,
  splitSettings,
  trustCodexHooks,
  verifyJsonExact,
  verifySettings,
  writeJson,
} from '../lib/deploy-lib.mjs';

// repo 루트 → 로컬 배포 경로 묶음. 모든 경로 파생의 단일 출처.
function localPaths(repo) {
  const localSourceDir = path.join(repo, 'local');
  const localClaudeDir = path.join(repo, '.claude');
  const localCodexDir = path.join(repo, '.codex');
  return {
    localSourceDir,
    localBaseSettingsSource: path.join(localSourceDir, 'base-settings.json'),
    localClaudeDir,
    localCodexDir,
    localClaudeSettingsPath: path.join(localClaudeDir, 'settings.json'),
    localCodexHooksPath: path.join(localCodexDir, 'hooks.json'),
    localHooksSource: path.join(localSourceDir, 'hooks'),
    localClaudeHooksDir: path.join(localClaudeDir, 'hooks'),
    localCodexHooksDir: path.join(localCodexDir, 'hooks'),
  };
}

// AC(repoDir) 기준 경로 상수 — 기존 호출부(sync/unsync-local-system) 호환.
const {
  localSourceDir,
  localClaudeDir,
  localCodexDir,
  localClaudeSettingsPath,
  localCodexHooksPath,
  localHooksSource,
  localClaudeHooksDir,
  localCodexHooksDir,
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

// .codex/hooks.json에 whole-file로 쓰일 객체(codex는 override 없이 hook만).
function localCodexHooksObject(repo = repoDir) {
  return { hooks: buildHooks(loadLocalBaseSettings(repo).hooks, 'codex', buildOpts) };
}

// base-settings.json이 있는가 = 로컬 settings/hooks 배포 대상 레포인가.
function hasLocalSettings(repo) {
  const { localBaseSettingsSource } = localPaths(repo);
  return fs.existsSync(localBaseSettingsSource) && fs.statSync(localBaseSettingsSource).isFile();
}

// codex로 투영되는 hook이 하나라도 있는가. Stop-only base(KA)면 false → codex 산출물 미생성.
function codexHasHooks(repo = repoDir) {
  return Object.keys(localCodexHooksObject(repo).hooks).length > 0;
}

// local/hooks/*.mjs를 .claude/hooks/·(codex hook이 있으면).codex/hooks/로 복사한다. 복사 전
// AC 생성 디렉토리를 제거해 소스에서 사라진 hook(고아)이 잔존하지 않게 한다.
function copyLocalHooks(log = console.log, repo = repoDir) {
  const p = localPaths(repo);
  if (!fs.existsSync(p.localHooksSource) || !fs.statSync(p.localHooksSource).isDirectory()) {
    throw new Error(`local/hooks/를 찾을 수 없습니다: ${p.localHooksSource}`);
  }
  const targets = [[p.localClaudeDir, p.localClaudeHooksDir]];
  if (codexHasHooks(repo)) targets.push([p.localCodexDir, p.localCodexHooksDir]);
  for (const [targetDir, hooksDir] of targets) {
    ensureDir(targetDir);
    removePath(hooksDir);
    copyPath(p.localHooksSource, hooksDir);
    log(`  COPY  ${path.relative(repo, hooksDir).replaceAll(path.sep, '/')}`);
  }
}

// AC가 생성한 로컬 산출물만 제거한다. .claude/settings.json은 splitSettings로 AC 키만
// 부분 제거(사용자 키 보존), codex hooks.json·hooks 디렉토리는 AC 전유라 통째 제거.
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
  if (fs.existsSync(p.localCodexHooksPath)) {
    removePath(p.localCodexHooksPath);
    log('  DEL   .codex/hooks.json');
    removed += 1;
  }
  if (fs.existsSync(p.localCodexHooksDir)) {
    removePath(p.localCodexHooksDir);
    log('  DEL   .codex/hooks/');
    removed += 1;
  }
  return removed;
}

// 한 레포의 로컬 settings/hooks를 투영한다(sync-local-system part-2를 추출·일반화).
// uninstall(고아 제거) → hook 복사 → claude 부분키 머지 → codex whole-file(있을 때만) →
// 배포 후 검증. codex hook이 없는 레포(KA)는 codex write/verify/trust를 건너뛴다.
// 반환: 실패 메시지 배열(빈 배열이면 성공).
async function projectRepoLocalSettings(repo, { log = console.log, trust = true } = {}) {
  const p = localPaths(repo);
  const failures = [];

  uninstallLocal(log, repo);
  copyLocalHooks(log, repo);

  mergeSettings(localClaudeSettingsObject(repo), p.localClaudeSettingsPath);
  log('  MERGE .claude/settings.json');

  const hasCodex = codexHasHooks(repo);
  if (hasCodex) {
    ensureDir(p.localCodexDir);
    writeJson(p.localCodexHooksPath, localCodexHooksObject(repo));
    log('  WRITE .codex/hooks.json');
  }

  if (verifySettings(localClaudeSettingsObject(repo), p.localClaudeSettingsPath)) {
    log('  PASS  .claude/settings.json (merged)');
  } else {
    failures.push(`${repo}: .claude/settings.json 머지 결과 키 불일치`);
    console.error('  FAIL  .claude/settings.json 머지 결과 키 불일치');
  }

  if (hasCodex) {
    if (verifyJsonExact(localCodexHooksObject(repo), p.localCodexHooksPath)) {
      log('  PASS  .codex/hooks.json');
    } else {
      failures.push(`${repo}: .codex/hooks.json 내용 불일치`);
      console.error('  FAIL  .codex/hooks.json 내용 불일치');
    }

    // codex 프로젝트-로컬 훅은 trusted여야 발화한다. best-effort로 trust 시도.
    if (trust) {
      try {
        const trusted = await trustCodexHooks(p.localCodexDir, log, repo);
        if (trusted === 0) {
          console.warn('  WARN  codex hook trust 항목 없음 — codex 세션에서 `/hooks`로 신뢰가 필요할 수 있습니다.');
        }
      } catch (error) {
        console.warn(`  WARN  codex hook trust 건너뜀: ${error instanceof Error ? error.message : String(error)}`);
        console.warn('  WARN  codex 세션에서 `/hooks`로 .codex/hooks.json을 수동 신뢰하세요.');
      }
    }
  }

  return failures;
}

const defaultLocalRoots = [
  path.join(os.homedir(), 'WebstormProjects', 'main'),
  path.join(os.homedir(), 'WebstormProjects', 'my-else'),
];

// scanRoots 아래의 git 워크트리(직속 자식, 또는 root 자체가 워크트리면 그것)를 나열한다.
// sync-local-skills의 스캔과 동일 규칙. .claude/worktrees 같은 중첩은 재귀하지 않는다.
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
  codexHasHooks,
  copyLocalHooks,
  defaultLocalRoots,
  hasLocalSettings,
  listLocalRepos,
  loadLocalBaseSettings,
  localClaudeDir,
  localClaudeHooksDir,
  localClaudeSettingsObject,
  localClaudeSettingsPath,
  localCodexDir,
  localCodexHooksObject,
  localCodexHooksPath,
  localHooksSource,
  localPaths,
  localSourceDir,
  mergeSettings,
  projectRepoLocalSettings,
  settingsManifestPath,
  uninstallLocal,
  writeJson,
};
