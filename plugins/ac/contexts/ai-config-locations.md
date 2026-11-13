# AI 설정을 고칠 위치

AI 설정(규칙·스킬·hook·settings)은 아래 원본에서 고친다. 배포 위치에서 시작하면 어느 원본이 그걸 만들었는지 역추적해야 한다.

테스트 목적으로 배포 위치를 직접 고쳤으면, 결과를 AC 원본에 반영하고 배포까지 완료한다.

| 구분 | 원본 수정 위치 | 배포 위치 | 반영 명령 |
|---|---|---|---|
| 글로벌 규칙 | AC `deploy/CLAUDE.md`, `deploy/rules/` | 없음(`~/.claude/CLAUDE.md`의 `@` import로 원본을 그대로 읽는다) | 내용 수정은 명령 없음(바로 반영). 규칙 파일 추가·삭제·개명은 AC에서 `npm run sync:system` |
| 글로벌 설정(권한·모델·env 등) | AC `deploy/claude-settings.json` | `~/.claude/settings.json` | AC에서 `npm run sync:system` |
| 글로벌 스킬·hooks·컨텍스트 | AC `plugins/ac/skills/`, `plugins/ac/hooks/`(등록은 `hooks.json`), `plugins/ac/contexts/` | 없음(Claude Code plugin `ac`가 원본을 그대로 읽는다) | 없음 |
| 전역 git 검사 훅 | AC `scripts/hooks/`, `plugins/ac/hooks/recruitment-commit-guard.mjs` | `~/.ai-contexts/` | AC에서 `npm run sync:environment` |
| 로컬 규칙 | 각 프로젝트의 `CLAUDE.md` | 없음(Claude Code가 원본을 그대로 읽는다) | 없음 |
| 로컬 스킬 | 각 프로젝트의 `.claude/skills/` | 없음(Claude Code가 원본을 그대로 읽는다) | 없음 |
| 로컬 자산 (컨텍스트 등) | 각 프로젝트의 `local/<자산>/` (`hooks`·`skills` 제외) | 각 프로젝트의 `.claude/<자산>/` | AC에서 `npm run sync:local-system` |
| 로컬 settings/hooks (`local/base-settings.json`이 있는 레포) | 그 레포의 `local/base-settings.json`(공통), `local/claude-settings.json`(override), `local/hooks/` | 그 레포의 `.claude/settings.json`, `.claude/hooks/` | AC에서 `npm run sync:local-system` |
