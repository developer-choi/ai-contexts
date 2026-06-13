---
target: deploy/skills/pr-comment-respond/
---

# pr-comment-respond 백로그

## 실사용 전 바이브 체크 `draft`

드래프트 완성. 실사용 전 아래 점검이 필요하다.

### 완료된 단계

- 의도 파악: 내 PR에 달린 코멘트를 분류하고 유형별 대응 전략을 세움
- SKILL.md 드래프트 작성: 6단계 절차 (수집 → 분류 → 유형별 대응 → 동일 패턴 탐색 → 답글 작성 → 전체 점검)
- 테스트 케이스: 출력이 주관적이므로 formal eval 스킵. 실사용으로 바이브 체크.

### 남은 단계

- 바이브 체크: 실제 PR 코멘트로 써보고 피드백
- gotchas 축적: 실사용 중 발견되는 실패 패턴 추가
- description optimization: 수동 claude -p 트리거 테스트
- 백로그 연동 검증: "실수/오류" 유형에서 백로그에 메모가 잘 쌓이는지 확인

### 관련 백로그/스킬

- `deploy/skills/pr-comment-write/` — 남의 PR 코멘트 작성 전용
- `plan/this/pr-review.md` — 남의 PR 리뷰 플로우 (별도)

### 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 답글 작성 | 스킬 내부에서 처리 (/write-init으로 작성, write-refine은 사용자가 새 세션에서) | 내 PR 답글은 pr-comment-write의 검증(변경 범위, PR 본문 대조)이 불필요 |
| 재발 방지 메모 | backlog에 축적 | backlog 스킬이 이미 존재 |
| 코멘트 입력 | 사용자가 직접 제공 | GitHub API 의존 최소화 |
