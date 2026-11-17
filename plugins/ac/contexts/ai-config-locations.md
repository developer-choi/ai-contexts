# AI 설정을 고칠 위치

AI 설정(규칙·스킬·hook·settings)은 아래 원본에서 고친다. 배포 위치에서 시작하면 어느 원본이 그걸 만들었는지 역추적해야 한다.

테스트 목적으로 배포 위치를 직접 고쳤으면, 결과를 AC 원본에 반영해 아래 반영 명령으로 동기화 상태를 맞춘다.

| 구분 | 원본 수정 위치 | 배포 위치 | 반영 명령 |
|---|---|---|---|
| 글로벌 규칙 | AC `deploy/CLAUDE.md`, `deploy/rules/` | Claude: `~/.claude/CLAUDE.md`(`@` import 줄만 생성해 원본을 직접 참조) / Gemini: `~/.gemini/config/GEMINI.md` | AC에서 `npm run sync:system` (Claude만 사용하고 기존 파일 내용만 고쳤으면 명령 없음) |
| 글로벌 설정(권한·모델·env·MCP 등) | Claude: AC `deploy/claude-settings.json` / Gemini: AC `deploy/gemini-settings.json`, `deploy/gemini-mcp.json` | Claude: `~/.claude/settings.json` / Gemini: `~/.gemini/antigravity-cli/settings.json`, `~/.gemini/config/mcp_config.json` | AC에서 `npm run sync:system` |
| 글로벌 스킬·hooks·컨텍스트 | AC `plugins/ac/skills/`, `plugins/ac/hooks/`(등록은 `hooks.json`), `plugins/ac/contexts/` | Claude: 없음(plugin `ac`가 원본을 그대로 읽는다) / Gemini: 훅 등록만 `~/.gemini/config/hooks.json`에 투영(원본 `.mjs` 직접 실행, 스킬·컨텍스트 배포 없음) | 스킬·컨텍스트·훅 구현(`.mjs`) 수정은 없음. `hooks.json` 등록 변경을 Gemini에 반영할 때는 AC에서 `npm run sync:system` |
| 전역 git 검사 훅 | AC `scripts/hooks/`, `plugins/ac/hooks/recruitment-commit-guard.mjs` | `~/.ai-contexts/` | AC에서 `npm run sync:environment` |
| 로컬 규칙 | 각 프로젝트의 `CLAUDE.md` | 없음(Claude Code가 원본을 그대로 읽는다. Gemini 로컬 배포 없음) | 없음 |
| 로컬 스킬 | 각 프로젝트의 `.claude/skills/` | 없음(Claude Code가 원본을 그대로 읽는다. Gemini 로컬 배포 없음) | 없음 |
| 로컬 컨텍스트 | 각 프로젝트의 `local/contexts/` | 없음(스킬 본문이 원본을 그대로 가리킨다) | 없음 |
| 로컬 settings·hooks·agents | 각 프로젝트의 `.claude/settings.json`, `.claude/hooks/`, `.claude/agents/` | 없음(Claude Code가 원본을 그대로 읽는다. Gemini 로컬 배포 없음) | 없음 |
