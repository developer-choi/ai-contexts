# Workflow 특화 체크리스트

`instructions/workflow/` 리뷰 시 base audit(`audit/README.md`)의 **명령문** 체크리스트를 순회한 뒤, 아래 항목을 추가 순회한다.

- `audit/workflow = audit(범용) + workflow 특화 규칙`
- audit에 이미 있는 규칙을 중복 작성하지 않는다

## 진행 방식

workflow 파일은 전체 흐름과 순서가 중요하므로, 먼저 전체를 파악한 뒤 진단한다.

1. `instructions/workflow/` 하위 모든 파일을 읽는다
2. 각 파일의 역할과 현재 내용을 요약해서 보고한다
3. 파일별로 base audit 명령문 체크리스트 → 아래 특화 항목 순서로 진단하여 AUDIT 파일을 작성한다

## 특화 항목

base audit에 없거나, workflow 문서에서 특별히 엄격하게 적용해야 하는 항목이다.

### 인덱스 동기화

step 파일의 추가/삭제/제목·역할 변경이 `README.md`의 작업 진행 순서 테이블에 반영되어 있는지. base audit [checklist/consistency.md](../checklist/consistency.md)의 "참조 완결성" 항목을 **특히 엄격하게** 적용한다.

- step 파일이 추가/삭제되었는데 README 테이블에 반영되지 않은 경우
- step 파일의 제목/역할이 변경되었는데 README 테이블의 설명이 이전 버전인 경우
- README 테이블의 step 순서와 실제 파일의 논리적 순서가 불일치하는 경우

### 오래된 내용

현재 프로세스와 맞지 않는 규칙이나 설명이 남아 있는지.

- step 내부에서 참조하는 산출물 파일명/경로가 실제와 다른 경우
- 더 이상 사용하지 않는 도구/명령어를 언급하는 경우
- 이전 프로세스의 잔재가 남아 있는 경우 (예: 삭제된 step을 참조)
- step 간 전달되는 데이터(산출물)가 실제 흐름과 불일치하는 경우

### 컨벤션 커버리지

`instructions/coding-standards/` 하위 모든 파일을 읽고, 각 규칙이 workflow step에서 적절한 시점에 참조되고 있는지 점검한다.

- 어떤 step에서도 참조되지 않는 코딩 규칙이 있는지
- 참조 시점이 부적절한 규칙이 있는지 (예: 코딩 컨벤션이 구현 step이 아닌 곳에만 있는 경우)
- 새로 추가된 규칙이 적절한 step에 참조되지 않은 경우
