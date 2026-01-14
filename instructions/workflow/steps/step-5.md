# Step 5: 구현

이 단계는 `/plan/overview.md`의 구현 방침을 바탕으로 **실제 코드를 작성하며 커밋을 쌓아가는** 단계입니다.

**목표**:
- overview.md에 정의된 기능을 코드로 구현
- 작은 커밋 단위로 쪼개서 리뷰하기 쉽게 만들기

---

## 참고 자료

- `/plan/background.md`
- `/plan/codebase-audit.md` (있는 경우)
- `/plan/overview.md`

---

## 커밋 순서 가이드

다음 순서로 커밋을 쌓는 것을 권장합니다. 더 좋은 순서가 있다면 사용자에게 제안하세요.

### Phase 0. 사전 작업 (Conflict 방지)

**1. Deprecated 처리**
- 기존 모듈 대체 시 바로 삭제 말고 `@deprecated` 먼저
```typescript
/**
 * @deprecated 대신 NewModule 사용
 */
function deprecatedSomeFunction() {}
```

**2. 기존 코드 리팩토링**
- 파라미터 타입 변경 등은 새 기능 구현 전에 먼저 수정
- **이유**: 나중에 수정하면 Rebase 시 Conflict 폭발

**3. 파일 분리**
- 150줄+ 파일에 코드 추가 예정이면 먼저 분리
- **예시**: UserPage (200줄) → UserPage + UserProfile + UserActions로 분리 후 → 새 기능 추가

### Phase 1. 기초 공사

**4. 타입 정의**
- 모든 구현의 기준이 되는 타입을 가장 먼저
- **이유**: 모든 코드의 기반

**5. API 함수**
- 백엔드 API 준비됐으면 호출 함수 작성 (없으면 생략)
- **이유**: Hook/컴포넌트 구현 시 데이터 흐름 명확히

**6. 단위 모듈 또는 가장 작은 컴포넌트 마크업 (Unit Level)**
- **특징**: 로직 없이 마크업만 있거나, 외부 의존성 없는 순수 함수. (유닛 테스트 가능)
- **작업 대상**:
  1. 공통 UI 컴포넌트 (도메인 비종속. 예: `Button`)
  2. 도메인 기초 UI 컴포넌트 (도메인 종속. 예: `BoardCard`)
  3. 유틸리티/포매팅 함수 (도메인 비종속, 예: `formatDate`)
  4. 상수 (도메인 종속, 예: `BOARD_FILTER_TYPES`)
  5. **상태별 UI** (Empty, Loading, Error 상태 등 마크업 미리 구현)
- **[중요] 작업 우선순위 (Dependency Order)**:
  - 의존성 관리를 위해 **도메인에 종속되지 않는 공통 모듈(Common Type/Component/Utils)**을 가장 먼저 작업하세요.
  - 그 후에 이를 사용하는 **특정 도메인에 종속되는 모듈**을 작업해야 합니다.

### Phase 2. 통합

**7. Mock 기반 통합**
- Mock API로 더미 데이터 반환
- Hook 구현 (useQuery 등)
- 페이지 조립 (단위 컴포넌트 조합)

### Phase 3. 연동

**8. 실제 API 연동**
- Mock → 실제 API 교체
- 에러 처리 (4xx, 5xx → ErrorComponent)
- 엣지 케이스 (빈 데이터 → EmptyContent)

---

## [CRITICAL] 구현 진행 방식

**⚠️ 한번에 모든 Phase를 구현하지 마세요!**

**추천 방식**:
1. Phase 단위로 나눠서 진행
   - 예: Phase 0 (사전작업) → Phase 1 (기초공사) → Phase 2 (통합) → Phase 3 (연동)
2. 첫 Phase만 먼저 구현
3. 구현 완료 후 사용자 리뷰
4. 다음 Phase 구현 반복

**이유**:
- 한번에 모두 구현하면 중간에 문제 발견 시 많은 코드를 수정해야 함
- Phase별로 리뷰하면 문제를 빠르게 발견하고 수정 가능

---

## 최종 검토 체크리스트

- [ ] `/plan/overview.md`의 모든 핵심 기능이 구현되었는지 확인
- [ ] 누락된 기능이 있다면 추가 구현

---

## [사용자 안내] Gemini로 코드 품질 검증

**커밋 작성이 완료되면, Gemini CLI를 활용하여 다음 검증을 수행하세요:**

### 1. 테스트 스크립트 실행 및 오류 해결
- `package.json`에서 test 스크립트 (lint, tsc, type-check 등)를 찾아서 실행
- 발견된 오류를 모두 해결

### 2. 컨벤션 준수 확인
- `instructions/conventions/README.md`를 참고하여 이번에 추가된 커밋들이 컨벤션을 준수하는지 확인
- 위반 사항이 있으면 수정

### 3. 주석 최소화 (Comment Refactoring)
- `//` 또는 `/*`로 검색하여 프로젝트 내 모든 주석을 찾기
- 주석을 제거하고 더 직관적인 코드로 리팩토링할 수 있는지 검토
- **원칙**: 코드만 읽고 이해할 수 있다면 주석은 불필요
