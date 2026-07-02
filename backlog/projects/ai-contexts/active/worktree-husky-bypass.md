---
target:
  - deploy/hooks/worktree-install-core.js
  - deploy/hooks/post-worktree-install.js
  - deploy/hooks/post-enterworktree-install.js
---

# worktree husky 미복구 우회 차단 (npm ci 누락 재발 방지)

## 동기

`monorepo-playground-tradeoff` 워크트리에서 커밋할 때 husky 훅(commitlint·lint-staged·turbo)이 안 돌아, error-handling 트레이드오프 보강 커밋들이 commitlint `scope-enum`에 없는 `error-handling` scope로 통과됐다. 나중에 다른 경로로 husky가 설치되자 그제야 훅이 작동하면서 amend가 막혀 발견됐다.

worktree 생성 시 의존성 설치·husky 복구를 보장하려고 만든 `worktree-install-core.js`가 존재하는데도 이 워크트리엔 적용되지 않았다. 같은 우회가 다음 워크트리에서 또 일어날 수 있다.

## [draft] PostToolUse 미경유 워크트리까지 husky 복구 보장

### 기대상황

raw `git worktree add`·EnterWorktree·사용자 수동 생성 등 **경로와 무관하게**, husky를 쓰는 워크트리에서 첫 커밋 전에 `.husky/_` shim + `core.hooksPath` 표준 셋업이 보장되는 상태. 셋업이 깨진 워크트리에서의 커밋은 막히거나 자동 복구된다.

### 현재상태

복구 로직 `installWorktreeDeps(absWtPath)`는 이미 husky 불완전(`.husky/_` 누락 또는 `core.hooksPath` 비표준)을 검사해 `prepare`로 복구하도록 돼 있다 (`worktree-install-core.js`).

호출 지점은 PostToolUse hook 둘뿐이다:

- `post-worktree-install.js` — Bash `git worktree add` 직후
- `post-enterworktree-install.js` — EnterWorktree 직후

따라서 이 두 PostToolUse를 **안 거치고 생긴 워크트리는 복구가 영영 안 걸린다**. 이번 `monorepo-playground-tradeoff`는 로드맵상 "워크트리(있음)"로 이전에 이미 존재했고, 그 생성 시점이 위 경로를 안 탔거나(수동·이전 세션) hook 도입 이전이라 누락된 것으로 추정된다.

### 확인 필요

- 두 PostToolUse hook이 실제로 모든 `git worktree add` 변형(상대경로·`-b`·`--detach` 등)에서 새 워크트리 경로를 정확히 파싱하는지.
- 이미 존재하는(우회된) 워크트리를 사후에 잡을 수단이 없다. 커밋 시점 가드(check-git-* hook 계열)에서 `huskyHooksHealthy`를 검사해 불완전하면 커밋을 막고 복구를 안내하는 방안 검토.

## 첫 행동

`monorepo-playground-tradeoff`가 어떤 명령으로 만들어졌는지(세션 로그·reflog) 역추적해, PostToolUse 미발화인지 hook의 경로 파싱 실패인지부터 가른다. 그 결과로 "생성 경로 보강" vs "커밋 시점 가드 추가" 중 어디를 손볼지 정한다.

## 종료 조건

husky 셋업이 깨진 워크트리에서 커밋을 시도하면, 생성 경로와 무관하게 자동 복구되거나 명확한 안내와 함께 차단된다. 우회된 채 commitlint scope-enum 위반 커밋이 통과되는 일이 재현되지 않는다.
