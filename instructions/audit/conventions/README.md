# Conventions 특화 체크리스트

`instructions/conventions/` 리뷰 시 base audit(`audit/README.md`)의 **가이드** 체크리스트를 순회한 뒤, 아래 항목을 추가 순회한다.

## 진행 방식

컨벤션 파일은 각각 독립적이므로, **파일 단위로 개별 리뷰**한다.

1. `instructions/conventions/` 하위 파일/폴더 **목록만** 확인한다 (내용은 읽지 않음)
2. 사용자에게 리뷰할 파일 범위를 확인한다
3. 파일 1개를 읽고, base audit 가이드 체크리스트 → 아래 특화 항목 순서로 진단하여 AUDIT 파일을 작성한다. 파일별로 반복한다.

## 특화 항목

### [CRITICAL] 분류 검증

다른 문서가 폴더/파일 경로 기준으로 컨벤션을 참조하므로, 분류가 틀리면 규칙 누락 또는 불필요한 토큰 소비가 발생한다. base audit [checklist/consistency.md](../checklist/consistency.md)의 "파일 위치·이름과 내용 불일치" 항목을 **특히 엄격하게** 적용한다.

추가로 다음을 점검한다:

- **essentials 게이트**: `essentials/`의 각 규칙이 **모든 작업 유형**(기능 구현, 버그 수정, 테스트, 리뷰, 문서 작성)에 공통으로 적용되는지. 특정 작업에만 해당하는 규칙이 essentials에 있으면 적절한 하위 폴더로 이동을 제안한다 (essentials는 항상 로드되므로 토큰 낭비 방지)

### 기타 항목

- **중복**: 다른 컨벤션 파일이나 `instructions/code-quality/`와 같은/비슷한 내용이 존재하는지
- **README.md 정합성**: `conventions/README.md`의 AI 행동 가이드가 실제 폴더 구조 및 파일과 일치하는지
