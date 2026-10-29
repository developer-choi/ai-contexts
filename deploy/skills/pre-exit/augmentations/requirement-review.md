# requirement-review 세션 보강

workflow의 requirement-review(BG 요구사항 리뷰) 세션의 회고다. 목적은 **requirement-review의 체크리스트를 다듬는 것**이다. 이번 리뷰에서 체크리스트가 무엇을 잡았고 무엇을 놓쳤는지를 되짚어, 다음 리뷰가 같은 것을 놓치지 않게 한다.

## 재료

`node {{skill_dir}}/scripts/session-state.mjs review-material --session <session_id>`로 받는다. 「적용한 체크리스트」와 「page·global 이력」이 둘 다 없으면 건너뛴다.

## 회고 대상

- 적용한 체크리스트 파일을 다시 열어 항목마다 「page·global 이력」과 1대1로 대조한다
- 지적이 없었던 항목: 자료가 잘 되어 있어서인지, 그 유형의 문제를 체크리스트가 아예 잡지 못하는 건지 판별한다
- 「자유 검토 보고」의 발견마다: 체크리스트의 어디에 어떤 항목을 넣었으면 루프 안에서 잡을 수 있었는지 특정한다
- 누락한 절차: 무엇을 누락했고 왜 누락했는지(지시가 모호 / 단순 실수 / 해당 자료에서 불필요) 원인을 본다. 재료의 시각 순서가 근거다

## 반영 위치

- **requirement-review 고유**: 제안마다 [requirement-review](../../workflow/requirement-review/SKILL.md) 폴더 안에서 고칠 파일을 지목한다. 체크리스트가 일차 후보다.
- **requirement-review 밖을 고칠 발견**과 **일반화되는 선호**: 고칠 곳은 「문제 리스트업 + 규칙화」가 정한다.

## 출력

제안마다 근거가 된 재료(체크리스트 파일·이력의 시각·자유 검토 발견)를 붙여 「문제 리스트업 + 규칙화」의 문제 목록에 합류시킨다.
