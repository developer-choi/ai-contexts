// 레포 로컬 local/base-settings.json의 hook 논리 목록(file/event/on/msg)을 그 레포 .claude/settings.json의
// hook 구조로 변환한다. 어댑터가 on 별칭을 Claude의 도구 matcher로 바꾼다.
//
// 전역 hook은 plugin `ac`의 plugins/ac/hooks/hooks.json에 직접 등록하므로 여기를 거치지 않는다.

// matcher가 undefined인 그룹(예: UserPromptSubmit)을 묶을 내부 키. 출력에는 matcher 키 없이 나간다.
const NO_MATCHER = '\u0000nomatcher';

// 로컬판 hook 명령.
//
// ${CLAUDE_PROJECT_DIR}(=세션 프로젝트 루트) 치환을 쓴다. 훅은 프로젝트 루트가
// 아니라 "호출 시점의 cwd"에서 실행되므로(공식 훅 문서), 상대 경로면 워크트리 안에서 워크트리
// 기준으로 해석돼 깨진다 — .claude/는 gitignore라 워크트리에 안 딸려오기 때문이다.
// 2026-07-25 실측: 워크트리에서 cwd=<worktree>, ${CLAUDE_PROJECT_DIR}=<원본 체크아웃>.
function localHookCommand(dir, file) {
  return `node "\${CLAUDE_PROJECT_DIR}/${dir}/hooks/${file}"`;
}

// 로컬판(repo-local .claude 산출물)용 어댑터.
const LOCAL_ADAPTERS = {
  claude: {
    dir: '.claude',
    supports: () => true,
    matcher(event, on) {
      return { bash: 'Bash', edit: ['Edit', 'Write'] }[on];
    },
  },
};

// 논리 hook 목록 → 타겟별 hooks 객체 { event: [ { matcher?, hooks:[...] } ] }
// base 목록 순서를 보존하고, 같은 (event, matcher)는 한 그룹으로 묶는다.
// opts로 어댑터·command 생성기를 바꿀 수 있다(미지정 시 로컬 어댑터·localHookCommand).
function buildHooks(logicalHooks, targetName, opts = {}) {
  const adapters = opts.adapters || LOCAL_ADAPTERS;
  const makeCommand = opts.makeCommand || localHookCommand;
  const adapter = adapters[targetName];
  if (!adapter) throw new Error(`알 수 없는 hook 타겟: ${targetName}`);

  const byEvent = {};
  for (const h of logicalHooks) {
    if (!adapter.supports(h.event, h.on)) continue;
    const matcherVal = adapter.matcher(h.event, h.on);
    // matcher는 string | string[] | undefined. 배열이면 매처별로 같은 hook을 fan-out한다.
    const matchers = Array.isArray(matcherVal) ? matcherVal : [matcherVal];
    for (const matcher of matchers) {
      const groups = (byEvent[h.event] = byEvent[h.event] || []);
      const key = matcher === undefined ? NO_MATCHER : matcher;
      let group = groups.find((g) => g.key === key);
      if (!group) {
        group = { key, matcher, hooks: [] };
        groups.push(group);
      }
      group.hooks.push({
        type: 'command',
        command: makeCommand(adapter.dir, h.file),
        statusMessage: h.msg,
      });
    }
  }

  // 내부 key 제거 + matcher 키가 hooks보다 먼저 오도록 재구성.
  const result = {};
  for (const event of Object.keys(byEvent)) {
    result[event] = byEvent[event].map((g) => {
      const out = {};
      if (g.matcher !== undefined) out.matcher = g.matcher;
      out.hooks = g.hooks;
      return out;
    });
  }
  return result;
}

export { LOCAL_ADAPTERS, buildHooks, localHookCommand };
