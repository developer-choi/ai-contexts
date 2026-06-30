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

  writeState(state);
  console.log('Environment sync complete.');
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
