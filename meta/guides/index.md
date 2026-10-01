# AC Sync Guides

> 이 가이드는 AI 에이전트가 읽고 따라 실행하는 것을 전제로 작성되었습니다.

- [환경 동기화](environment.md): 현재 사용자 환경을 AC 기준으로 맞춥니다.
- [시스템 자산 동기화](system.md): Claude/Codex/Gemini 등 에이전트 시스템 자산을 AC 기준으로 맞춥니다.
- [로컬 시스템 동기화](local-system.md): 로컬 스킬(cross-repo)과 AC settings/hooks를 한 명령으로 맞춥니다.

## 명령 이름 기준

- `sync:*`: AC가 관리하는 원하는 상태로 맞춥니다. 반복 실행해도 같은 상태로 수렴해야 합니다.
- `unsync:*`: 대응하는 `sync:*`가 만든 AC 관리 산출물만 제거합니다.
- `verify:*`: 배포 전 계약을 확인만 합니다(쓰기 없음). `sync:*` 진입점이 시작 시 fail-fast로 부르는 것이 무엇인지는 그 스크립트가 정본입니다 — 여기에 옮겨 적지 않습니다.
- `verify:hooks`는 예외로 등록이 어긋나면 복구까지 합니다. 새 worktree에서 커밋하기 전에 직접 실행합니다.
