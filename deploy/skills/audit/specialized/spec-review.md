# spec-review 특화 체크리스트

`skills/workflow_spec-review/` 리뷰 시 base audit(`audit/SKILL.md`)의 체크리스트를 순회한 뒤, 아래 항목을 추가 순회한다.

## 배경

spec-review는 output-template(산출물 양식), checklist(점검 항목), SKILL.md(실행 흐름) 3계층으로 구성된다. 각 계층이 독립적으로 수정되므로, 계층 간 참조가 빠지기 쉽다.

## 특화 항목

### [CRITICAL] 산출물 ↔ 점검 항목 정합성

output-template.md에 정의된 모든 필드/섹션이, checklist 또는 SKILL.md의 실행 단계에서 검증되는지 확인한다.

- output-template.md의 각 필드를 순회하며, 해당 필드를 채우기 위한 분석/검증이 checklist 또는 SKILL.md 어딘가에 존재하는지 대조
- 검증이 없는 필드가 있다면: 해당 필드를 검증하는 checklist 항목 추가를 제안하거나, 해당 필드가 산출물에 불필요한 것인지 질문

### [CRITICAL] 점검 항목 → SKILL.md 참조 정합성

checklist에 존재하는 파일이 SKILL.md의 실행 흐름에서 참조되는지 확인한다.

- checklist/ 하위의 모든 파일이 SKILL.md 또는 overview.md 등 상위 문서에서 링크/언급되는지 대조
- 참조되지 않는 checklist 파일이 있다면: SKILL.md에 참조 추가를 제안하거나, 해당 파일이 죽은 문서인지 질문
