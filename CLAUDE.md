## 프롬프트 수정 시 감사 규칙 역제안

이 프로젝트의 프롬프트(`deploy/`) 수정 시:

1. 요청된 수정을 수행
2. 패턴성 판단 (동일 요청 재발 가능성 — 전환 문장, 이모지, 중복 병기 등)
3. 패턴성이면, scw의 특화 체크리스트(`deploy/skills/scw/specialized/`)에 추가할 규칙을 구체적 문안과 함께 역제안

## 백로그 관리

- `plan/` 하위의 백로그 파일은 상시 워크트리(`~/WebstormProjects/main/ai-contexts-backlog/`)에서 관리한다
- AC 본체에서 backlog 브랜치로 전환하지 않는다
- 워크트리가 없으면 `git worktree add`로 자동 생성한다
