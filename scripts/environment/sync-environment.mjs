#!/usr/bin/env node
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  upsertManagedBlock,
  writeWholeFile,
  queryRegValue,
  setRegValue,
  runs,
} from './environment-lib.mjs';
import {
  assertGitSupportsConfigHooks,
  registerRepoHooks,
  registerGlobalHook,
  tracksHooksDir,
} from '../lib/git-hooks.mjs';

const home = os.homedir();
const stateDir = path.join(home, '.ai-contexts');
const stateFile = path.join(stateDir, 'environment-state.json');
const globalGitignore = path.join(home, '.gitignore_global');
const cmdAutorunFile = path.join(home, 'autorun.cmd');
const cmdProcessorKey = 'HKCU\\Software\\Microsoft\\Command Processor';
const countHardcodingHookSrc = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'hooks',
  'check-count-hardcoding.mjs',
);
const countHardcodingHookDest = path.join(stateDir, 'check-count-hardcoding.mjs');

const cmdAutorunBody = `@echo off
echo %CMDCMDLINE% | findstr /i " /c " >nul
if errorlevel 1 (
    if /i "%CD%"=="%USERPROFILE%" cd /d %USERPROFILE%\\WebstormProjects\\main
)
`;

const powershellProfileBlock = `
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom
$PSDefaultParameterValues['Get-Content:Encoding'] = 'UTF8'
$PSDefaultParameterValues['Select-String:Encoding'] = 'UTF8'
if ($Host.Name -eq 'ConsoleHost') {
  chcp 65001 > $null
}
`;

function main() {
  const state = readState();

  console.log('--- PowerShell ---');
  syncPowerShell(state);

  console.log('--- Global gitignore ---');
  syncGlobalGitignore(state);

  console.log('--- cmd autorun ---');
  syncCmdAutorun(state);

  console.log('--- git 설정 훅 등록 ---');
  syncRepoGitHooks();

  console.log('--- 개수 하드코딩 검사 훅 ---');
  syncCountHardcodingHook(state);

  writeState(state);
  console.log('Environment sync complete.');
}

// 프롬프트 md 커밋에서 개수 하드코딩(「구체적인 개수를 본문에 하드코딩하지 않는다」)을 감지하는
// 전역 pre-commit 훅. 어느 레포에서 어느 도구로 커밋하든 발동해야 하므로 레포 로컬 `.githooks`가
// 아니라 `--global` 설정으로 건다(scripts/lib/git-hooks.mjs의 registerGlobalHook).
// 스크립트 원본은 AC scripts/hooks/에 두고 ~/.ai-contexts/에 그대로 복사한다 — 도구 중립적인
// 폴더라 Claude Code 설치 여부와 무관하게 살아 있어야 하는 git 훅에 맞다.
function syncCountHardcodingHook(state) {
  assertGitSupportsConfigHooks();

  const body = fs.readFileSync(countHardcodingHookSrc, 'utf8');
  const status = writeWholeFile(countHardcodingHookDest, body);
  console.log(
    {
      created: `Created ${countHardcodingHookDest}`,
      updated: `Updated ${countHardcodingHookDest}`,
      unchanged: `Already up to date: ${countHardcodingHookDest}`,
    }[status],
  );

  // `|| true`로 감싸는 이유: 전역 훅이라 실패하면 모든 레포의 모든 커밋이 막힌다. 스크립트 내부
  // 오류는 스크립트가 스스로 삼키지만(항상 exit 0), 파일 자체가 없거나 node가 없으면 그 앞에서
  // non-zero로 죽어 커밋이 차단된다. 정탐률이 낮은 알림 때문에 전체 작업이 멈추면 안 되므로 셸
  // 수준에서도 통과시킨다. 실측: `|| true`가 없으면 스크립트 경로가 사라졌을 때 커밋이 실제로 거부된다.
  const command = `node "${countHardcodingHookDest}" || true`;
  const changed = registerGlobalHook('count-hardcode', 'pre-commit', command);
  state.countHardcodingHookSetByAiContexts = true;
  console.log(changed ? `전역 pre-commit 훅 등록: ${command}` : '전역 pre-commit 훅 이미 등록됨');
}

// ~/WebstormProjects/<group>/<repo> 중 .githooks가 추적되는 레포마다, 그 훅들을 git 설정 훅으로
// 등록한다(git-hooks.mjs). 설정은 .git/config에 들어가고 그 파일은 워크트리끼리 공유되므로,
// 레포당 한 번 등록하면 이후 만드는 워크트리에는 아무것도 갖다 놓지 않아도 훅이 발동한다.
//
// 이 등록이 유일한 배선이다 — 각 레포에 prepare나 설치 스크립트를 두지 않는다. 그래서 새 머신에서는
// 이 명령을 먼저 돌려야 하고, 돌리기 전 클론은 훅이 없는 상태다(가이드의 "새 머신 기준" 참고).
//
// 링크된 워크트리(.git이 파일)는 건드리지 않는다 — 설정은 공용이라 primary에서 한 번이면 충분하고,
// 워크트리를 대상에 넣으면 같은 레포를 여러 번 쓰게 된다.
function syncRepoGitHooks() {
  const projectsRoot = path.join(home, 'WebstormProjects');
  if (!fs.existsSync(projectsRoot)) {
    console.log('WebstormProjects 디렉토리가 없어 훅 등록을 건너뜁니다.');
    return;
  }

  // 버전이 낮으면 등록해봐야 git이 조용히 무시한다. 레포를 돌기 전에 여기서 끊는다.
  assertGitSupportsConfigHooks();

  const changed = [];
  const already = [];
  for (const group of readDirsSafe(projectsRoot)) {
    for (const repo of readDirsSafe(path.join(projectsRoot, group))) {
      const repoPath = path.join(projectsRoot, group, repo);
      if (!isPrimaryWorktree(repoPath)) continue;
      if (!tracksHooksDir(repoPath)) continue;
      const { changed: didChange, hooks } = registerRepoHooks(repoPath);
      (didChange ? changed : already).push(`${group}/${repo}(${hooks.join(',')})`);
    }
  }

  if (changed.length) console.log(`설정 훅 등록: ${changed.join(', ')}`);
  console.log(already.length ? `이미 등록됨: ${already.join(', ')}` : '');
  if (!changed.length && !already.length) console.log('.githooks를 추적하는 레포가 없습니다.');
}

function readDirsSafe(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
}

function isPrimaryWorktree(repoPath) {
  try {
    return fs.statSync(path.join(repoPath, '.git')).isDirectory();
  } catch {
    return false;
  }
}

function syncPowerShell(state) {
  if (process.platform !== 'win32') {
    console.log('Skipping PowerShell setup because this is not Windows.');
    return;
  }

  let pwsh = findPowerShell7Command();
  if (!pwsh) {
    pwsh = installPowerShell7(state);
  }

  if (pwsh) {
    const version = childProcess.execFileSync(pwsh, ['--version'], { encoding: 'utf8' }).trim();
    console.log(`PowerShell 7 available: ${version}`);
  } else {
    console.warn('PowerShell 7 is unavailable. UTF-8 profile setup will still be applied to Windows PowerShell.');
  }

  for (const profile of new Set(getPowerShellProfiles(pwsh))) {
    upsertManagedBlock(profile, {
      start: '# >>> ai-contexts powershell utf8 >>>',
      end: '# <<< ai-contexts powershell utf8 <<<',
      body: powershellProfileBlock,
      legacyPatterns: [
        /# >>> ai-contexts utf8 >>>[\s\S]*?# <<< ai-contexts utf8 <<<\r?\n?/,
        /# >>> test-playground powershell utf8 >>>[\s\S]*?# <<< test-playground powershell utf8 <<<\r?\n?/,
      ],
    });
  }
}

function syncGlobalGitignore(state) {
  const currentPath = getGlobalGitExcludesFile();

  if (currentPath && path.resolve(currentPath) !== path.resolve(globalGitignore)) {
    console.warn(`core.excludesFile is already set to: ${currentPath}`);
    console.warn(`Skipping registration of ${globalGitignore}`);
  } else if (!currentPath) {
    childProcess.execFileSync('git', ['config', '--global', 'core.excludesFile', globalGitignore], {
      stdio: 'ignore',
    });
    state.gitCoreExcludesFileSetByAiContexts = true;
    console.log(`Registered core.excludesFile = ${globalGitignore}`);
  } else {
    console.log(`core.excludesFile already registered as ${globalGitignore}`);
  }

  upsertManagedBlock(globalGitignore, {
    start: '# >>> ai-contexts global gitignore >>>',
    end: '# <<< ai-contexts global gitignore <<<',
    body: 'plan/',
    legacyLinePatterns: [/^plan\/$/, /^backlog\/$/],
  });
}

function syncCmdAutorun(state) {
  if (process.platform !== 'win32') {
    console.log('Skipping cmd autorun setup because this is not Windows.');
    return;
  }

  const status = writeWholeFile(cmdAutorunFile, cmdAutorunBody);
  console.log({ created: `Created ${cmdAutorunFile}`, updated: `Updated ${cmdAutorunFile}`, unchanged: `Already up to date: ${cmdAutorunFile}` }[status]);

  const desired = `@${cmdAutorunFile}`;
  const current = queryRegValue(cmdProcessorKey, 'AutoRun');

  if (current === desired) {
    state.cmdAutorunRegSetByAiContexts = true;
    console.log(`AutoRun already registered as ${desired}`);
  } else if (!current) {
    setRegValue(cmdProcessorKey, 'AutoRun', desired);
    state.cmdAutorunRegSetByAiContexts = true;
    console.log(`Registered AutoRun = ${desired}`);
  } else {
    console.warn(`AutoRun is already set to: ${current}`);
    console.warn(`Skipping registration of ${desired}`);
  }
}

function findPowerShell7Command() {
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    'pwsh',
    localAppData && path.join(localAppData, 'Microsoft', 'WindowsApps', 'pwsh.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'PowerShell', '7', 'pwsh.exe'),
  ].filter(Boolean);

  return candidates.find((candidate) => runs(candidate, ['--version'])) || null;
}

function installPowerShell7(state) {
  if (!runs('winget', ['--version'])) {
    console.warn('winget was not found. Install PowerShell 7 manually, then rerun sync:environment.');
    return null;
  }

  console.log('Installing PowerShell 7 with winget...');
  childProcess.execFileSync(
    'winget',
    [
      'install',
      '--exact',
      '--id',
      'Microsoft.PowerShell',
      '--source',
      'winget',
      '--accept-package-agreements',
      '--accept-source-agreements',
    ],
    { stdio: 'inherit' }
  );
  state.powerShell7InstalledByAiContexts = true;
  return findPowerShell7Command();
}

function getPowerShellProfiles(pwsh) {
  return [
    getPowerShellProfile('powershell', path.join(home, 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1')),
    getPowerShellProfile(pwsh || 'pwsh', path.join(home, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1')),
  ];
}

function getPowerShellProfile(command, fallback) {
  try {
    const profile = childProcess.execFileSync(command, ['-NoProfile', '-Command', '$PROFILE'], {
      encoding: 'utf8',
    }).trim();
    return profile || fallback;
  } catch {
    return fallback;
  }
}

function getGlobalGitExcludesFile() {
  try {
    return childProcess.execFileSync('git', ['config', '--global', '--get', 'core.excludesFile'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
}

function readState() {
  if (!fs.existsSync(stateFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  if (Object.keys(state).length === 0) {
    fs.rmSync(stateFile, { force: true });
    return;
  }

  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

main();
