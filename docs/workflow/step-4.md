# Step 4: 커밋 시퀀스(작업 계획) 작성

이 단계는 `/plan/overview.md`를 달성하기 위한 구체적인 **커밋 단위 작업 계획**을 수립하는 단계입니다.
- 상세한 구현 로직(엣지 케이스 등)보다는 **전체적인 작업 흐름과 커밋 순서**를 확정하는 것이 목표입니다.
- AI가 구현할 때 **작은 단위로, 순차적으로** 진행할 수 있도록 로드맵을 그려주세요.
- 작은 커밋을 순서 잘 맞춰서 쌓아야 리뷰하기도 편합니다.

## 작성 양식 (`/plan/commit-sequence.md`)

### 0. 참고 자료 (References)
- `/plan/background.md`
- `/plan/codebase-audit.md`
- `/plan/overview.md`

### 1. 커밋 리스트
**형식**:
```markdown
- [커밋 타입]: 커밋 메시지 (3줄 미만 요약)
  - 상세 작업 내용 1
  - 상세 작업 내용 2
  - **예상 난관**: 이 커밋에서 마주칠 수 있는 기술적 이슈 (선택적)
```

**예상 난관 작성 지침**:
- 모든 커밋에 작성할 필요는 없음 (기술적으로 까다로운 커밋만)
- 예: "브라우저별 Intersection Observer API 동작 차이", "타입 추론 충돌 가능성"
- 예: "useEffect 의존성 배열 최적화 필요", "메모리 누수 방지를 위한 cleanup 필수"

## 커밋 순서 가이드

다음 순서로 커밋을 쌓는 것을 권장합니다. 더 좋은 순서가 있다면 사용자에게 제안하세요.

### Phase 0. 사전 작업 (Conflict 방지)
**1. 레거시 처리 (`deprecated`)**
- 기존 모듈을 대체해야 한다면, 바로 삭제하지 말고 `@deprecated` 처리부터 먼저 커밋합니다.
- 방법: 모듈명에 `Deprecated` 접두사 추가, JSDoc에 `@deprecated` 명시.

```typescript
/**
 * @deprecated 이런 이유로 앞으로 사용되지 않으며, [파일 경로]/[파일명] 모듈을 대신 사용해야합니다.
 */
function deprecatedSomeFunction() {}
```

**2. 기존 코드 리팩토링 (Conflict 방지)**
- 기존 함수나 컴포넌트의 구조 변경(파라미터 타입 변경 등)이 필요하다면, 새 기능 구현 전에 먼저 수정합니다.
- **이유**: 기능 구현 후 나중에 기존 코드를 건드리면 Rebase 시 충돌(Conflict)이 심하게 발생합니다.
    ```typescript
    // Before: 숫자만 지원
    function add(a: number, c: number) {}

    // After: 배열 지원 (기능 구현 전 미리 변경)
    function add(a: number[]) {}
    ```

**3. 파일 크기 관리 (사전 분리)**
- 기존 파일에 많은 코드를 추가해야 하는 경우, **먼저 기존 코드를 분리/리팩토링**하는 커밋을 만듭니다.
- **감지 기준**:
  - 기존 파일이 이미 크기(예: 150줄 이상)이고
  - 새 기능 추가 시 코드가 증가할 것으로 예상되는 경우
- **대응 순서**:
  1. 첫 번째 커밋: 기존 코드를 여러 파일로 분리 (리팩토링)
  2. 두 번째 커밋: 새 기능 추가
- **효과**: 각 커밋의 diff가 작아져서 코드 리뷰가 쉬워집니다.
- **예시**:
    ```
    ❌ Bad (1개 커밋, diff 200줄)
    UserPage.tsx (기존 200줄) → 새 기능 추가로 400줄

    ✅ Good (2개 커밋, 각 diff 관리 가능)
    커밋 1 [refactor]: UserPage.tsx 분리
      - UserPage.tsx → UserPage.tsx + UserProfile.tsx + UserActions.tsx
      - 기존 기능은 그대로, 구조만 정리

    커밋 2 [feat]: 새 기능 추가
      - UserActions.tsx에 새 액션 추가 (diff 50줄)
    ```

### Phase 1. 기초 공사 (Foundation)
**4. 타입(Type) 정의**
- 모든 구현의 기준이 되는 타입 파일을 가장 먼저 커밋합니다.
- **이유**: 컴포넌트, 함수 등 모든 코드의 기반이 되므로 가장 먼저 확정되어야 작업 순서가 깔끔해집니다.

**5. API 호출 함수 (API Client)**
- **특징**: 프론트 개발 시작했는데, 이미 백엔드 API 개발이 완료된 경우, 실제 데이터를 주고받는 함수를 작성합니다.
- (만약 API가 개발되지않았다면 이 단계는 건너뜁니다.)
- **이유**: 타입을 기반으로 API 함수를 미리 정의해두면, 이후 Hooks나 컴포넌트 구현 시 데이터 흐름을 명확히 파악하며 작업할 수 있습니다. (API가 이미 있다면 굳이 Mock을 만들지 않고 이 단계에서 바로 연동 준비를 합니다.)
- **작업 대상**: `axios` 또는 `fetch`를 사용하는 API 서비스 함수

```typescript
export interface BoardListApiRequest {
  page: number;
}

export interface BoardListApiResponse {
  list: Board[];
}

export async function getBoardListApi(request: BoardListApiRequest): BoardListApiResponse {
  return fetch('/path', request);
}
```

**6. 단위 모듈 또는 가장 작은 컴포넌트 마크업 (Unit Level)**
- **특징**: 로직 없이 마크업만 있거나, 외부 의존성 없는 순수 함수. (유닛 테스트 가능)
- **작업 대상**:
  1. 공통 UI 컴포넌트 (도메인 비종속. 예: `Button`)
  2. 도메인 기초 UI 컴포넌트 (도메인 종속. 예: `BoardCard`)
  3. 유틸리티/포매팅 함수 (도메인 비종속, 예: `formatDate`)
  4. 상수 (도메인 종속, 예: `BOARD_FILTER_TYPES`)
  5. **상태별 UI** (Empty, Loading, Error 상태 등 마크업 미리 구현)
- **예시 (게시글 리스트 페이지)**:
  - `BoardCard` 컴포넌트 마크업 먼저 구현.
  - 게시글이 없을 때 보여줄 `EmptyContent` 컴포넌트 미리 구현.
  - 리스트/상세 등에서 공통으로 쓸 날짜 포매팅 함수 구현.
  - **효과**: 이렇게 엣지 케이스용 컴포넌트까지 미리 만들어두면, 나중에 API 연동 시 로직에만 집중할 수 있어 커밋이 깔끔해집니다.
- **[중요] 작업 우선순위 (Dependency Order)**:
  - 의존성 관리를 위해 **도메인에 종속되지 않는 공통 모듈(Common Type/Component/Utils)**을 가장 먼저 작업하세요.
  - 그 후에 이를 사용하는 **특정 도메인에 종속되는 모듈**을 작업해야 합니다.

### Phase 2. 통합 및 연동 준비 (Integration Level)
**7. 더미(Mock) 기반 통합 구현**
- **특징**: 실제 API 연동 전이거나, API 호출 함수를 아직 만들지 않은 경우 UI 흐름과 상호작용이 동작하도록 합니다. (통합 테스트 가능)
- **작업 대상**:
  1. **Mock API**: (필요 시) 항상 성공하거나 실패하는 더미 데이터를 반환하는 함수 구현.
  2. **Hooks**: 더미 데이터 / 더미콜백을 사용하는 `useQuery`나 폼 핸들러(`useForm`) 구현.
  3. **페이지/컨테이너 조립**: 앞서 만든 단위 컴포넌트들을 조합하여 페이지 완성.
  4. **유효성 검증**: 진입 시점의 데이터 검증 로직 구현.

### Phase 3. 실전 배치 (Implementation)
**8. API 연동 및 엣지 케이스 완성**
- **작업 대상**:
  1. Mock API를 **실제 API 호출**로 교체.
  2. 더미 데이터 제거.
  3. **API 에러 대응**: 4xx, 5xx 에러 발생 시 UI 처리 (Phase 1에서 만든 UI 활용).
  4. **성공/실패 분기 처리**: 데이터 유무에 따른 Empty 컴포넌트 노출 로직 연결.
- **예시**:
  - **성공**: 기존 더미 데이터 로직을 실제 API 응답으로 교체.
  - **실패**: API 실패 시(500 error), 이전에 만든 `ErrorComponent` 노출.
  - **엣지**: 리스트가 비어있을 경우, 이전에 만든 `EmptyContent` 노출.

---

## 최종 검토 체크리스트

- [ ] `/plan/overview.md`의 모든 핵심 기능이 커밋 계획에 포함되었는지 확인
- [ ] 누락된 기능이 있다면 즉시 커밋 추가