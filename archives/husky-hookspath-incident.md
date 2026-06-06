# Husky core.hooksPath 사고 기록

## 타임라인

### 1단계: npx 문제 발생

husky가 `.husky/commit-msg`에서 `npx --no -- commitlint --edit "$1"`을 실행하는 과정에서 문제 발생. npx를 아예 차단하기로 결정.

### 2단계: Exec format error 발생

npx 차단 후 `git commit` 시 아래 에러 반복:

```
error: cannot spawn C:\Users\forwo\WebstormProjects\main\ai-contexts\.husky/commit-msg: Exec format error
```

hook 파일에 shebang이 없어서 Windows가 실행 못 하는 것처럼 보였으나, 이것은 증상이지 원인이 아니었다.

### 3단계: 근본 원인 발견 (2026-04-05)

**`git config core.hooksPath`가 `.husky`로 설정되어 있었다.** husky v9는 `.husky/_`여야 정상.

### 4단계: raw worktree에서 commitlint 누락 (2026-05-18)

AC 작업용 worktree를 raw `git worktree add`로 만들고 바로 커밋하면서 commitlint가 실행되지 않았다. 메인 worktree에는 `.husky/_/commit-msg`가 있었지만, 이 디렉토리는 Husky가 생성하는 untracked 산출물이라 linked worktree에 자동으로 생기지 않는다.

결과적으로 worktree의 `core.hooksPath`는 `.husky/_`를 가리켰지만, 해당 경로의 shim 파일이 없어 Git이 실행할 commit-msg hook을 찾지 못했다.

### 5단계: EnterWorktree 툴로 만든 워크트리에서 commitlint 누락 (2026-06-06)

KA에서 Claude Code 하네스의 `EnterWorktree` 툴로 워크트리를 만들고 커밋하자 commitlint가 또 조용히 스킵됐다. `EnterWorktree`는 내부적으로 `.claude/worktrees/<name>` 아래에 `origin/<default-branch>` 기준 새 브랜치로 워크트리를 만드는데, 이 내부 `git worktree add`도 tracked 파일만 체크아웃하므로 `.husky/_` shim과 `node_modules`가 빠진다 — 4단계의 raw `git worktree add`와 같은 근본 원인이다.

4단계 대응으로 추가했던 Bash PostToolUse self-heal hook은 `tool_input.command` 문자열을 보는데, `EnterWorktree`는 Bash를 거치지 않는 별도 툴이라 그 hook이 발화하지 않았다. 즉 Bash 경로만 막혀 있었고 툴 경로가 뚫려 있었다.

AC에서 `EnterWorktree`를 실제 호출해 확인한 사실:

- 툴 실행 직후 세션 cwd가 새 워크트리(`.claude/worktrees/<name>`)로 전환된다 → PostToolUse `payload.cwd`가 새 워크트리 경로다.
- 새 워크트리는 `node_modules` 없음, `.husky/_/commit-msg` shim 없음, tracked `.husky/commit-msg`만 존재 → 4·5단계 메커니즘 재현.

또한 이 과정에서 **메인 레포의 `core.hooksPath`가 절대경로 `.../ai-contexts/.husky`(상대 `.husky/_`가 아님)로 오설정**돼 있던 것을 발견했다. 3단계의 잘못된 상태가 남아 있던 것으로, 메인에선 우연히 동작했으나 비표준이었다. `npm run prepare`(husky)로 표준 상대 `.husky/_`로 교정했다.

## 근본 원인

### husky v9의 hook 실행 구조

```
Git → .husky/_/commit-msg (proxy, shebang 있음)
  → .husky/_/h (dispatcher)
    → sh -e .husky/commit-msg (사용자 hook)
```

- `.husky/_/`: Git이 실행하는 proxy hook. shebang(`#!/usr/bin/env sh`) 있음.
- `.husky/`: 사용자가 작성하는 실제 hook. shebang 불필요. dispatcher가 `sh -e`로 실행하므로.
- `core.hooksPath`는 `.husky/_`를 가리켜야 한다.

### 잘못된 상태

`core.hooksPath`가 `.husky`로 설정되면:

```
Git → .husky/commit-msg (shebang 없음, CRLF)
  → OS가 직접 실행 시도
  → Exec format error
```

Git이 proxy를 건너뛰고 사용자 hook을 직접 실행하려 해서 터진 것.

### 왜 `.husky`로 바뀌었나

husky 소스코드(`node_modules/husky/index.js`)에서 `core.hooksPath`를 `${d}/_`로 설정한다. 누군가 수동으로 `git config core.hooksPath .husky`를 실행했거나, 이전 작업 과정에서 덮어써진 것으로 추정.

### 왜 raw worktree에서 hook이 빠졌나

`.husky/_`와 `node_modules/`는 git tracked 파일이 아니라 `npm ci`/`npm run prepare`로 생성되는 로컬 산출물이다. raw `git worktree add`는 tracked 파일만 체크아웃하므로 `.husky/commit-msg`는 생겨도 `.husky/_/commit-msg` shim과 commitlint 실행 파일은 준비되지 않는다.

## 해결

```bash
git config core.hooksPath .husky/_
```

또는 `npm run prepare`로 husky 재초기화하면 자동 복구된다.

### 구조적 방어: PostToolUse self-heal hook (2026-06-06)

워크트리 생성 경로마다 직후에 의존성을 자동 설치해 shim·commitlint를 채운다. `npm ci`가 husky `prepare`를 실행하므로 `.husky/_` shim과 `core.hooksPath`가 함께 복구된다.

- Bash `git worktree add` → `post-worktree-install.js` (PostToolUse, matcher `Bash`)
- `EnterWorktree` 툴 → `post-enterworktree-install.js` (PostToolUse, matcher `EnterWorktree`, `payload.cwd`에 설치)
- 공통 설치 로직은 `worktree-install-core.js`로 분리.

두 hook 모두 커밋(다음 툴콜)보다 먼저 동기 실행되므로 "셋업 안 된 워크트리에서 커밋" 상황 자체가 생기지 않는다. 과거의 `git wt-add` alias는 이 self-heal로 대체되어 폐기했다(`sync:system`이 잔여 alias를 제거).

남는 한계: self-heal은 하네스를 거친 워크트리 생성에만 발동한다. 하네스 밖 맨 터미널에서 `git worktree add` 후 커밋하면 여전히 우회 가능하다(상대 `core.hooksPath` + shim 부재 → silent skip). 이 경로까지 막으려면 hook을 tracked 디렉터리에 커밋하는 방식(`.githooks`)이 필요하나, 현재 위협 모델(하네스발 워크트리)에는 self-heal로 충분하다고 판단해 범위 밖으로 두었다.

커밋 전 hook 상태가 의심되면 `npm run verify:hooks`로 `core.hooksPath`, `.husky/_/commit-msg`, `commitlint` 실행 파일을 확인한다.

또한 `.husky/commit-msg`는 패키지 러너를 거치지 않고 `./node_modules/.bin/commitlint`를 직접 호출한다. hook이 실행될 때는 네트워크·패키지 해석 경로보다 로컬 의존성 존재 여부가 더 명확해야 한다.

## 교훈

1. **husky v9에서 `.husky/` 안의 hook 파일에 shebang이 없는 건 정상이다.** v9는 dispatcher가 `sh -e`로 실행하므로 shebang이 불필요하다.
2. **"Exec format error"가 나면 shebang부터 의심하기 쉽지만, `core.hooksPath`를 먼저 확인해야 한다.** `.husky`인지 `.husky/_`인지가 핵심.
3. **증상(shebang 없음)과 원인(hooksPath 잘못)을 구분해야 한다.** shebang을 추가하면 임시로 동작하지만 husky의 설계 의도와 어긋나서 다른 문제를 유발할 수 있다.
4. **worktree에서는 hooksPath 값만 보지 말고 shim 파일 존재까지 확인해야 한다.** `.husky/_`가 설정되어 있어도 linked worktree에 `.husky/_/commit-msg`가 없으면 commitlint는 실행되지 않는다.
5. **워크트리 생성 경로는 Bash 명령만이 아니다.** `EnterWorktree` 같은 하네스 툴은 Bash를 거치지 않으므로 `tool_input.command`를 보는 hook으로는 못 잡는다. 생성 경로마다 별도 matcher(`Bash`, `EnterWorktree`)로 self-heal을 걸어야 한다.
6. **git hook으로는 "워크트리 생성 차단"이 불가능하다.** `git worktree add`는 `post-checkout`만 발화하고 pre-worktree hook은 없다(git-scm githooks). 게다가 잘못 만든 워크트리는 `.husky/_`가 없어 모든 git hook이 조용히 스킵되므로, git hook 기반 가드는 정확히 막아야 할 순간에 발화하지 못한다. 그래서 방어는 하네스 레이어(PostToolUse)에 둔다.
