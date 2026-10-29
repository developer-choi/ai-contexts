---
disable-model-invocation: true
name: pre-exit
description: 세션을 마무리한다. 이 세션에 해당하는 회고 항목을 먼저 보여주고 고른 것만 돌린 뒤, 미커밋 확인·커밋 정리·세션이 띄운 것 정리를 수행한다.
argument-hint: "(인자 없음 — 돌릴 회고 항목은 메뉴에서 골라 받는다)"
---

# 세션 마무리

## 목적

세션을 회고한다. 이 세션에서 겪은 문제가 다음 세션에서 반복되지 않게 만든다.

## 왜 필요한가

회고에서 건진 것은 대화와 함께 사라진다. 그래서 세션이 닫히기 전에 남겨야 할 것을 골라 백로그 항목으로 남긴다.

## 회고 항목

표의 순서가 실행 순서다 — 앞 항목이 건진 것은 「문제 리스트업 + 규칙화」의 문제 목록에 합류한다.

| 항목 | 상세 |
|---|---|
| 시간·순서 표 | [timeline.md](timeline.md) |
| requirement-review 보강 | [augmentations/requirement-review.md](augmentations/requirement-review.md) |
| digest 보강 | [augmentations/digest.md](augmentations/digest.md) |
| recruitment 보강 | [augmentations/recruitment.md](augmentations/recruitment.md) |
| 오답노트 | [error-notebook.md](error-notebook.md) |
| 문제 리스트업 + 규칙화 | [step-1.md](step-1.md) |

## 무엇을 돌릴지 고른다

상세 파일을 끝까지 읽기 **전에** 고른다. 세션에 따라 소득 없는 항목이 섞여 있어서, 상세를 먼저 열면 절차를 다 읽은 뒤에야 그걸 알게 된다.

1. `node {{skill_dir}}/scripts/session-state.mjs menu --session <session_id> --repo <레포 경로> --cwd <이 세션 cwd>`로 이 세션에 해당하는 항목을 받는다. 기억으로 고르지 않는다 — 앞머리가 요약으로 접혀 있으면 건너뛴 항목이 아무 데도 안 남는다.
2. `해당`·`항상`·`미확인` 항목에 번호를 매기고 각 상세 파일의 첫 문단을 한 줄로 붙여 한 번에 내고, **돌릴 번호**를 받는다.

`해당없음`은 올리지 않는다. 다만 자동 발동된 스킬은 호출 기록에 안 남으므로, 보강 항목의 스킬을 이 세션에서 돌린 기억이 있으면 올린다 — 기억은 항목을 더할 때만 쓴다.

`미확인`은 재료가 없어 못 본 것이라 올리고, 스크립트가 낸 사유를 붙인다 — 고르는 쪽이 무엇을 모르는 채 고르는지 알아야 한다.

## 세션이 남긴 것 정리

회고에서 무엇을 골랐는지와 무관하게 이어서 돈다 — 이쪽은 골라 받지 않는다. 절차는 [cleanup.md](cleanup.md)를 따른다.