# implementation.md 컨벤션

`/plan/pr{N}/persistent/implementation.md`의 책임·양식·회귀 체크리스트·`it.todo` 매칭 게이트 단일 출처.

## 책임·위치

구현 순서·커밋 분할·방침·`@deprecated` 흐름·`it.todo` 매핑·회귀 체크리스트.

정확한 편집 문자열·식별자·줄번호는 전사하지 않는다 — rename·이동·설정치환은 "grep `<패턴>` → 일괄 치환" 지시로 접고, md엔 코드로 표현 못 하는 것(회귀·gotcha·근거)만 남긴다 (step-4 §5 조건 3).

`persistent/` 하위에 둔다. step-5(구현)·step-6.1(Gap Analysis)·step-7(PR body)에서 소비. 사용자 명시 폐기 전까지 보존 (커밋 정리 시점이 PR 머지 이후로 길 수 있어 보존).

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

같은 매칭 룰이 두 시점에 적용된다.

### PLAN 종료 시점 — `it.todo` ↔ implementation.md 커밋 계획

- stub `*.test.tsx`의 모든 `it.todo` 항목 추출
- 각 항목이 implementation.md 어느 커밋의 테스트 코드 계획과 매칭되는지 점검
- 매칭 안 된 항목은 "테스트 누락 또는 면제 사유 없음"으로 분류
- 매칭률 100% 또는 면제 사유 100% 기재되지 않으면 PLAN 종료 금지

### IMPL 종료 시점 — `it.todo` ↔ 실제 `it(...)` 케이스

stub `*.test.tsx`의 `it.todo` 자연어와 실제 작성된 `it(...)` 케이스를 대조. 누락된 todo가 있으면 사용자 보고.

## `it.todo` 면제 사유

면제 사유는 MP `docs/patterns/testing/WhatToTest.md` 화이트리스트 카테고리 매칭 + 사유 명시여야 인정한다.
