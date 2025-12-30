# 프로젝트 공통 Context 설명서
이 문서는 AI에게 프로젝트의 핵심 컨텍스트와 규칙을 전달하기 위한 공통 문서입니다.

매 작업마다 아래 내용을 포함하여 AI에게 전달하세요.

# 1. 경로 정보
## 모든 도메인 공통 Context
- **공통 타입**: `[경로 기입]` (예: `src/types/common.ts`)
- **공통 컴포넌트**: `[경로 기입]` (예: `src/components/common.ts`)
- **공통 utils/hooks**: `[경로 기입]` (예: `src/utils/common`, `src/hooks/common`)

## 도메인 단위 Context
- **[도메인명]**:
  - **타입**: `[경로 기입]` (예: `src/types/board.ts`)
  - **컴포넌트**: `[경로 기입]` (예: `src/components/board.tsx`)
  - **utils/hooks**: `[경로 기입]` (예: `src/utils/board.ts`, `src/hooks/board.ts`)

---

# 2. 도메인별 주요 레퍼런스 커밋 (Reference Commits)
특정 도메인의 기능을 수정하거나 확장할 때, **과거의 변경 패턴을 참고**하기 위한 커밋 목록입니다.

AI는 관련 도메인 작업 시 해당 커밋의 변경 내역(Diff)을 분석하여 작업 패턴을 학습하세요.

## Board (게시판)
- `[커밋 해시]` : 게시글 입력 폼 데이터 구조 변경 사례

## Home (홈)
- `[커밋 해시]` : 홈 화면 섹션(Section) 종류 추가/변경 사례

---

# 3. 코드 작성 규칙 (Code Rules)
## 타입(Type) 정의 및 네이밍
1. **Interface 확장**:
    - 중복 interface 생성을 방지하기 위해, 기존 공통 타입에 선언된 interface를 `extends` 하여 사용하세요.
    - **Props 네이밍 규칙**:
        - 외국어 원문이 나오는 데이터: `expression`
        - 한국어 뜻이 나오는 데이터: `meaning`