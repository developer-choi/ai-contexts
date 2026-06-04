# System Sync

AC의 전역 에이전트 시스템 자산을 Claude/Codex/Gemini 홈에 동기화합니다.

```bash
npm run sync:system
```

기본 타겟은 `~/.claude`입니다. 다른 Claude 타겟으로 동기화하려면 인자로 경로를 넘깁니다.

```bash
npm run sync:system -- <target>
```

## 수행 작업

- AC git hook 준비 상태를 먼저 확인합니다. 새 worktree에서 Husky shim이 빠진 상태면 가능한 경우 `npm run prepare`로 복구하고, 의존성이 없으면 실패합니다.
- 기존 AC 배포 파일을 제거한 뒤 다시 복사해 고아 파일을 방지합니다.
- `deploy/rules`, `deploy/contexts`, `deploy/hooks`를 카테고리 단위로 복사합니다.
- `deploy/skills`는 외부 스킬과 공존해야 하므로 항목 단위로 복사합니다.
- 각 타겟 설정은 공통 `deploy/base-settings.json`(정책 hook)과 타겟 override(`deploy/claude-settings.json` 등)를 합쳐 생성합니다(`scripts/settings-projection.js`, override 우선). claude·gemini는 결과를 각자의 `settings.json`에 얕게 머지해 사용자 동적 필드를 보존하고, codex는 hook만 `~/.codex/hooks.json`으로 통째 씁니다. hook 등록 구조(matcher·이벤트)는 타겟별 어댑터가 변환합니다.
- 기본 타겟으로 실행하면 Codex 전역 자산도 `~/.codex`에, Gemini 전역 자산도 `~/.gemini`에 함께 동기화합니다.
- Codex hook trust 갱신을 시도하고, Desktop 환경 제약으로 실패하면 경고 후 자산 검증은 계속합니다.
- 글로벌 git alias `wt-add`를 등록합니다.

## 제거

```bash
npm run unsync:system
```

인자로 타겟을 지정할 수 있습니다.

```bash
npm run unsync:system -- <target>
```

제거 명령은 `sync:system`이 배포한 전역 시스템 자산과 `wt-add` alias를 제거합니다. 기본 Claude 타겟을 제거할 때는 Codex 및 Gemini 전역 자산도 함께 제거합니다.

## 반복 실행 기준

`sync:system`은 기존 AC 관리 파일을 먼저 제거한 뒤 다시 복사해 고아 파일을 남기지 않아야 합니다. 사용자 동적 설정은 `settings.json` 병합 규칙을 통해 보존하고, 외부 스킬과 공존해야 하는 `skills`는 항목 단위로 관리합니다.

## Hook 준비 상태

커밋 전에는 다음 명령으로 AC hook 상태를 직접 확인할 수 있습니다.

```bash
npm run verify:hooks
```

새 AC worktree는 `git wt-add`로 만들고, raw `git worktree add`를 사용했다면 `npm ci`와 `npm run prepare`를 실행한 뒤 커밋합니다.

## Windows 참고

Windows에서 배포 진입점을 Node로 바꾼 배경은 [Windows Node Deploy Migration](../../archives/windows-node-deploy-migration.md)에 정리되어 있습니다.
