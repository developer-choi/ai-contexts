// 레포의 `.githooks/` 파일들을 git 설정 훅(git 2.54+)으로 등록한다.
//
// 왜 파일 배치가 아니라 설정인가 — `core.hooksPath` 는 각 워크트리 기준으로 풀리는 상대 경로라,
// 새 워크트리를 만들면 훅 파일이 없는 자리를 가리키고 git 은 그때 경고조차 없이 넘어간다.
// 커밋 검사가 통째로 무음 통과하던 원인이다. 설정은 `.git/config` 에 들어가고 그 파일은 모든
// 워크트리가 공유하므로, 레포당 한 번 등록하면 이후 워크트리에는 아무것도 갖다 놓지 않아도 된다.
//
// 등록 주체는 `npm run sync:environment`(전 레포 스윕)와 AC 자신의 `prepare` 두 곳이다.
import { spawnSync } from 'node:child_process';

const HOOKS_DIR = '.githooks';
// 설정 별칭 접두사. 우리가 넣은 것만 골라 지우기 위해 붙인다(사용자·다른 도구가 넣은 hook.* 보존).
const PREFIX = 'repo';
const MIN_GIT = { major: 2, minor: 54 };

function git(repoPath, args, { allowFail = false } = {}) {
  const result = spawnSync('git', ['-C', repoPath, ...args], { encoding: 'utf8' });
  if (result.status !== 0 && !allowFail) {
    throw new Error((result.stderr || `git ${args.join(' ')} 실패`).trim());
  }
  return result.status === 0 ? result.stdout.trim() : '';
}

// git 2.54 미만은 hook.<별칭>.command 를 **조용히 무시한다** — 훅이 통째로 사라져도 아무 표시가
// 없으므로, 등록 전에 여기서 시끄럽게 끊는다. 이걸 빼면 이번에 없앤 무음 실패가 그대로 재발한다.
function assertGitSupportsConfigHooks() {
  const raw = spawnSync('git', ['--version'], { encoding: 'utf8' }).stdout || '';
  const matched = raw.match(/(\d+)\.(\d+)/);
  if (!matched) throw new Error(`git 버전을 읽지 못했습니다: ${raw.trim()}`);

  const [major, minor] = [Number(matched[1]), Number(matched[2])];
  if (major > MIN_GIT.major || (major === MIN_GIT.major && minor >= MIN_GIT.minor)) return;

  throw new Error(
    [
      `git ${major}.${minor} 는 설정 훅(hook.<별칭>.command)을 지원하지 않습니다. ${MIN_GIT.major}.${MIN_GIT.minor} 이상이 필요합니다.`,
      '낮은 버전에서는 훅이 경고 없이 무시되므로, 등록하지 않고 중단합니다.',
      'Windows: winget upgrade --id Git.Git -e',
    ].join('\n'),
  );
}

function tracksHooksDir(repoPath) {
  return git(repoPath, ['ls-files', HOOKS_DIR], { allowFail: true }).length > 0;
}

function listTrackedHooks(repoPath) {
  return git(repoPath, ['ls-files', HOOKS_DIR], { allowFail: true })
    .split('\n')
    .filter(Boolean)
    .map((file) => file.slice(HOOKS_DIR.length + 1))
    .filter((name) => name && !name.includes('/'))
    .sort();
}

function listRegistered(repoPath) {
  const lines = git(repoPath, ['config', '--get-regexp', `^hook\\.${PREFIX}-`], { allowFail: true });
  const entries = new Map();
  for (const line of lines.split('\n').filter(Boolean)) {
    const [key, ...rest] = line.split(' ');
    entries.set(key, rest.join(' '));
  }
  return entries;
}

function desiredEntries(hooks) {
  const entries = new Map();
  for (const name of hooks) {
    entries.set(`hook.${PREFIX}-${name}.command`, `sh ${HOOKS_DIR}/${name}`);
    entries.set(`hook.${PREFIX}-${name}.event`, name);
  }
  return entries;
}

function sameEntries(a, b) {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) if (b.get(key) !== value) return false;
  return true;
}

// 레포 하나를 등록한다. 이미 원하는 상태면 아무것도 쓰지 않는다(멱등).
// 반환: { changed, hooks } — changed 는 설정을 실제로 건드렸는지.
function registerRepoHooks(repoPath) {
  assertGitSupportsConfigHooks();

  const hooks = listTrackedHooks(repoPath);
  const desired = desiredEntries(hooks);
  const current = listRegistered(repoPath);

  // core.hooksPath 가 남아 있으면 파일 훅과 설정 훅이 **둘 다** 돈다(git 은 둘을 더한다).
  // 같은 검사가 두 번 도는 것을 막으려고 여기서 해제한다.
  const hooksPath = git(repoPath, ['config', '--get', 'core.hooksPath'], { allowFail: true });
  const hadHooksPath = hooksPath.length > 0;
  if (hadHooksPath) git(repoPath, ['config', '--unset', 'core.hooksPath'], { allowFail: true });

  if (!hadHooksPath && sameEntries(desired, current)) return { changed: false, hooks };

  // 먼저 우리 것만 걷어낸다 — .githooks 에서 훅을 지웠을 때 설정만 남는 고아를 막는다.
  const sections = new Set([...current.keys()].map((key) => key.split('.').slice(0, 2).join('.')));
  for (const section of sections) git(repoPath, ['config', '--remove-section', section], { allowFail: true });

  for (const [key, value] of desired) git(repoPath, ['config', key, value]);

  return { changed: true, hooks };
}

// 등록 상태를 읽기만 한다(검증용).
function repoHooksState(repoPath) {
  const hooks = listTrackedHooks(repoPath);
  const current = listRegistered(repoPath);
  return {
    hooks,
    registered: sameEntries(desiredEntries(hooks), current),
    hooksPath: git(repoPath, ['config', '--get', 'core.hooksPath'], { allowFail: true }),
  };
}

// 레포 로컬이 아니라 `--global`(모든 레포 공용)로 거는 훅. `.githooks` 파일이 아니라
// 절대 경로 스크립트를 직접 호출하므로, 대상 레포가 그 훅을 추적하고 있을 필요가 없다.
// 별칭 접두사를 repo와 다르게(`ai-contexts`) 둬서 같은 이름 충돌 없이 공존한다.
const GLOBAL_PREFIX = 'ai-contexts';

// `env`로 `GIT_CONFIG_GLOBAL`을 오버라이드할 수 있게 한다 — 테스트가 실제 `~/.gitconfig`를
// 건드리지 않고 이 함수들의 계약을 검증하기 위함이다.
function globalGit(args, { allowFail = false, env } = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8', env: env ? { ...process.env, ...env } : process.env });
  if (result.status !== 0 && !allowFail) {
    throw new Error((result.stderr || `git ${args.join(' ')} 실패`).trim());
  }
  return result.status === 0 ? result.stdout.trim() : '';
}

// 전역 훅 하나를 등록한다(멱등). 반환값은 실제로 설정을 바꿨는지 여부다.
function registerGlobalHook(alias, event, command, { env } = {}) {
  assertGitSupportsConfigHooks();

  const commandKey = `hook.${GLOBAL_PREFIX}-${alias}.command`;
  const eventKey = `hook.${GLOBAL_PREFIX}-${alias}.event`;
  if (globalHookRegistered(alias, event, command, { env })) return false;

  globalGit(['config', '--global', commandKey, command], { env });
  globalGit(['config', '--global', eventKey, event], { env });
  return true;
}

function unregisterGlobalHook(alias, { env } = {}) {
  globalGit(['config', '--global', '--remove-section', `hook.${GLOBAL_PREFIX}-${alias}`], { allowFail: true, env });
}

function globalHookRegistered(alias, event, command, { env } = {}) {
  const currentCommand = globalGit(['config', '--global', '--get', `hook.${GLOBAL_PREFIX}-${alias}.command`], {
    allowFail: true,
    env,
  });
  const currentEvent = globalGit(['config', '--global', '--get', `hook.${GLOBAL_PREFIX}-${alias}.event`], {
    allowFail: true,
    env,
  });
  return currentCommand === command && currentEvent === event;
}

export {
  HOOKS_DIR,
  assertGitSupportsConfigHooks,
  listTrackedHooks,
  registerRepoHooks,
  repoHooksState,
  tracksHooksDir,
  registerGlobalHook,
  unregisterGlobalHook,
  globalHookRegistered,
};
