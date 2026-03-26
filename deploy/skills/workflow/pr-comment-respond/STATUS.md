# pr-comment-respond 스킬 진행 상황

## 현재 상태: 드래프트 완성, 실사용 전

## 완료된 단계

1. **의도 파악**: 내 PR에 달린 코멘트를 분류하고 유형별 대응 전략을 세움
2. **SKILL.md 드래프트 작성**: 5단계 절차 (수집 → 분류 → 유형별 대응 → 답글 준비 → 전체 점검)
3. **테스트 케이스**: 출력이 주관적이므로 formal eval 스킵. 실사용으로 바이브 체크.

## 남은 단계

1. **바이브 체크**: 실제 PR 코멘트로 써보고 피드백
2. **gotchas 축적**: 실사용 중 발견되는 실패 패턴 추가
3. **description optimization**: 수동 claude -p 트리거 테스트
4. **백로그 연동 검증**: "실수/오류" 유형에서 백로그에 메모가 잘 쌓이는지 확인

## 관련 백로그/스킬

- `plan/backlog/pr-comment-receive.md` — 이 스킬의 원본 백로그
- `deploy/skills/pr-comment-write/` — 답글 작성은 이 스킬이 담당
- `plan/backlog/pr-review.md` — 남의 PR 리뷰 플로우 (별도)

## 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 답글 작성 | pr-comment-write에 위임 | 스킬 분리 (분석 vs 작성) |
| 재발 방지 메모 | backlog에 축적 | backlog 스킬이 이미 존재 |
| 코멘트 입력 | 사용자가 직접 제공 | GitHub API 의존 최소화 |
