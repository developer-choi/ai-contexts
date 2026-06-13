# KA 영단어 학습 보강

## 동기

KA에서 영어 원문 기반으로 공부할 때 영단어 학습을 병행하고 싶다.
궁극적 목표: AI 도움 없이 영어 원문을 직접 해설할 수 있는 수준 도달.

## [ideation] KA 영단어 학습 통합 방안

### 핵심 발견

기존 인프라 두 곳이 이미 vocab 레이어를 올릴 기반이다.

- **`explained/<rel>.md`** (140개): 영어 원문 블록인용 + 한글 글로스 구조. 이미 "문맥과 함께 저장된 어휘 원천"이다.
- **`brain.yaml`**: known/unknown 상태 트래킹. vocab 축을 추가하면 기존 exam 라이프사이클에 그대로 올라탄다.

### 추천 방향

> explained를 어휘 원천으로, brain.yaml에 `vocab` 상태 축을 추가하고, /exam·/review에 "원문 가리고 해설" 모드를 얹는다. 별도 앱·SR 스케줄러·전용 수집 스킬은 만들지 않는다.

축별 요약:
- **수집**: 별도 수집 행위 없이 explained의 기존 원문 블록에서 추출. digest 읽는 중 "모름" 신호 → 즉시 적재(보조)
- **저장**: brain.yaml에 `vocab:` 섹션(단어 상태만). 문맥은 explained가 보유 — 중복 저장 안 함
- **복습**: /exam·/review에 "원문 블록인용만 노출 → 사용자 해설" 모드 추가. Anki류 SR은 tier-3
- **측정**: explained 글로스를 가린 채 원문 해설 → 일치 시 unknown→known 이동. 도메인별 `known/(known+unknown)` 비율
- **도구**: 신규 스킬 최소 1개(또는 exam/review 모드 확장) + `npm run vocab-candidates`(explained grep)

### 미결 사항

1. vocab 스킬 신설 vs 기존 exam/review 모드 확장 — exam/review 본문 분량 보고 결정
2. 단어 단위 vs 연어(collocation) 단위 — 기술 영어 해설력엔 연어가 더 중요할 수 있음
3. explained 미커버 파일의 원문은 사각지대 → explained 커버리지 문제와 묶임

### 참고 파일

- `knowledge-archive/.claude/contexts/brain.yaml`
- `knowledge-archive/.claude/contexts/lifecycle.md`
- `knowledge-archive/explained/` (원문+글로스 원천)
