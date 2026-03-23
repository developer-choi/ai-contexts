# pr-comment-write 스킬 진행 상황

## 현재 상태: 드래프트 완성, 실사용 전

## 완료된 단계

1. **의도 파악**: 남의 PR에 코멘트 달 때 내용 검증 + 말투 다듬기
2. **SKILL.md 드래프트 작성**: 5단계 절차 (맥락 파악 → 의견 수집 → 검증 → 작성 → 확인)
3. **테스트 케이스**: 출력이 주관적(말투, 톤)이므로 formal eval 스킵. 실사용으로 바이브 체크하기로 합의.

## 남은 단계

### 실사용 후 해야 할 것

1. **바이브 체크**: 실제 PR에서 써보고 어색하거나 부족한 부분 피드백
2. **gotchas 축적**: 실사용 중 발견되는 실패 패턴을 SKILL.md에 gotchas 섹션으로 추가
3. **description optimization**: `claude -p`로 트리거 테스트. Windows에서 run_loop.py 스크립트가 안 돌아가서(select.select 호환성 문제) 수동으로 해야 함
4. **말투 규칙 축적**: 사용하면서 tone-guide 백로그(`plan/backlog/tone-guide.md`)에 규칙 추가
5. **커밋**: 실사용 피드백 반영 후 최종 커밋

### 관련 백로그

- `plan/backlog/pr-review.md` — 이 스킬의 원본 백로그. 코멘트 작성 부분은 이 스킬이 담당. 리뷰 플로우(code-review 먼저 돌리기 등)는 별도.
- `plan/backlog/tone-guide.md` — 말투 규칙이 충분히 쌓이면 별도 contexts 파일로 분리 예정
- `plan/backlog/pr-comment-receive.md` — 코멘트 수신 대응은 별도 스킬(pr-comment-respond)로 만들 예정

## 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| eval 방식 | 바이브 체크 | 출력이 주관적(말투, 톤) |
| 검증 실패 시 | 사용자에게 알리고 판단 위임 | Avoid Railroading |
| 말투 규칙 | SKILL.md에 인라인 | tone-guide가 아직 미성숙 |
| gotchas | 없음 (아직 실사용 전) | 실사용 후 축적 |
