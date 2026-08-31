// 레포의 `.githooks/` 파일들을 git 설정 훅(git 2.54+)으로 발동시킨다.
//
// 왜 파일 배치가 아니라 설정인가 — `core.hooksPath` 는 각 워크트리 기준으로 풀리는 상대 경로라,
// 새 워크트리를 만들면 훅 파일이 없는 자리를 가리키고 git 은 그때 경고조차 없이 넘어간다.
// 커밋 검사가 통째로 무음 통과하던 원인이다.
//
// 왜 레포별이 아니라 `--global` 인가 — 등록은 `.git/config` 에 사는데 clone 이 그 파일을 안 가져온다.
// 레포마다 등록하는 한 "새 기기에서 클론만 하면 훅이 돈다"는 원리적으로 불가능하고, 등록을 잊은
// 레포는 아무 표시 없이 검사가 사라진다. 기기당 전역 훅 하나가 "지금 커밋하는 레포에
// `.githooks/<이벤트>` 가 있으면 실행"만 하면, 레포는 파일을 커밋하는 것 말고 아무것도 안 해도 된다.
//
// 등록 주체는 `npm run sync:environment` 하나다. 레포에 prepare 나 설치 스크립트를 두지 않는다.
import { spawnSync } from 'node:child_process';

const HOOKS_DIR = '.githooks';
const MIN_GIT = { major: 2, minor: 54 };

// 전역 훅을 걸 이벤트 목록. 어느 레포든 `.githooks/<이벤트>` 가 있으면 그 이벤트에서 돈다.
// **새 이벤트를 쓰는 레포가 생기면 여기에 더한다** — 안 더하면 그 레포의 검사가 통째로 무음
// 통과한다. 2026-08-31 실측 기준 사용처: commit-msg(AC), pre-commit(AC·backlog·PP),
// post-commit(backlog), pre-push(AC).
const HOOK_EVENTS = ['commit-msg', 'pre-commit', 'post-commit', 'pre-push'];

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

// 별칭 접두사. 우리가 넣은 것만 골라 지우기 위해 붙인다(사용자·다른 도구가 넣은 hook.* 보존).
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

function repoHookAlias(event) {
  return `githooks-${event}`;
}

// 전역 훅이 실행할 셸 명령. cwd 는 커밋하는 레포(또는 워크트리)의 루트라 상대 경로가 레포별로 풀린다.
//
// 가드 형태가 결정적이다(2026-08-31 실측):
// - `[ -f X ] && sh X || true` → 훅이 실패해도 커밋이 통과한다. 검사가 장식이 된다
// - `if [ -f X ]; then sh X; fi` → 쓸 수 없다. git 이 명령 뒤에 `"$@"` 를 붙여 실행하므로
//   `fi "$@"` 가 되어 셸 문법 오류로 죽는다
// - 아래 형태 → 파일이 없으면 종료코드 0(통과), 있으면 훅의 종료코드가 그대로 커밋 성패가 된다.
//   git 이 붙이는 `"$@"` 가 `sh X` 뒤에 붙어 훅 인자(commit-msg 의 메시지 파일 경로 등)도 전달된다
function repoHookCommand(event) {
  return `[ ! -f ${HOOKS_DIR}/${event} ] || sh ${HOOKS_DIR}/${event}`;
}

// `.githooks/` 배선 전체를 전역에 건다(멱등). 반환: 실제로 등록을 바꾼 이벤트 목록.
function registerRepoHookWiring({ env } = {}) {
  return HOOK_EVENTS.filter((event) =>
    registerGlobalHook(repoHookAlias(event), event, repoHookCommand(event), { env }),
  );
}

function unregisterRepoHookWiring({ env } = {}) {
  for (const event of HOOK_EVENTS) unregisterGlobalHook(repoHookAlias(event), { env });
}

// 배선이 빠짐없이 걸려 있는지 읽기만 한다(검증용). 반환: 안 걸린 이벤트 목록.
function missingRepoHookWiring({ env } = {}) {
  return HOOK_EVENTS.filter(
    (event) => !globalHookRegistered(repoHookAlias(event), event, repoHookCommand(event), { env }),
  );
}

// 레포별 등록(`hook.repo-*`)은 전역 배선 이전의 옛 방식이다. 남아 있으면 전역 훅과 **둘 다**
// 돌아 같은 검사가 두 번 실행되므로 걷어낸다. 반환: 실제로 지운 섹션 수.
//
// **`core.hooksPath` 는 건드리지 않는다.** 우리가 안 건 값을 가진 레포가 실제로 있다
// (2026-08-31 실측: 훅을 일부러 꺼둔 회사 레포 `.git/hooks-disabled`, 옛 husky 과제 레포
// `.husky/_`). 지우면 꺼둔 훅이 되살아나고 husky 배선이 끊긴다. 반면 `hook.repo-*` 는 우리만
// 쓰는 이름이라 지우는 것이 안전하다 — 이 함수가 그 둘을 가르는 자리다.
function clearLegacyRepoHooks(repoPath) {
  const sections = new Set(
    git(repoPath, ['config', '--local', '--get-regexp', '^hook\\.repo-'], { allowFail: true })
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split(' ')[0].split('.').slice(0, 2).join('.')),
  );
  for (const section of sections) {
    git(repoPath, ['config', '--local', '--remove-section', section], { allowFail: true });
  }
  return sections.size;
}

function hasLegacyRepoHooks(repoPath) {
  return Boolean(git(repoPath, ['config', '--local', '--get-regexp', '^hook\\.repo-'], { allowFail: true }));
}

// 우리가 건 것이 아닐 수 있는 `core.hooksPath` 를 읽기만 한다 — 지우지 않고 보고하기 위함이다.
function localHooksPath(repoPath) {
  return git(repoPath, ['config', '--local', '--get', 'core.hooksPath'], { allowFail: true });
}

export {
  HOOKS_DIR,
  HOOK_EVENTS,
  assertGitSupportsConfigHooks,
  registerGlobalHook,
  unregisterGlobalHook,
  globalHookRegistered,
  registerRepoHookWiring,
  unregisterRepoHookWiring,
  missingRepoHookWiring,
  clearLegacyRepoHooks,
  hasLegacyRepoHooks,
  localHooksPath,
};
