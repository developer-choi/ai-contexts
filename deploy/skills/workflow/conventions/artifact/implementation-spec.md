# implementation.md 컨벤션

`/plan/pr{N}/retained/implementation.md`의 책임·양식·`it.todo` 매칭 점검 단일 출처.

## 책임·위치

implementation.md는 PLAN 시점의 구현 계획이다. 코드·커밋에서 알 수 있는 것은 담지 않는다 — 옮겨 적은 값은 코드가 바뀌어도 따라가지 않아 틀린 채 남는다.

담는 것은 커밋 분할(`### N` 순번이 곧 구현 순서)·**행동 결정 커버리지 표**(「`it.todo` 매칭 점검 > PLAN 시점」)·gotcha·근거, 그리고 도구 설정 PR이면 적용을 구현에 미룬 설정값([SETUP 「설정값과 격리」](../pr-types/setup.md#설정값과-격리))이다.
표의 `it.todo` 주석 요지는 stub에도 있지만 예외로 담는다 — `it.todo` 이름이 고정 문구라([stub.md](stub.md#testtsx)) 요지 없이는 행과 짝을 맞출 수 없다.

## 양식

파일 맨 위에 아래 안내문을 둔다.

```markdown
> PLAN 시점 구현 계획의 스냅샷이다. IMPL에 들어간 뒤로는 고치지 않는다 — 지금 상태의 정본은 코드·커밋이다.
```

각 커밋 항목은 **신설** 구현 파일과 대응 테스트 파일(stub `*.test.ts(x)`)을 sub-bullet으로 나란히 명시 — 테스트 계획이 커밋 밖 별도 절로 빠지면 줄어든다. 대응 테스트 파일을 두지 않는 구현 파일은 그 자리에 사유를 적는다.

## `it.todo` 매칭 점검

**상류→하류 사슬** `행동 결정 → it.todo → 실제 it(...)`을 두 시점에 본다.

### PLAN 시점 — 행동 결정 ↔ `it.todo` (커버리지 표 강제)

행동 결정마다 그것을 확인할 `it.todo`가 계획됐는지 맞춘다.

- decisions.md(+ overview.md 의도)뿐 아니라 그 근거인 요구사항 원본·사용자 발화에서도 이 PR 범위의 **행동 결정**을 모두 뽑는다 — decisions가 요구사항보다 좁혀져 빠진 행동도 잡아야 한다. 행동 결정은 사용자에게 관측되는 것 중 **우리 코드가 정하는** 동작·트리거·분기·상태 전이·성공/실패 종류다.
  실패와 취소, 이동과 머무름처럼 **UI 동작이 다르면 별개 행동 결정**으로 센다.
- 뽑은 것을 표에 올릴지는 아래로 가른다.
  - MP `docs/patterns/testing/TestsWeAvoid.md` 「받은 값을 화면에 그대로 보여 준다」·`WhatToTest.md` 「시각은 유닛이 아니라 Chromatic」에 해당하는 동작과, 데이터와 상관없이 늘 같은 화면은 올리지 않는다
  - 그 밖에 MP `docs/patterns/testing/WhatToTest.md` 「판단 기준」·「면제 화이트리스트」로 테스트하지 않기로 한 동작은 행으로 두고, 면제 사유 칸에 skip을 낸 문항이나 화이트리스트 카테고리를 적는다
  - decisions가 이 PR에서 빼기로 한 행동도 행으로 두고, 면제 사유 칸에 그 결정을 적는다
  - TestsWeAvoid.md 「고정 링크의 href가 맞다 (주소를 정하는 분기가 없는 링크)」에 해당하는 링크는 행으로 두되 `it.todo`를 만들지 않고, 면제 사유 칸에 「고정 링크 · 판정 4문항 「깨지면 조용히 넘어가나」 skip · 크롬 확인」을 적는다
  - 데이터가 있느냐 없느냐에 따라 글자가 보였다 안 보였다 하는 것은 올린다
  - 값의 모양을 바꾸거나 계산하는 것은 올리고, 그 계산을 함수로 빼서 `it.todo`를 그 함수의 테스트에 둔다
- 표는 implementation.md 「행동 결정 커버리지」 절에 둔다.

  | 행동 결정 (출처: decisions·요구사항 원본 위치·사용자 발화) | 커버 `it.todo` (파일 · 주석 요지) | 면제 사유 |
  |---|---|---|

- PLAN을 마치기 전에 `node {{skill_dir}}/scripts/step-gates.mjs todo-coverage plan`을 돌려 통과시킨다.

### IMPL 종료 시점 — 남은 `it.todo`

남은 `it.todo`는 MP `docs/patterns/testing/TestWriting.md` 「네이밍」대로 이름을 지어 실제 `it(...)`로 바꾼다.
IMPL을 마치기 전에 `node {{skill_dir}}/scripts/step-gates.mjs todo-coverage impl`을 돌려 통과시킨다.
