# implementation.md 컨벤션

`/plan/pr{N}/persistent/implementation.md`의 책임·양식·회귀 체크리스트·`it.todo` 매칭 게이트 단일 출처.

## 책임·위치

구현 순서·커밋 분할·방침·`@deprecated` 흐름·`it.todo` 매핑·**행동 결정 커버리지 표**(「`it.todo` 매칭 게이트 > PLAN 작성 시점」)·회귀 체크리스트.

정확한 편집 문자열·식별자·줄번호·**커밋 SHA**는 전사하지 않는다 — rename·이동·설정치환은 "grep `<패턴>` → 일괄 치환" 지시로 접고, md엔 코드로 표현 못 하는 것(회귀·gotcha·근거)만 남긴다 (step-4 §5 조건 3). 커밋은 계획 상대 순번(`### N`)으로만 지칭하고 **확정 SHA는 박지 않는다** — history rewrite로 무효화돼 정정 부담만 낳고, SHA의 진실 원천은 git이다 (decisions-lifecycle.md 「갱신」과 동일 원칙).

`persistent/` 하위에 둔다. step-5(구현)·step-6.1(Gap Analysis)·WRITING_REFINER(PR body 확정)에서 소비. 사용자 명시 폐기 전까지 보존 (커밋 정리 시점이 PR 머지 이후로 길 수 있어 보존).

## 양식

각 커밋 항목은 **신설** 구현 파일과 대응 테스트 파일(stub `*.test.tsx`)을 sub-bullet으로 나란히 명시. rename·이동 커밋은 파일·식별자를 나열하지 말고 "grep `<패턴>` → 치환" 한 줄로 접는다(정확한 경로·식별자 전사 X). "단위테스트 옵션" 같은 별도 섹션 안 만든다. 면제는 사유를 함께 적는다 (예: "page/layout이라 단위테스트 면제, E2E에서 다룸").

예시:

```
### N. feat: shared/components/AlertModal
- 신규: AlertModal.tsx
- 신규: AlertModal.test.tsx — 다음 it.todo 다룸:
    - 'open=true 고정 시 콘텐츠 렌더링'
    - 'onClose 호출 검증'
    - 'whitespace-pre-line 줄바꿈 적용'
```

## 회귀 체크리스트 절

implementation.md 끝에 「회귀 체크리스트」 섹션을 둔다. 구현 종료 보고 직전 점검 항목:

- stub 테스트 파일의 `it.todo`와 작성된 `it(...)` 케이스 매칭 (각 todo가 코드화됐거나 면제 사유 기재)
- 프로젝트 테스트 명령 통과
- PR 성격에 따른 추가 항목

체크리스트 미통과 시 구현 종료 보고 금지.

## `it.todo` 매칭 게이트

같은 매칭 룰이 **상류→하류 사슬**로 세 시점에 적용된다: `decisions 행동 결정 → it.todo → implementation.md 커밋 계획 → 실제 it(...)`. 하류 두 시점만 검사하면 `it.todo`(파생 AI 캐시)가 상위 결정보다 좁혀진 누락(행동 결정 탈락)은 걸러지지 않는다 — `it.todo`를 진실 피벗으로 쓰는 자기증명 루프. 최상류 매칭이 `it.todo`를 상위 결정으로 되묶어 그 루프를 끊는다 (SKILL.md 「검증 기준 = 진실 원천」).

### PLAN 작성 시점 — decisions 행동 결정 ↔ `it.todo` (커버리지 표 강제)

이 매칭은 머릿속 점검으로 끝내지 않고 **표를 산출물로 남긴다.** 대조를 산문 지시로만 두면 step-4의 여러 임무 속에 묻혀 스킵·스킴되기 쉽다 (실사고에서 이 대조가 PLAN에서 안 잡히고 IMPL exit 자가검토에서야 발견됨). 표를 필수 산출물로 만들면 미산출(표 없음)·미완(빈 행)이 그 자리에서 가시화되고, IMPL·step-6이 지속 계약으로 재검증할 수 있다 — 부탁 한 겹을 얹는 대신 검사 결과를 눈에 보이게 강제하는 forcing function이다.

- decisions.md(+ overview.md 의도)에서 **행동 결정**을 모두 추출 — 사용자에게 관측되는 동작·트리거·분기·상태 전이·성공/실패 갈래. 실패와 취소, 이동과 머무름처럼 **UI 동작이 다르면 별개 행동 결정**으로 센다. Q&A·열린 질문 절에 묻힌 갈래도 빠짐없이
- 각 행동 결정 → 커버하는 `it.todo`(또는 면제 사유)를 아래 표로 implementation.md 「행동 결정 커버리지」 절에 기재:

  | 행동 결정 (decisions 출처) | 커버 `it.todo` | 면제 사유 |
  |---|---|---|
  | 제출 성공 시 페이지 이동 (D2) | '성공 시 성공 라우트로 이동' | — |
  | 제출 성공 시 머무름=reset (Q1) | (빈칸 → 누락) | — |

- 면제는 `it.todo` 면제 사유와 동일 기준(MP `WhatToTest.md` 화이트리스트 + 사유 명시. 예: E2E에서 다룸)이어야 인정
- **표 미산출, 또는 면제 없이 커버 `it.todo`가 빈 행이 1건이라도 있으면 PLAN 종료 금지**
- 오라클은 decisions·overview가 아니라 그 근거인 요구사항 원본·사용자 발화다 (decisions도 AI 산출물 — 행동 결정 추출이 좁으면 이 표도 좁아지므로, 갈래 수가 의심되면 1차 입력으로 소급 대조)

### PLAN 종료 시점 — `it.todo` ↔ implementation.md 커밋 계획

- stub `*.test.tsx`의 모든 `it.todo` 항목 추출
- 각 항목이 implementation.md 어느 커밋의 테스트 코드 계획과 매칭되는지 점검
- 매칭 안 된 항목은 "테스트 누락 또는 면제 사유 없음"으로 분류
- 매칭률 100% 또는 면제 사유 100% 기재되지 않으면 PLAN 종료 금지

### IMPL 종료 시점 — `it.todo` ↔ 실제 `it(...)` 케이스

stub `*.test.tsx`의 `it.todo` 자연어와 실제 작성된 `it(...)` 케이스를 대조. 누락된 todo가 있으면 사용자 보고.

## `it.todo` 면제 사유

면제 사유는 MP `docs/patterns/testing/WhatToTest.md` 화이트리스트 카테고리 매칭 + 사유 명시여야 인정한다.
