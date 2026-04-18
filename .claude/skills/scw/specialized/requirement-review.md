# requirement-review 특화 체크리스트

`skills/workflow/requirement-review/` 리뷰 시 추가로 점검하는 항목.

## 배경

requirement-review는 output-template(산출물 양식), checklist(점검 항목), SKILL.md(실행 흐름), guide.md(입력 타입별 가이드)로 구성된다. 각 계층이 독립적으로 수정되므로, 계층 간 참조가 빠지기 쉽다.

## 특화 항목

### [CRITICAL] 산출물 ↔ 점검 항목 정합성

output-template.md에 정의된 모든 필드/섹션이, checklist 또는 SKILL.md의 실행 단계에서 검증되는지 확인한다.

- output-template.md의 각 필드를 순회하며, 해당 필드를 채우기 위한 분석/검증이 checklist 또는 SKILL.md 어딘가에 존재하는지 대조
- 검증이 없는 필드가 있다면: 해당 필드를 검증하는 checklist 항목 추가를 제안하거나, 해당 필드가 산출물에 불필요한 것인지 질문

### [CRITICAL] 점검 항목 → SKILL.md 참조 정합성

checklist에 존재하는 파일이 SKILL.md의 실행 흐름에서 참조되는지 확인한다.

- checklist/ 하위의 모든 파일이 SKILL.md 또는 overview.md 등 상위 문서에서 링크/언급되는지 대조
- 참조되지 않는 checklist 파일이 있다면: SKILL.md에 참조 추가를 제안하거나, 해당 파일이 죽은 문서인지 질문

### 관심사 ↔ 페이지 특성 분리

checklist/ 하위 파일이 관심사(모든 페이지 공통)와 페이지 특성(특정 유형에만 해당)을 혼재하고 있지 않은지 확인한다.

- 관심사 파일(flow.md, data.md 등)에 특정 페이지 유형에만 해당하는 항목이 섞여 있지 않은지
- 페이지 특성 파일(page-type/)이 있다면, 관심사 파일과 내용이 중복되지 않는지
