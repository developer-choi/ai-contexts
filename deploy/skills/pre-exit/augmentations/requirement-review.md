# requirement-review 세션 보강

세션에서 workflow의 requirement-review(BG 요구사항 리뷰)를 돈 경우의 추가 회고. pre-exit 본 절차와 **함께** 수행한다.

이 보강의 목적은 **requirement-review의 체크리스트를 다듬는 것**이다. 이번 리뷰에서 체크리스트가 무엇을 잡았고 무엇을 놓쳤는지를 되짚어, 다음 리뷰가 같은 것을 놓치지 않게 한다.

## 재료

먼저 `node {{skill_dir}}/scripts/session-state.mjs review-material --session <session_id>`로 재료를 받는다. 기억으로 재구성하지 않는다. 재료 명령이 transcript를 못 찾으면 그 사실을 보고하고 이 보강을 건너뛴다.

## 회고 대상

재료의 「적용한 체크리스트」와 「page·global 이력」이 둘 다 없으면 체크리스트 슬롯이 없는 모드(recruitment 단독)로 보고 건너뛴다. 체크리스트가 0건인데 page 이력이 있으면 체크리스트 없이 쓴 회차이므로 아래 「누락한 절차」로 본다.

- 적용한 체크리스트 파일을 다시 열어 항목마다 「page·global 이력」과 1대1로 대조한다
- 지적이 없었던 항목: 자료가 잘 되어 있어서인지, 그 유형의 문제를 체크리스트가 아예 잡지 못하는 건지 판별한다
- 「자유 검토 보고」의 발견마다: 체크리스트의 어디에 어떤 항목을 넣었으면 루프 안에서 잡을 수 있었는지 특정한다
- 누락한 절차: 무엇을 누락했고 왜 누락했는지(지시가 모호 / 단순 실수 / 해당 자료에서 불필요) 원인을 본다. 재료의 시각 순서가 근거다 — 체크리스트를 처음 읽은 시각이 page를 처음 쓴 시각보다 늦으면 체크리스트 없이 쓴 것으로 본다

## 회고하지 않는 것

- **자유 검토를 다시 돌리지 않는다.** 재료의 「자유 검토 보고」에 있는 발견만 쓴다
- **세션이 step 절차를 밟았는지**는 workflow 보강이 본다
- 재료에 없는 사건은 적지 않는다

## 반영 위치

- **requirement-review 고유 — 체크리스트 개선**: 제안마다 고칠 파일을 지목한다 — 해당 모드의 `checklist/`([planning](../../workflow/requirement-review/planning/checklist/)·[design](../../workflow/requirement-review/design/checklist/)), [page-type/](../../workflow/requirement-review/page-type/), [planning/output-template.md](../../workflow/requirement-review/planning/output-template.md), requirement-review [SKILL.md](../../workflow/requirement-review/SKILL.md)·각 모드의 `guide.md` 중 하나
- **requirement-review 밖을 고칠 발견**(workflow의 자료 받기·게이트·폴더 규약 등)과 **일반화되는 선호**: 버리지 않고 pre-exit 본 절차 「문제 리스트업 + 규칙화」로 보낸다

## 출력

본 보강은 별도 보고 섹션을 만들지 않는다. 제안마다 근거가 된 재료(체크리스트 파일·이력의 시각·자유 검토 발견)를 붙여 pre-exit 「문제 리스트업 + 규칙화」의 문제 목록에 흡수시키고, 그 규칙화 단계에서 위 「반영 위치」에 따라 처리한다. 제안이 0건이면 "requirement-review 체크리스트 개선 제안 없음"으로 보고하고 넘어간다.
