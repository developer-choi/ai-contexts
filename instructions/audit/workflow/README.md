# Workflow 특화 체크리스트

`instructions/workflow/` 리뷰 시 base audit(`audit/README.md`)의 **명령문** 체크리스트를 순회한 뒤, 아래 항목을 추가 순회한다.

## 진행 방식

workflow 파일은 전체 흐름과 순서가 중요하므로, 먼저 전체를 파악한 뒤 진단한다.

1. `instructions/workflow/` 하위 모든 파일을 읽는다
2. 각 파일의 역할과 현재 내용을 요약해서 보고한다
3. 파일별로 base audit 명령문 체크리스트 → 아래 특화 항목 순서로 진단하여 AUDIT 파일을 작성한다

## 특화 항목

- **중복**: 여러 파일에 같은/비슷한 내용이 존재
- **오래된 내용**: 현재 프로세스와 맞지 않는 규칙이나 설명
- **규칙 위반**: CONTRIBUTING.md 원칙에 어긋나는 부분 (예: 커맨드/사용법이 instruction-map 외부에 존재)
- **구조 문제**: 한 파일이 과도하게 비대하거나, 분리/통합이 필요한 경우
- **컨벤션 커버리지**: `instructions/conventions/`와 `instructions/code-quality/` 하위 모든 파일을 읽고, 각 규칙이 workflow step에서 적절한 시점에 참조되고 있는지 점검한다
  - 어떤 step에서도 참조되지 않는 규칙이 있는지
  - 참조 시점이 부적절한 규칙이 있는지 (예: 코딩 컨벤션이 구현 step이 아닌 곳에만 있는 경우)
