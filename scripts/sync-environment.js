#!/usr/bin/env node
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const home = os.homedir();
const stateDir = path.join(home, '.ai-contexts');
const stateFile = path.join(stateDir, 'environment-state.json');
const globalGitignore = path.join(home, '.gitignore_global');

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

function upsertManagedBlock(file, options) {
  const managed = `${options.start}\n${options.body.trim()}\n${options.end}\n`;
  const markerPattern = new RegExp(`${escapeRegExp(options.start)}[\\s\\S]*?${escapeRegExp(options.end)}\\r?\\n?`);

  fs.mkdirSync(path.dirname(file), { recursive: true });

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, managed, 'utf8');
    console.log(`Created ${file}`);
    return;
  }

  let existing = fs.readFileSync(file, 'utf8');
  const original = existing;
  const patterns = [markerPattern, ...(options.legacyPatterns || [])];
  const matchingPattern = patterns.find((pattern) => pattern.test(existing));

  if (matchingPattern) {
    existing = existing.replace(matchingPattern, managed);
  } else {
    for (const linePattern of options.legacyLinePatterns || []) {
      existing = existing
        .split(/\r?\n/)
        .filter((line) => !linePattern.test(line.trim()))
        .join('\n');
      if (existing && !existing.endsWith('\n')) existing += '\n';
    }
    existing = `${existing}${existing.endsWith('\n') || existing.length === 0 ? '' : '\n'}${managed}`;
  }

  if (existing === original) {
    console.log(`Already up to date: ${file}`);
    return;
  }

  fs.copyFileSync(file, `${file}.bak-${timestamp()}`);
  fs.writeFileSync(file, existing, 'utf8');
  console.log(`Updated ${file}`);
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
  if (Object.keys(state).length === 0) {
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();
