---
target:
  - deploy/skills/workflow/
  - deploy/skills/code-review/
  - deploy/skills/scw/
---

# 코드 작성 스킬 본문에서 린트로 잡을 수 있는 룰 일괄 삭제

> 위 target 외 기타 코드 생성·검토 스킬도 대상이며, `/workflow`가 가장 요주의.

## [draft] 린트 차단 룰 본문 중복 정리

### 동기

스킬 본문에 박힌 "X 금지, Y 사용" 같은 룰 중 commitlint·ESLint·prettier 등 도구가 이미 차단하는 항목이 다수. 본문 룰과 린트 룰이 중복되면:

- 룰이 바뀔 때 본문·린트 설정 양쪽 동기화 필요 (한쪽 깜빡 → stale)
- AI가 본문 룰만 따라 작성 → 린트 통과는 되지만 본문 룰과 어긋나는 케이스 가능
- 본문이 비대화되어 본질 절차가 묻힘

도구가 차단할 수 있는 룰은 도구에 맡기고 본문에서 삭제. 사용자가 작성한 코드는 어차피 commit 단계에서 차단되므로 본문 안내는 잉여.

### 기대상황 (필수)

- 코드 작성 관련 스킬 하위 파일 전체를 grep으로 훑어 "린트로 막을 수 있는 룰" 후보 식별
- 각 후보를 commitlint / ESLint / prettier / 기타 도구가 실제로 차단하는지 확인
- 차단된다면 본문에서 룰 삭제. 차단 안 되면 본문 유지 또는 도구 설정 추가 제안
- 삭제 후 본문이 시맨틱 의미를 잃지 않도록 주변 문구 정리

### 현재상태 (선택)

이미 정리된 사례 (예시 — `fix/workflow` 브랜치):

- `deploy/skills/workflow/steps/step-5.md:61` (정리 전 위치) — `**"하드코딩 금지, 토큰만 사용"** — 16px 대신 var(--semantic-padding-lg)` Markup Implementer 필수 지침의 bullet #2였음. commitlint가 raw 값 사용을 차단하므로 본문 룰 잉여. 삭제 완료 (커밋 `dc48924`)

남은 후보 (1차 식별):

- `/workflow` 하위에서 추가 후보 다수 예상 — 본 백로그 착수 시 전수 grep
- `/code-review` 본문에 같은 형태의 룰 박혀 있을 가능성
- `/scw` 본문에 박힌 코드 룰도 동일 점검

### 현재 생각중인 방법 (선택)

- 1차: `deploy/skills/workflow/` 전체 grep — "금지", "사용 X", "쓰지 마", "raw 값" 같은 룰성 표현 + 코드 패턴(`16px`, `#fff` 등) 동반 위치 식별
- 2차: 식별 후보별로 commitlint / ESLint / prettier 룰 매핑 — 실제 차단 여부 확인
- 3차: 차단 확인된 룰 본문 삭제 + 주변 문구 정합 (Markup Implementer 지침처럼 bullet 하나만 빠지면 OK, 절 전체가 린트 룰뿐이면 절 삭제)
- 4차: 같은 작업을 `/code-review`, `/scw` 등 다른 코드 작성 스킬에 반복

판단 경계 — 본문에 남길 후보:

- 린트가 차단하지만 **사용자에게 의도 설명이 필요**한 경우 (예: "왜 raw 값 금지인지 — 토큰 변경 시 일괄 갱신 안 됨"). 룰 자체는 빼고 의도만 1줄 안내로 압축
- 린트 설정이 프로젝트별로 다른 경우 (예: 회사 프로젝트만 차단). 적용 조건 명시한 본문 유지

### 종료 조건

- `/workflow` 전수 정리 완료 (린트 차단 룰 0건)
- `/code-review`, `/scw` 등 다른 코드 작성 스킬 정리 완료
- 정리한 룰의 commitlint·ESLint 매핑 표 보존 (어느 룰이 어느 도구 어느 설정에 의해 차단되는지 추적 가능)

### 첫 행동

- `deploy/skills/workflow/` 전체에서 코드 패턴(`16px`, `#fff`, `rgba`, raw 색상값 등) + 룰성 표현 grep
- 후보 5~10개 정도 모이면 commitlint 설정과 1:1 매핑하여 사용자에게 보고
- 사용자 승인 후 1차 삭제 PR
