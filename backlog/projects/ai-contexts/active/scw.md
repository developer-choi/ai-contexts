---
target: deploy/skills/scw/
---

# SCW

## 동기

스킬 수정 시 사용자 인터페이스 변경(argument-hint·트리거·호출 키워드 등)을 AI가 보고 없이 진행하는 문제를 막는다.

## [ideation] deploy/skills/ 수정 시 사용자 인터페이스 변경 자동 보고

동기 1줄: AI가 스킬의 사용자 인터페이스(argument-hint·보강 키워드·트리거 표)를 바꿀 때 사용자에게 사전/사후 보고가 누락되는 경우가 있었음(2026-06-25 `/pre-exit` argument-hint + routine 키워드 추가 시 미보고).

핵심 아이디어:
- `deploy/skills/` 하위 파일을 Write/Edit할 때 scw를 읽어보라는 PostToolUse hook → scw가 "인터페이스 변경이면 사용자에게 보고" 절차를 강제하는 방향
- 현재 scw가 어디서 어떻게 참조되는지(global.md·CLAUDE.md·다른 스킬) 먼저 파악하고, 인터페이스 보고 규칙을 scw 또는 참조 경로에 심는 방향
- 사용자가 scw 수정 시 AI가 알아서 scw를 읽어가는 기존 패턴을 활용: 동일하게 `deploy/skills/*/SKILL.md` 수정 시 scw를 자동 읽도록 hook 조건 확장
