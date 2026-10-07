# implementation.md 컨벤션

`/plan/pr{N}/retained/implementation.md`의 책임·양식·`it.todo` 매칭 게이트 단일 출처.

## 책임·위치

커밋 분할(`### N` 순번이 곧 구현 순서)·**행동 결정 커버리지 표**(「`it.todo` 매칭 게이트 > PLAN 시점」)·gotcha·근거.

코드·다른 절차에 이미 있는 것은 담지 않는다.

정확한 편집 문자열·식별자·줄번호·**커밋 SHA**는 전사하지 않는다 — rename·이동·설정치환은 "grep `<패턴>` → 일괄 치환" 지시로 접고, md엔 코드로 표현 못 하는 것(gotcha·근거)만 남긴다. 커밋은 계획 상대 순번(`### N`)으로만 지칭한다.

implement(구현)·IMPL 종료 매칭 게이트·[verify 「Gap Analysis」](../../steps/verify.md#step-61-gap-analysis-계획--실제-차이-검사)에서 소비.

IMPL에 들어간 뒤로는 고치지 않는다. 위 소비처는 모두 계획과 실제를 대조하므로, 계획을 실제에 맞춰 고치면 잡아야 할 차이가 미리 지워진다. 지금 상태의 정본은 코드·커밋이다.

## 양식

파일 맨 위에 아래 안내문을 둔다.

```markdown
> PLAN 시점 구현 계획의 스냅샷이다. IMPL에 들어간 뒤로는 고치지 않는다 — 지금 상태의 정본은 코드·커밋이고, 이 문서와 다른 점은 verify Gap Analysis가 차이로 잡는다.
```

각 커밋 항목은 **신설** 구현 파일과 대응 테스트 파일(stub `*.test.tsx`)을 sub-bullet으로 나란히 명시. **테스트 파일 안의 `it.todo` 주석 내용은 옮겨 적지 않는다** — 그 목록의 진실 원천은 stub 파일이다. 면제는 사유를 함께 적는다 (예: "page/layout이라 단위테스트 면제, E2E에서 다룸").

## `it.todo` 매칭 게이트

**상류→하류 사슬** `decisions 행동 결정 → it.todo → 실제 it(...)`을 두 시점에 본다. PLAN 시점엔 행동 결정마다 `it.todo`가 있는지 맞추고, IMPL 종료 시점엔 테스트 경로에 `it.todo`가 남았는지 센다.

### PLAN 시점 — decisions 행동 결정 ↔ `it.todo` (커버리지 표 강제)

- decisions.md(+ overview.md 의도)에서 **행동 결정**을 모두 추출 — 사용자에게 관측되는 것 중 **우리 코드가 정하는** 동작·트리거·분기·상태 전이·성공/실패 갈래. 실패와 취소, 이동과 머무름처럼 **UI 동작이 다르면 별개 행동 결정**으로 센다. Q&A·열린 질문 절에 묻힌 갈래도 빠짐없이
  - 부모가 넘겨준 값을 바꾸지 않고 화면에 그대로 보여 주기만 하는 것은 표에 올리지 않는다. 어떤 값을 어느 자리에 보여 주는지도 마찬가지다. 근거는 MP `docs/patterns/testing/WhatToTest.md` 「판정 4문항」이다
  - 데이터와 상관없이 늘 같은 화면(언제나 비어 있는 자리 등)도 표에 올리지 않는다
  - 데이터가 있느냐 없느냐에 따라 글자가 보였다 안 보였다 하는 것은 표에 올린다. 아이콘처럼 눈으로만 구분되는 차이는 Chromatic이 보므로 뺀다
  - 값의 모양을 바꾸거나 계산하는 것은 표에 올린다. 그 계산은 함수로 따로 떼어 stub하고, `it.todo`도 컴포넌트가 아니라 그 함수의 테스트에 둔다
- 각 행동 결정 → 커버하는 `it.todo`(또는 면제 사유)를 아래 표로 적는다. `it.todo` 이름은 고정 문구라 구분이 안 되므로([stub.md](stub.md#testtsx)), 칸에는 테스트 파일과 그 `it.todo` 주석의 요지를 적는다. 표는 implementation.md 「행동 결정 커버리지」 절에 기재:

  | 행동 결정 (decisions 출처) | 커버 `it.todo` (파일 · 주석 요지) | 면제 사유 |
  |---|---|---|

- **이 표의 `it.todo` 주석 요지 기재는 전사 금지 룰 전체에 대한 예외다** — 본 문서 「책임·위치」·「양식」의 금지와 「코드-narrative 오배치 검출」 모두에 걸리지 않는다. 리뷰어·후속 편집자 모두 이 표를 중복으로 보고 지우지 않는다.
- 면제는 MP `docs/patterns/testing/WhatToTest.md` 화이트리스트 카테고리 매칭 + 사유 명시여야 인정
- **표 미산출, 또는 면제 없이 커버 `it.todo`가 빈 행이 1건이라도 있으면 PLAN 종료 금지** — `node {{skill_dir}}/scripts/step-gates.mjs todo-coverage --impl <implementation.md>`가 센다. 표를 **채우는** 일(행동 결정 추출)은 의미 판정이라 그대로 사람 몫이고, 기계가 하는 것은 채워진 표에 빈 행이 있는지뿐이다
- 오라클은 decisions·overview가 아니라 그 근거인 요구사항 원본·사용자 발화다

### IMPL 종료 시점 — 남은 `it.todo`

`node {{skill_dir}}/scripts/step-gates.mjs todo-coverage --impl <implementation.md> --tests <테스트 경로>`가 테스트 경로에 남은 `it.todo`를 센다. 1건이라도 남으면 IMPL 종료 금지 — IMPL은 `it.todo`마다 주석을 보고 MP `docs/patterns/testing/TestWriting.md` 「네이밍」대로 이름을 지어 실제 `it(...)`로 바꾼다.
