# System Sync

AC의 전역 에이전트 시스템 자산을 Claude/Codex 홈에 동기화합니다.

```bash
npm run sync:system
```

기본 타겟은 `~/.claude`입니다. 다른 Claude 타겟으로 동기화하려면 인자로 경로를 넘깁니다.

```bash
npm run sync:system -- <target>
```

## 수행 작업

- 기존 AC 배포 파일을 제거한 뒤 다시 복사해 고아 파일을 방지합니다.
- `deploy/rules`, `deploy/contexts`, `deploy/hooks`를 카테고리 단위로 복사합니다.
- `deploy/skills`는 외부 스킬과 공존해야 하므로 항목 단위로 복사합니다.
- `deploy/claude-settings.json`은 `settings.json`에 얕게 머지해 사용자 동적 필드를 보존합니다.
- 기본 타겟으로 실행하면 Codex 전역 자산도 `~/.codex`에 함께 동기화합니다.
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

제거 명령은 `sync:system`이 배포한 전역 시스템 자산과 `wt-add` alias를 제거합니다. 기본 Claude 타겟을 제거할 때는 Codex 전역 자산도 함께 제거합니다.

## Windows 참고

Windows에서 배포 진입점을 Node로 바꾼 배경은 [Windows Node Deploy Migration](../../archives/windows-node-deploy-migration.md)에 정리되어 있습니다.
