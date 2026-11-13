# System Sync

AC의 전역 에이전트 시스템 자산을 Claude 홈(`~/.claude`)에 동기화합니다.

```bash
npm run sync:system
```

기본 타겟은 `~/.claude`입니다. 다른 타겟으로 동기화하려면 인자로 경로를 넘깁니다.

```bash
npm run sync:system -- <target>
```

## 수행 작업

- AC git hook 준비 상태를 확인합니다.
  - 훅 파일(`.githooks`)은 추적돼 체크아웃에 항상 딸려오므로 존재만 봅니다.
  - git이 못 나르는 전역 설정 훅 배선(`hook.ai-contexts-githooks-*`)이 빠져 있으면 재등록으로 복구합니다.
  - 옛 방식의 잔재(레포별 `hook.repo-*` 등록)는 **남아 있으면 안 됩니다**. 전역 훅과 둘 다 돌아 같은 검사가 두 번 실행되므로 어긋남으로 잡습니다. 전 레포 정리는 `sync:environment`가 합니다.
  - git 버전이 설정 훅 미만이거나 `commitlint` 의존성이 없으면 실패합니다.
- 생성·판정 계약도 함께 확인합니다. 깨져도 조용하기 때문에 배포 전에 막습니다. 무엇을 보는지는 `scripts/system/sync-system.mjs`의 `VERIFY_STEPS`가 정본입니다. 하나라도 실패하면 배포를 시작하기 전에 끊고, 실패한 검사를 한 번에 모두 보여줍니다.
- 배포본을 지우고 다시 쓰지 않습니다. 배포할 내용을 메모리에서 만든 뒤 기존 파일과 비교해, 내용이 다른 파일만 쓰고 원본에서 사라진 AC 관리 파일만 지웁니다. 문서 하나만 고쳤으면 그 파일만 다시 쓰여, 열려 있던 다른 세션에도 그 파일만 새로 뜹니다. 바뀐 것이 없으면 `변경 없음`을 출력합니다.
- `deploy/contexts`, `deploy/hooks`는 폴더 전체가 AC 관리 대상입니다.
- `deploy/CLAUDE.md`와 `deploy/rules/`는 복사하지 않습니다. 타겟 `CLAUDE.md`에 원본 파일마다 `@` import 줄을 두어 Claude Code가 원본을 직접 읽게 합니다.
  - 기존 파일의 내용을 고치면 sync 없이 다음 세션에 실립니다. 규칙 파일을 추가·삭제·개명하면 import 줄 목록이 달라지므로 sync를 돌려야 합니다.
  - import 줄과 그 목록은 워크트리에서 돌려도 본 체크아웃의 `deploy/` 기준입니다. 워크트리를 지워도 전역 규칙이 사라지지 않게 하기 위해서이고, 그래서 워크트리에서 고친 규칙은 본 체크아웃에 병합되기 전에는 실리지 않습니다.
  - 타겟 `CLAUDE.md`에 사용자가 적은 줄은 import 줄 아래에 남깁니다. 기존 사본을 알아내 걷는 방식은 `deploy-lib.mjs`의 `deployClaudeImports`·`uninstallClaudeImports`가 정본입니다. 그 밖의 타겟 `rules/` 파일은 사용자 영역이라 건드리지 않습니다.
- 전역 스킬은 배포하지 않습니다. `plugins/ac/skills`의 스킬은 Claude Code plugin `ac`로 설치됩니다.
  - `~/.claude/skills/`에서는 예전 sync가 배포해 둔 사본(렌더 앵커가 있는 SKILL.md) 중 plugin에 같은 이름이 있는 폴더만 지웁니다. plugin `ac`가 설치되지 않은 기기면 지우지 않고 검증 실패로 알립니다.
  - 그 밖의 폴더(claude.ai에서 받은 `synced/`, 외부 스킬)는 건드리지 않습니다.
- 설정을 생성해 `settings.json`에 얕게 머지해 사용자 동적 필드를 보존합니다.
- 구버전 글로벌 git alias `wt-add`가 남아 있으면 제거합니다 (워크트리 의존성 복구는 self-heal hook이 전담합니다).

## 제거

```bash
npm run unsync:system
```

인자로 타겟을 지정할 수 있습니다.

```bash
npm run unsync:system -- <target>
```

제거 명령은 `sync:system`이 배포한 전역 시스템 자산, plugin 스킬과 이름이 같은 `skills/` 옛 사본, 구버전 `wt-add` alias를 제거합니다. 타겟 `CLAUDE.md`에서는 AC import 줄만 걷고 사용자가 적은 줄은 남깁니다. 타겟 `rules/`의 사용자 파일은 건드리지 않습니다. 기존 사본을 걷는 기준은 `uninstallClaudeImports`가 정본입니다. plugin `ac`는 남깁니다. 걷으려면 `claude plugin uninstall ac@ac`와 `claude plugin marketplace remove ac`를 직접 실행합니다.

## 반복 실행 기준

`sync:system`은 원본에서 사라진 AC 관리 파일을 지워 고아를 남기지 않아야 하고, 원본이 그대로면 두 번째 실행에서 아무 파일도 쓰지 않아야 합니다(`verify:incremental-deploy`가 고정).

## Hook 준비 상태

커밋 전에는 다음 명령으로 AC hook 상태를 직접 확인할 수 있습니다.

```bash
npm run verify:hooks
```
