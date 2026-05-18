# AC Sync Guides

> 이 가이드는 AI 에이전트가 읽고 따라 실행하는 것을 전제로 작성되었습니다.

- [환경 동기화](environment.md): 현재 사용자 환경을 AC 기준으로 맞춥니다.
- [시스템 자산 동기화](system.md): Claude/Codex 등 에이전트 시스템 자산을 AC 기준으로 맞춥니다.
- [로컬 스킬 동기화](local-skills.md): 각 프로젝트의 로컬 스킬 산출물을 맞춥니다.

## 명령 이름 기준

- `sync:*`: AC가 관리하는 원하는 상태로 맞춥니다. 반복 실행해도 같은 상태로 수렴해야 합니다.
- `unsync:*`: 대응하는 `sync:*`가 만든 AC 관리 산출물만 제거합니다.
- `verify:hooks`: AC worktree의 Husky/commitlint 준비 상태를 확인합니다. 새 worktree에서 커밋하기 전에 실행합니다.
