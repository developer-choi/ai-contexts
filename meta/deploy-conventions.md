# 배포 시스템 수정 규약

AC의 배포 시스템(`scripts/sync-*.js`·`unsync-*.js`, `deploy/hooks/`, settings.json hook, AC worktree)을 수정·추가할 때 따르는 규칙.

## 배포 스크립트 변경 원칙

- `sync:*` 명령이 새 경로·파일·설정을 동기화하도록 바뀌면, 같은 대상의 `unsync:*` 명령도 함께 수정한다.
- 동기화와 제거는 같은 기준으로 검증한다. sync만 성공하고 unsync 후 잔여 파일이 남는 구조를 만들지 않는다.
- `sync:*` 명령은 반복 실행해도 중복·오염 없이 같은 상태로 수렴해야 한다.
- `sync:system`과 `sync:local-skills`는 시작 시 `npm run verify:hooks`와 같은 기준으로 AC git hook 준비 상태를 확인한다. 새 AC worktree는 `git wt-add`로 만들고, raw `git worktree add`를 썼다면 커밋 전에 `npm ci`와 `npm run prepare`를 실행한다.
- 새 설치·동기화 대상을 추가하면 같은 커밋에서 `sync:<target>`, `unsync:<target>`, `package.json`, `meta/guides/<target>.md`, `meta/guides/index.md`, `meta/INSTALLATION_GUIDE.md`의 안내를 함께 맞춘다.
- `unsync:*`는 AC가 만든 산출물만 제거해야 한다. 사용자 파일을 지울 가능성이 있으면 marker block, 상태 파일, 동일성 비교 중 하나로 AC 관리 여부를 확인한 뒤 제거한다.
- 새 `sync:*` 구현은 같은 명령을 2회 이상 실행하는 검증과, 대응 `unsync:*` 후 잔여 AC 산출물이 없는지 확인하는 검증을 포함한다.

### 메커니즘 계약 회귀 검증

멱등성·안전제거 메커니즘(`scripts/environment-lib.js`)의 계약은 `npm run verify:environment`로 검증한다. 임시 디렉토리 + 버리는 테스트 레지스트리 키 샌드박스에서 sync/unsync가 쓰는 바로 그 함수를 돌려 로직 drift를 막는다.

| 구분 | 항목 |
|---|---|
| 검증함 | whole-file 멱등, 동일성 기반 제거(수정된 파일 보존), managed-block 멱등·선택 제거(주변 사용자 내용 보존), 레지스트리 set/query/delete 왕복 |
| 검증 못 함 (수동 영역) | 실제 `sync:environment` e2e(winget PS7 설치, 실프로필 탐지, "이미 다른 값이면 skip" 분기, 실레지스트리 채택), `unsync` 동반 수정 같은 사람 규율, 같은-커밋 문서 정합 |

새 메커니즘 함수를 추가하면 `verify-environment.js`에 그 계약 케이스를 추가한다.

## 배포 스크립트 관리

`scripts/sync-*.js` 또는 `scripts/unsync-*.js`의 동작이 바뀌면 `meta/guides/` 하위의 관련 가이드도 같이 최신화한다. 가이드는 AI 에이전트가 코드를 안 읽고 가이드만 보고 실행하는 것을 전제로 작성되어, 어긋나면 잘못된 결과로 이어진다.

## AC worktree hook 준비

- AC 작업용 worktree는 raw `git worktree add` 대신 `git wt-add` alias를 사용한다. 이 alias는 worktree 생성 후 의존성·Husky hook shim 준비까지 수행하는 진입점이다.
- raw worktree를 이미 만들었거나 커밋 전 hook 상태가 의심되면 `npm run verify:hooks`를 실행한다. 이 명령은 `core.hooksPath`, `.husky/_/commit-msg`, `commitlint` 실행 파일을 확인하고 가능한 경우 `npm run prepare`로 복구한다.
- `verify:hooks`가 실패한 worktree에서는 커밋하지 않는다. 먼저 `npm ci` 후 `npm run prepare`를 실행하고 다시 확인한다.

## deploy/hooks 검증 원칙

`deploy/hooks/`(또는 배포된 `~/.claude/hooks/`)의 정책 hook을 수정·검증할 때:

- **실제 명령으로 검증한다.** `echo '...' | node ~/.claude/hooks/<hook>.js`로 hook을 직접 호출하면 hook 내부 코드 경로만 확인되고 PreToolUse/PostToolUse 발동 여부와는 무관하다. Claude Code의 Bash·Write·SendMessage 도구로 실제 명령을 실행해 hook이 차단·통과하는지 확인한다.
- **위험 케이스도 안전한 시나리오를 설계해서 실제 명령으로 검증한다.**
  - force push deny: 임시 커밋 만들고 실제 `git push --force-with-lease` 시도 → hook deny 확인 → `git reset --soft HEAD~1` + unstage + 파일 삭제로 정리
  - SendMessage `shutdown_request` deny: TeamCreate + Agent spawn 후 실제 `SendMessage` 호출 → hook deny 확인
- **"검증 안 됨", "안전한 시뮬 어려움" 같은 회피 결론을 보고에 쓰지 않는다.** 회피 보고를 내기 전에 안전한 실제 명령 시나리오를 한 번 더 고민한다.
- **검증용 임시 산출물(파일·커밋·팀·디버그 로그·임시 브랜치)은 같은 세션에서 즉시 정리한다.** 사용자에게 보고하기 전에 cleanup 완료.
- **메인 워크트리에서 검증 작업을 수행하지 않는다.** fix 워크트리 또는 별도 임시 디렉토리에서 진행한다. 부득이한 경우(예: PostToolUse Write의 워크트리별 cwd 분기 검증) 즉시 삭제하고 사용자에게 사전 고지한다.

## settings.json hook 작성 위치

`~/.claude/settings.json`(또는 프로젝트 settings.json)의 PreToolUse / PostToolUse hook은 인라인 명령으로 작성하지 않는다. 항상 별도 `.js` 파일로 분리하고 settings.json에는 `node -e "require('...')"` 형태로 require만 등록한다.

- 인라인은 디버그 로깅·점진 수정·라인 번호 추적이 어렵고, 패치 시 편집 단위가 settings.json 전체가 되어 hook 코드만 독립 검증할 수 없다.
- 분리된 `.js`는 Read / Edit / 검증을 hook 단위로 처리할 수 있다.
- AC `deploy/hooks/`에 원본을 두고 `npm run sync:system`으로 `~/.claude/hooks/`에 배포하는 패턴을 따른다.
