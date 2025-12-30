# Step 4: 커밋 시퀀스(작업 계획) 작성 요청
이 단계는 `/plan/overview.md`를 달성하기 위한 구체적인 **커밋 단위 작업 계획**을 수립하는 단계입니다.
- 상세한 구현 로직(엣지 케이스 등)보다는 **전체적인 작업 흐름과 커밋 순서**를 확정하는 것이 목표입니다.
- AI가 구현할 때 **작은 단위로, 순차적으로** 진행할 수 있도록 로드맵을 그려주세요.
- 작은 커밋을 순서 잘 맞춰서 쌓아야 리뷰하기도 편합니다.

# 참고 자료
- `/plan/background.md` (Step 1에서 생성됨)
- `/plan/overview.md` (Step 3에서 생성됨)

## 작성 양식 (`/plan/commit-sequence.md`)
**형식**:
> - [커밋 타입]: 커밋 메시지 (3줄 미만 요약)
>   - 상세 작업 내용 1
>   - 상세 작업 내용 2

## 커밋 순서 가이드 (Thinking Process)
저는 충돌을 방지하기 위해 아래의 **프로세스**를 선호합니다.

커밋 계획 작성 시 아래 흐름을 따라주세요.

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

**2. 기존 코드 리팩토링**
- 기존 함수나 컴포넌트의 구조 변경(파라미터 타입 변경 등)이 필요하다면, 새 기능 구현 전에 먼저 수정합니다.
- **이유**: 기능 구현 후 나중에 기존 코드를 건드리면 Rebase 시 충돌(Conflict)이 심하게 발생합니다.
    ```typescript
    // Before: 숫자만 지원
    function add(a: number, c: number) {}

    // After: 배열 지원 (기능 구현 전 미리 변경)
    function add(a: number[]) {}
    ```

### Phase 1. 기초 공사 (Foundation)
**3. 타입(Type) 정의**
- 모든 구현의 기준이 되는 타입 파일을 가장 먼저 커밋합니다.
- **이유**: 컴포넌트, 함수 등 모든 코드의 기반이 되므로 가장 먼저 확정되어야 작업 순서가 깔끔해집니다.

**4. API 호출 함수 (API Client)**
- **특징**: API 명세가 확정되었거나 서버 개발이 완료된 경우, 실제 데이터를 주고받는 함수를 작성합니다.
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

**5. 단위 모듈 및 마크업 (Unit Level)**
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
**6. 더미(Mock) 기반 통합 구현**
- **특징**: 실제 API 연동 전이거나, API 호출 함수(Step 4)를 아직 만들지 않은 경우 UI 흐름과 상호작용이 동작하도록 합니다. (통합 테스트 가능)
- **작업 대상**:
  1. **Mock API**: (필요 시) 항상 성공하거나 실패하는 더미 데이터를 반환하는 함수 구현.
  2. **Hooks**: 더미 데이터 / 더미콜백을 사용하는 `useQuery`나 폼 핸들러(`useForm`) 구현.
  3. **페이지/컨테이너 조립**: 앞서 만든 단위 컴포넌트들을 조합하여 페이지 완성.
  4. **유효성 검증**: 진입 시점의 데이터 검증 로직 구현.

### Phase 3. 실전 배치 (Implementation)
**7. API 연동 및 엣지 케이스 완성**
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

## [CRITICAL] 최종 검토: 커밋 누락 확인
`/plan/commit-sequence.md` 작성이 완료되면, 반드시 다음을 수행하세요.

1. **대조 점검**: Step 3에서 작성한 `/plan/overview.md`의 **핵심 기능 목록**을 펼쳐놓습니다.
2. **범위 확인**: 계획된 커밋들을 모두 실행했을 때, `overview.md`에 명시된 모든 기능이 빠짐없이 구현되는지 하나씩 체크합니다.
3. **누락 보완**: 특정 기능을 구현하기 위한 커밋이 빠져있다면 즉시 추가하세요. 누락된게 있으면 안됩니다.