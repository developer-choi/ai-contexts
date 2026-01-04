# 전 프로젝트 공통 컨텍스트 가이드

이 문서는 AI가 사용자의 요청 의도를 분석하고, `instructions/for-all-projects/` 하위의 적절한 컨텍스트 폴더를 **스스로 선별하여 로드**하기 위한 규칙을 정의합니다.

AI는 사용자의 명시적인 지시가 없더라도, 아래 규칙에 따라 필요한 문서를 먼저 읽고 작업을 시작해야 합니다.

## 폴더별 역할 및 포함 내용

### 1. `common/` (Base Context)
> **필수 로드**: 모든 작업의 기본이 되는 원칙입니다.
- **포함 내용**: 개발 원칙, AI 태도, Git 커밋/Add 규칙, 작업 완료 후 체크리스트.

### 2. `coding/` (Implementation Context)
> **사용 시점**: 프로덕션 코드 작성, 수정, 리팩토링 시.
- **포함 내용**: Naming, TypeScript, Component, Function, Style 등 구현 규칙.

### 3. `testing/` (Test Context)
> **사용 시점**: 테스트 코드 작성, 수정, 분석 시.
- **포함 내용**: RTL 쿼리 우선순위, Test 파일명 규칙, `describe/it` 패턴.

### 4. `review/` (Review Context)
> **사용 시점**: 코드 리뷰, PR 작성, 코드 품질 검수 요청 시.
- **포함 내용**: 리뷰 체크리스트, 안티 패턴 점검, PR 가이드.

---

## AI 컨텍스트 로딩 전략 (Context Loading Strategy)

사용자의 요청(Intent)에 따라 다음 조합으로 문서를 로드하세요.

### 1. 기능 구현 및 버그 수정 (Implementation)
> **User Intent**: "이 기능 만들어줘", "버그 고쳐줘", "이거 리팩토링 해줘"
- **Load Path**:
    1.  `instructions/for-all-projects/common`
    2.  `instructions/for-all-projects/coding`
- **Action**: 구현 규칙을 숙지한 상태에서 코드를 작성합니다.

### 2. 테스트 코드 작성 (Testing)
> **User Intent**: "테스트 짜줘", "테스트 깨지는데 고쳐줘"
- **Load Path**:
    1.  `instructions/for-all-projects/common`
    2.  `instructions/for-all-projects/testing`
- **Action**: `coding` 규칙보다는 테스트 작성 패턴과 쿼리 우선순위에 집중합니다.

### 3. 코드 리뷰 및 PR (Review)
> **User Intent**: "이 코드 리뷰해줘", "PR 내용 봐줘", "내 코드 어때?"
- **Load Path**:
    1.  `instructions/for-all-projects/common`
    2.  `instructions/for-all-projects/coding` (코드 품질 기준)
    3.  `instructions/for-all-projects/testing` (테스트 유무 확인)
    4.  `instructions/for-all-projects/review` (검수 체크리스트)
- **Action**: 단순 생성이 아니라, 엄격한 기준(`review/`)을 적용하여 비판적으로 분석합니다.