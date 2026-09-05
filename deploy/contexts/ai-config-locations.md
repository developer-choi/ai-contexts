# AI 설정을 고칠 위치

AI 설정(규칙·스킬·hook·settings)은 아래 원본에서 고친다. 배포 위치에서 시작하면 어느 원본이 그걸 만들었는지 역추적해야 하므로, 고칠 대상이 배포 위치로 보일 때 이 표로 원본을 찾는다.

테스트 목적으로 배포 위치를 직접 고쳤으면, 결과를 AC 원본에 반영하고 배포까지 완료한다.

| 구분 | 원본 수정 위치 | 배포 위치 | 반영 명령 |
|---|---|---|---|
| 글로벌 규칙·컨텍스트·hooks·설정 | AC `deploy/rules/`, `deploy/contexts/`, `deploy/hooks/`, `deploy/base-settings.json`(공통), `deploy/*-settings.json`(타겟 override) | `~/.claude/`, `~/.codex/`, `~/.gemini/` | AC에서 `npm run sync:system` |
| 글로벌 스킬 | AC `deploy/skills/` | `~/.claude/skills/`, `~/.codex/skills/`, `~/.gemini/skills/` | AC에서 `npm run sync:system` |
| 로컬 규칙 | 각 프로젝트의 `CLAUDE.md` | 각 프로젝트의 `AGENTS.md`, `GEMINI.md` | AC에서 `npm run sync:local-system` |
| 로컬 자산 (스킬·컨텍스트 등) | 각 프로젝트의 `local/<자산>/` (`hooks` 제외) | 각 프로젝트의 `.claude/<자산>/`, `.agents/<자산>/` | AC에서 `npm run sync:local-system` |
| 로컬 settings/hooks (AC) | AC `local/base-settings.json`(공통), `local/claude-settings.json`(override), `local/hooks/` | AC `.claude/settings.json`, `.claude/hooks/`, `.codex/hooks.json`, `.codex/hooks/` | AC에서 `npm run sync:local-system` |
