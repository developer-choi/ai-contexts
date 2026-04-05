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

## 해결

```bash
git config core.hooksPath .husky/_
```

또는 `npm run prepare`로 husky 재초기화하면 자동 복구된다.

## 교훈

1. **husky v9에서 `.husky/` 안의 hook 파일에 shebang이 없는 건 정상이다.** v9는 dispatcher가 `sh -e`로 실행하므로 shebang이 불필요하다.
2. **"Exec format error"가 나면 shebang부터 의심하기 쉽지만, `core.hooksPath`를 먼저 확인해야 한다.** `.husky`인지 `.husky/_`인지가 핵심.
3. **증상(shebang 없음)과 원인(hooksPath 잘못)을 구분해야 한다.** shebang을 추가하면 임시로 동작하지만 husky의 설계 의도와 어긋나서 다른 문제를 유발할 수 있다.
