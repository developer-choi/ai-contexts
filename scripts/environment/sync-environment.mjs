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
  registerGlobalHook,
  registerRepoHookWiring,
  clearLegacyRepoHooks,
  localHooksPath,
} from '../lib/git-hooks.mjs';
import { PRECOMMIT_HOOKS, precommitHookSrc, precommitHookDest } from './precommit-hooks.mjs';

const home = os.homedir();
const stateDir = path.join(home, '.ai-contexts');
const stateFile = path.join(stateDir, 'environment-state.json');
const globalGitignore = path.join(home, '.gitignore_global');
const cmdAutorunFile = path.join(home, 'autorun.cmd');
const cmdProcessorKey = 'HKCU\\Software\\Microsoft\\Command Processor';

// 배치 스크립트는 JS 문자열이 아니라 실파일로 둔다(`autorun.cmd`). 문자열로 들고 있으면
// sync·unsync 양쪽에 같은 내용을 복제해야 하는데(unsync가 글자 단위 일치로 AC 산출물인지
// 판정한다), 한쪽만 고치면 unsync가 "사용자가 손댄 파일"로 오판해 안 지운다.
// 이스케이프를 손으로 맞출 일도, 편집기가 batch 문법을 못 잡아줄 일도 없어진다.
const cmdAutorunSrc = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'autorun.cmd',
);

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
  syncRepoHookWiring();

  for (const hook of PRECOMMIT_HOOKS) {
    console.log(`--- ${hook.label} ---`);
    syncPrecommitHook(state, hook);
  }

  writeState(state);
  console.log('Environment sync complete.');
}

// AC가 얹는 pre-commit 검사 훅 하나를 배포·등록한다. 어느 레포에서 어느 도구로 커밋하든
// 발동해야 하므로 레포 로컬 `.githooks`가 아니라 `--global` 설정으로 건다
// (scripts/lib/git-hooks.mjs의 registerGlobalHook). 목록은 precommit-hooks.mjs가 정본이다.
function syncPrecommitHook(state, hook) {
  assertGitSupportsConfigHooks();

  const dest = precommitHookDest(hook);
  const body = fs.readFileSync(precommitHookSrc(hook), 'utf8');
  const status = writeWholeFile(dest, body);
  console.log(
    {
      created: `Created ${dest}`,
      updated: `Updated ${dest}`,
      unchanged: `Already up to date: ${dest}`,
    }[status],
  );

  // `|| true`로 감싸는 이유: 전역 훅이라 실패하면 모든 레포의 모든 커밋이 막힌다. 스크립트 내부
  // 오류는 스크립트가 스스로 삼키지만(항상 exit 0), 파일 자체가 없거나 node가 없으면 그 앞에서
  // non-zero로 죽어 커밋이 차단된다. 정탐률이 낮은 알림 때문에 전체 작업이 멈추면 안 되므로 셸
  // 수준에서도 통과시킨다. 실측: `|| true`가 없으면 스크립트 경로가 사라졌을 때 커밋이 실제로 거부된다.
  const command = `node "${dest}" || true`;
  const changed = registerGlobalHook(hook.alias, 'pre-commit', command);
  state[hook.stateKey] = true;
  console.log(changed ? `전역 pre-commit 훅 등록: ${command}` : '전역 pre-commit 훅 이미 등록됨');
}

// `.githooks/<이벤트>`가 있으면 실행하는 훅을 **기기 전역**에 건다(git-hooks.mjs). 레포별 등록이
// 아니라 전역인 이유는 등록이 `.git/config`에 사는데 clone이 그 파일을 안 가져오기 때문이다 —
// 레포마다 등록하는 한 "클론만 하면 훅이 돈다"가 원리적으로 불가능하다.
//
// 이 등록이 유일한 배선이다 — 각 레포에 prepare나 설치 스크립트를 두지 않는다. 기기당 한 번
// 이 명령을 돌리면 그 뒤로 클론하는 레포도, 새로 파는 워크트리도 아무것도 안 해도 훅이 돈다.
//
// 대가: 이 명령을 안 돌린 기기에서는 **모든 레포**가 검사 없이 통과한다. 구멍의 개수가 줄고
// 크기가 커지는 맞바꿈이며, 대신 점검이 싸다 — `git config --global --get-regexp '^hook\.'`
// 한 줄이면 전 레포 커버 여부를 안다.
function syncRepoHookWiring() {
  const changed = registerRepoHookWiring();
  console.log(changed.length ? `전역 훅 등록: ${changed.join(', ')}` : '전역 훅 이미 등록됨');

  cleanLegacyRepoHooks();
}

// 전역 배선 이전의 레포별 등록(`hook.repo-*`)을 걷는다. 남겨두면 전역 훅과 둘 다 돌아 같은
// 검사가 두 번 실행된다. 링크된 워크트리(.git이 파일)는 건너뛴다 — 설정은 공용이라 primary에서
// 한 번이면 충분하다.
//
// 사실상 기기당 한 번이면 끝나는 이관이라 별도 1회성 스크립트로 뺄까 했지만, 여기 두면 기기마다
// 무엇을 돌려야 하는지 기억할 일이 없어진다. 두 번째 실행부터는 지울 것이 없어 읽기만 하고,
// 레포 39개 기준 1.4초라 winget·레지스트리 조회에 묻힌다(2026-08-31 실측).
//
// `core.hooksPath`는 **지우지 않고 보고만 한다** — 우리가 안 건 값을 가진 레포가 있다.
function cleanLegacyRepoHooks() {
  const projectsRoot = path.join(home, 'WebstormProjects');
  if (!fs.existsSync(projectsRoot)) return;

  const cleared = [];
  const hooksPathFound = [];
  for (const group of readDirsSafe(projectsRoot)) {
    for (const repo of readDirsSafe(path.join(projectsRoot, group))) {
      const repoPath = path.join(projectsRoot, group, repo);
      if (!isPrimaryWorktree(repoPath)) continue;

      const removed = clearLegacyRepoHooks(repoPath);
      if (removed) cleared.push(`${group}/${repo}(${removed})`);

      const hooksPath = localHooksPath(repoPath);
      if (hooksPath) hooksPathFound.push(`${group}/${repo} → ${hooksPath}`);
    }
  }

  if (cleared.length) console.log(`옛 레포별 등록 정리: ${cleared.join(', ')}`);
  if (hooksPathFound.length) {
    console.log(`core.hooksPath 남음(안 건드림, 우리가 건 값인지 직접 확인): ${hooksPathFound.join(', ')}`);
  }
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

  const status = writeWholeFile(cmdAutorunFile, fs.readFileSync(cmdAutorunSrc, 'utf8'));
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
