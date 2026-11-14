# Local System Sync

전역 `sync:system`의 로컬판. 각 레포 `local/`의 원본을 그 레포 `.claude/`로 복사·투영합니다.

레포 로컬 스킬·hook·settings·에이전트는 각 레포가 `.claude/`에 원본을 커밋하고 Claude Code가 그대로 읽습니다([배포 규약](../deploy-conventions.md)). 그래서 이 명령이 복사·투영할 대상 레포가 없습니다.

```bash
npm run sync:local-system
```

기본 순회 범위는 `~/WebstormProjects/main/`과 `~/WebstormProjects/my-else/` 하위 1뎁스 git 레포입니다. 특정 루트만 지정할 수 있습니다.

```bash
npm run sync:local-system -- ~/WebstormProjects/main
```

## 수행 작업

시작 시 AC git hook 준비 상태와 `verify:*` 계약을 먼저 확인합니다(fail-fast). 어느 검사를 호출하는지는 `scripts/local-system/sync-local-system.mjs`가 정본입니다.

### 1. 로컬 자산 (cross-repo)

- `local/` 하위 디렉토리를 `.claude/<X>`에 맞춥니다. 커밋한 원본이 있는 `hooks`·`skills`·`agents`와 배포를 멈춘 `contexts`는 제외합니다. 옛 `.claude/contexts` 사본이 남아 있으면 지웁니다.
- 지우고 다시 기록하지 않습니다. 내용이 다른 파일만 기록하고 원본에서 사라진 파일만 지워서, 열려 있던 다른 세션에는 실제로 바뀐 파일만 새로 뜹니다(1·2 공통).

### 2. settings/hooks (per-repo)

`local/`에 settings 재료(논리 hook 목록)를 가진 레포만 대상입니다. 메커니즘은 `scripts/local-system/local-deploy-lib.mjs` 머리 주석이 정본입니다.

## 제거

```bash
npm run unsync:local-system
```

- **로컬 자산**: 1의 대상 `.claude/<X>`를 카테고리 단위로 통째 삭제합니다. 커밋한 `.claude/hooks`·`skills`·`agents`는 건드리지 않습니다.
- **settings/hooks**: 2의 대상 레포에서만 AC가 넣은 키와 `.claude/hooks`를 걷습니다.

## 반복 실행 기준

여러 번 실행해도 현재 소스 내용을 기준으로 같은 상태로 수렴해야 합니다. 원본이 그대로면 두 번째 실행에서 아무 파일도 기록하지 않습니다(`verify:incremental-deploy`가 고정).

## 생성 계약 검증

```bash
npm run verify:local-system
```

2의 대상 레포마다 hook 등록과 command 꼴(`node "${CLAUDE_PROJECT_DIR}/.claude/hooks/"`)을 검증합니다. 대상이 없으면 통과합니다. `sync:local-system` 시작 시 fail-fast로 호출됩니다.
