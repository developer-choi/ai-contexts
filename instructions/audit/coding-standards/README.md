# Coding-Standards 특화 체크리스트

`instructions/coding-standards/` 리뷰 시 base audit(`audit/README.md`)의 **가이드** 체크리스트를 순회한 뒤, 아래 항목을 추가 순회한다.

## 진행 방식

coding-standards 파일은 각각 독립적이므로, **파일 단위로 개별 리뷰**한다.

1. `instructions/coding-standards/` 하위 파일/폴더 **목록만** 확인한다 (내용은 읽지 않음)
2. 사용자에게 리뷰할 파일 범위를 확인한다
3. 파일 1개를 읽고, base audit 가이드 체크리스트 → 아래 특화 항목 순서로 진단하여 AUDIT 파일을 작성한다. 파일별로 반복한다.

## 특화 항목

### [CRITICAL] 분류 검증

다른 문서가 폴더/파일 경로 기준으로 규칙을 참조하므로, 분류가 틀리면 규칙 누락 또는 불필요한 토큰 소비가 발생한다. base audit [checklist/consistency.md](../checklist/consistency.md)의 "파일 위치·이름과 내용 불일치" 항목을 **특히 엄격하게** 적용한다.

추가로 다음을 점검한다:

- **coding vs quality 분류**: 형식 규약(맞다/틀리다)은 `coding/`에, 품질 원칙(정도의 문제)은 `quality/`에 있는지

### 기타 항목

- **중복**: 다른 coding-standards 파일이나 하위 폴더 간에 같은/비슷한 내용이 존재하는지
- **README.md 정합성**: `coding-standards/README.md`의 AI 행동 가이드가 실제 폴더 구조 및 파일과 일치하는지
