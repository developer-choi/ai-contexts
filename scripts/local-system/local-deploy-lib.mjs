// 로컬판 settings/hooks 배포 라이브러리.
//
// 전역 배포(deploy/ → ~/.claude·~/.codex)와 **동일한 메커니즘**을 repo-local 산출물
// (.claude/settings.json·.codex/hooks.json)에 적용한다. 소스는 local/(전역 deploy/의
// 로컬판). settings.json은 통째 덮어쓰지 않고 deploy-lib의 부분키 머지(mergeSettings,
// .ac-keys 매니페스트)를 그대로 재사용한다. 분기점은 settings-projection의 LOCAL_ADAPTERS
// (repo-relative command, codex run_command+Bash 매처)뿐이다.
import fs from 'node:fs';
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
  writeJson,
} from '../lib/deploy-lib.mjs';

const localSourceDir = path.join(repoDir, 'local');
const localBaseSettingsSource = path.join(localSourceDir, 'base-settings.json');

// 로컬 타겟(repo-local).
const localClaudeDir = path.join(repoDir, '.claude');
const localCodexDir = path.join(repoDir, '.codex');
const localClaudeSettingsPath = path.join(localClaudeDir, 'settings.json');
const localCodexHooksPath = path.join(localCodexDir, 'hooks.json');
const localHooksSource = path.join(localSourceDir, 'hooks');
const localClaudeHooksDir = path.join(localClaudeDir, 'hooks');
const localCodexHooksDir = path.join(localCodexDir, 'hooks');

const buildOpts = { adapters: LOCAL_ADAPTERS, makeCommand: localHookCommand };

function loadLocalBaseSettings() {
  if (!fs.existsSync(localBaseSettingsSource) || !fs.statSync(localBaseSettingsSource).isFile()) {
    throw new Error(`local/base-settings.json을 찾을 수 없습니다: ${localBaseSettingsSource}`);
  }
  return readJson(localBaseSettingsSource);
}

function loadLocalOverride(name) {
  const overridePath = path.join(localSourceDir, name);
  return fs.existsSync(overridePath) && fs.statSync(overridePath).isFile() ? readJson(overridePath) : {};
}

// .claude/settings.json에 부분 머지될 객체(hooks + claude 전용 override).
function localClaudeSettingsObject() {
  return { hooks: buildHooks(loadLocalBaseSettings().hooks, 'claude', buildOpts), ...loadLocalOverride('claude-settings.json') };
}

// .codex/hooks.json에 whole-file로 쓰일 객체(codex는 override 없이 hook만).
function localCodexHooksObject() {
  return { hooks: buildHooks(loadLocalBaseSettings().hooks, 'codex', buildOpts) };
}

// local/hooks/*.mjs를 .claude/hooks/·.codex/hooks/로 복사한다. 복사 전 AC 생성 디렉토리를
// 제거해 소스에서 사라진 hook(고아)이 잔존하지 않게 한다(전역의 uninstall-후-배포와 동일).
function copyLocalHooks(log = console.log) {
  if (!fs.existsSync(localHooksSource) || !fs.statSync(localHooksSource).isDirectory()) {
    throw new Error(`local/hooks/를 찾을 수 없습니다: ${localHooksSource}`);
  }
  for (const [targetDir, hooksDir] of [
    [localClaudeDir, localClaudeHooksDir],
    [localCodexDir, localCodexHooksDir],
  ]) {
    ensureDir(targetDir);
    removePath(hooksDir);
    copyPath(localHooksSource, hooksDir);
    log(`  COPY  ${path.relative(repoDir, hooksDir).replaceAll(path.sep, '/')}`);
  }
}

// AC가 생성한 로컬 산출물만 제거한다. .claude/settings.json은 splitSettings로 AC 키만
// 부분 제거(사용자 키 보존), codex hooks.json·hooks 디렉토리는 AC 전유라 통째 제거.
function uninstallLocal(log = console.log) {
  let removed = 0;

  if (splitSettings(localClaudeSettingsObject(), localClaudeSettingsPath)) {
    log('  SPLIT .claude/settings.json');
    removed += 1;
  }
  if (fs.existsSync(localClaudeHooksDir)) {
    removePath(localClaudeHooksDir);
    log('  DEL   .claude/hooks/');
    removed += 1;
  }
  if (fs.existsSync(localCodexHooksPath)) {
    removePath(localCodexHooksPath);
    log('  DEL   .codex/hooks.json');
    removed += 1;
  }
  if (fs.existsSync(localCodexHooksDir)) {
    removePath(localCodexHooksDir);
    log('  DEL   .codex/hooks/');
    removed += 1;
  }
  return removed;
}

export {
  buildOpts,
  copyLocalHooks,
  loadLocalBaseSettings,
  localClaudeDir,
  localClaudeHooksDir,
  localClaudeSettingsObject,
  localClaudeSettingsPath,
  localCodexDir,
  localCodexHooksObject,
  localCodexHooksPath,
  localHooksSource,
  localSourceDir,
  mergeSettings,
  settingsManifestPath,
  uninstallLocal,
  writeJson,
};
