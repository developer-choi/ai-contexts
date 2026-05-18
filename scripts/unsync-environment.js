#!/usr/bin/env node
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const home = os.homedir();
const stateDir = path.join(home, '.ai-contexts');
const stateFile = path.join(stateDir, 'environment-state.json');
const globalGitignore = path.join(home, '.gitignore_global');

function main() {
  const state = readState();

  console.log('--- PowerShell ---');
  unsyncPowerShell(state);

  console.log('--- Global gitignore ---');
  unsyncGlobalGitignore(state);

  if (state.powerShell7InstalledByAiContexts) {
    uninstallPowerShell7(state);
  }

  writeState(state);
  console.log('Environment unsync complete.');
}

function unsyncPowerShell() {
  if (process.platform !== 'win32') {
    console.log('Skipping PowerShell setup removal because this is not Windows.');
    return;
  }

  const pwsh = findPowerShell7Command();
  for (const profile of new Set(getPowerShellProfiles(pwsh))) {
    removeManagedBlocks(profile, [
      /# >>> ai-contexts powershell utf8 >>>[\s\S]*?# <<< ai-contexts powershell utf8 <<<\r?\n?/,
      /# >>> ai-contexts utf8 >>>[\s\S]*?# <<< ai-contexts utf8 <<<\r?\n?/,
      /# >>> test-playground powershell utf8 >>>[\s\S]*?# <<< test-playground powershell utf8 <<<\r?\n?/,
    ]);
  }
}

function unsyncGlobalGitignore(state) {
  removeManagedBlocks(globalGitignore, [
    /# >>> ai-contexts global gitignore >>>[\s\S]*?# <<< ai-contexts global gitignore <<<\r?\n?/,
  ]);

  if (!state.gitCoreExcludesFileSetByAiContexts) return;

  const currentPath = getGlobalGitExcludesFile();
  if (path.resolve(currentPath || '') === path.resolve(globalGitignore)) {
    childProcess.execFileSync('git', ['config', '--global', '--unset', 'core.excludesFile'], {
      stdio: 'ignore',
    });
    console.log('Removed global core.excludesFile registration');
  }
  delete state.gitCoreExcludesFileSetByAiContexts;
}

function uninstallPowerShell7(state) {
  if (!runs('winget', ['--version'])) {
    console.warn('winget was not found. Skipping PowerShell 7 uninstall.');
    return;
  }

  try {
    childProcess.execFileSync(
      'winget',
      [
        'uninstall',
        '--exact',
        '--id',
        'Microsoft.PowerShell',
        '--source',
        'winget',
        '--accept-source-agreements',
      ],
      { stdio: 'inherit' }
    );
    delete state.powerShell7InstalledByAiContexts;
  } catch (error) {
    console.warn(`PowerShell 7 uninstall skipped or failed: ${error.message}`);
  }
}

function removeManagedBlocks(file, patterns) {
  if (!fs.existsSync(file)) {
    console.log(`Already absent: ${file}`);
    return;
  }

  const existing = fs.readFileSync(file, 'utf8');
  const next = patterns.reduce((content, pattern) => content.replace(pattern, ''), existing);

  if (next === existing) {
    console.log(`No ai-contexts block found: ${file}`);
    return;
  }

  fs.copyFileSync(file, `${file}.bak-${timestamp()}`);
  if (next.trim().length === 0) {
    fs.rmSync(file, { force: true });
    console.log(`Removed empty file: ${file}`);
  } else {
    fs.writeFileSync(file, next, 'utf8');
    console.log(`Updated ${file}`);
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

function runs(command, args) {
  try {
    childProcess.execFileSync(command, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
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
  const keys = Object.keys(state);
  if (keys.length === 0) {
    fs.rmSync(stateFile, { force: true });
    return;
  }

  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

main();
