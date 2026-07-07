#!/usr/bin/env node
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  upsertManagedBlock,
  writeWholeFile,
  queryRegValue,
  setRegValue,
  runs,
} from './environment-lib.mjs';

const home = os.homedir();
const stateDir = path.join(home, '.ai-contexts');
const stateFile = path.join(stateDir, 'environment-state.json');
const globalGitignore = path.join(home, '.gitignore_global');
const cmdAutorunFile = path.join(home, 'autorun.cmd');
const cmdProcessorKey = 'HKCU\\Software\\Microsoft\\Command Processor';

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

  console.log('--- .githooks hooksPath ---');
  syncGithooksHooksPath();

  writeState(state);
  console.log('Environment sync complete.');
}

// husky를 걷어내고 추적되는 .githooks 붙박이 훅으로 전환한 개인 레포들의 core.hooksPath를 멱등하게 세팅한다.
// 각 레포 prepare(= git config core.hooksPath .githooks)가 npm install 때 이미 박지만, install을 아직 안 한
// 클론(git pull만 한 다른 머신 등)은 hooksPath가 비어 훅이 조용히 꺼진다. 이 스윕이 그 창을 닫는다.
// ~/WebstormProjects/<group>/<repo> 중 .githooks가 추적되는 레포만 대상. 이미 .githooks면 건드리지 않는다.
function syncGithooksHooksPath() {
  const projectsRoot = path.join(home, 'WebstormProjects');
  if (!fs.existsSync(projectsRoot)) {
    console.log('WebstormProjects 디렉토리가 없어 .githooks 스윕을 건너뜁니다.');
    return;
  }

  const changed = [];
  for (const group of readDirsSafe(projectsRoot)) {
    for (const repo of readDirsSafe(path.join(projectsRoot, group))) {
      const repoPath = path.join(projectsRoot, group, repo);
      // 링크된 워크트리(.git이 파일)는 건드리지 않는다 — core.hooksPath는 공용 config라 그 레포의
      // primary 워크트리까지 바꿔, 아직 .githooks를 머지 안 한 레포를 조기에 뒤집을 수 있다. primary(.git이 디렉토리)만 대상.
      if (!isPrimaryWorktree(repoPath)) continue;
      if (!tracksGithooks(repoPath)) continue;
      if (normalizeGitPath(gitConfigGet(repoPath, 'core.hooksPath')) === '.githooks') continue;
      childProcess.execFileSync('git', ['-C', repoPath, 'config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
      changed.push(`${group}/${repo}`);
    }
  }

  console.log(changed.length ? `core.hooksPath=.githooks 설정: ${changed.join(', ')}` : '.githooks 추적 레포의 hooksPath가 모두 이미 .githooks입니다.');
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

function tracksGithooks(repoPath) {
  const result = childProcess.spawnSync('git', ['-C', repoPath, 'ls-files', '.githooks'], { encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim().length > 0;
}

function gitConfigGet(repoPath, key) {
  const result = childProcess.spawnSync('git', ['-C', repoPath, 'config', '--get', key], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function normalizeGitPath(value) {
  return value.trim().replaceAll('\\', '/').replace(/\/+$/, '');
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
