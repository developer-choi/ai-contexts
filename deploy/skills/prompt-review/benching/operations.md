# Bench Operations

벤치(ablation·기능·트리거)를 돌릴 때 공통으로 보는 것. 회차 운용이든 단발이든 해당한다.

## 벤치 산출물 정리

벤치를 끝내고 마지막 결과를 보고한 직후, 묻지 않고 벤치가 남긴 것을 전부 지운다. 측정용 워크트리만은 그 보고에 대한 검증·리뷰가 끝난 뒤 지운다 — 먼저 지우면 리뷰가 확인할 대상이 없어진다.

## 확인 방법

일반 세션·서브에이전트로 돌린 실행이면, 스킬이 읽으라고 한 문서를 실제로 열었는지는 CLI가 남기는 대화 기록의 도구 호출로 확인한다.

- Claude Code — `~/.claude/projects/<인코딩된 경로>/<세션 id>.jsonl`, 서브에이전트는 `<세션 id>/subagents/agent-<id>.jsonl`
- Antigravity — `~/.gemini/antigravity-cli/conversations/<대화 id>.db` (SQLite `steps` 테이블)
