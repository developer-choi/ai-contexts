# Stub 코드 컨벤션

PR 골조 코드(stub)의 정의·범위·양식·라이프사이클 단일 출처. 생성·보존·비판적 검토·정리 단계 모두 본 컨벤션 참조.

## 정의·범위

stub = PR 골조 코드. IMPL이 본문만 채울 수 있도록 시그니처·구조·결정 사항을 미리 박은 코드.

두 원칙:

1. **PR이 만들 모든 파일·함수·컴포넌트는 stub 필수** — 외부 공개 여부 무관. 내부 헬퍼·내부 컴포넌트도 시그니처 + `throw new Error('not implemented')`
2. **코드로 표현 가능한 결정은 모두 stub에 박는다** — 결정·코드 표현 가능 → 별도 narrative가 아닌 stub 코드. 코드 분량 크거나 한글 명세가 더 명확하면 `// TODO [AI_IMPL]:` 주석에 한글 요약

**마크업 예외 (재정의)**: 마크업의 stub 처리는 두 갈래로 갈린다 — 삭제가 아니라 재정의다.

- **페이지 마크업** (페이지 단위 `.tsx` 시각 구조·`.module.scss`): MARKUP 세션이 figma 0건으로 완성한 뒤 **검증본 그대로 PR로 가져온다**(재작성 X) — step-4 전면 stub 대상이 아니다.
- **공통 지정 컴포넌트** (MARKUP이 [markup/index.md](../session/markup/index.md) 「공통 컴포넌트 확정」으로 추출한 재사용 단위): PR이 **껍데기(위치·이름·시그니처·props)를 step-4 stub으로 노출**한다 — 다운스트림 PR이 그 시그니처에 기대어 병렬화하기 위함. 시각 본문(CSS 수치·HTML 구조)은 MARKUP에서 **이동**한다(재작성 금지). props도 PR 소유이되(MARKUP props는 임시 비계), step-4 stub 공표 후엔 다운스트림 계약이라 freeze.

PR 로직은 가져온 페이지 마크업 파일을 수정하지 않고 **별도 파일**(hook·컨테이너)에서 import·합성한다. step-4의 stub 대상은 그 **로직**(hook·test·type·fixture·컨테이너) + **공통 지정 컴포넌트의 껍데기**다.

### 함수 호출 그래프 예시

```ts
export function add(a: unknown, b: unknown) {
  throw new Error('not implemented');
}

function validateAdd(a: unknown, b: unknown) {  // 내부 헬퍼도 시그니처 + throw 필수
  throw new TypeError('a 또는 b가 number가 아니에요');
}
```

### 한글 요약 주석 예시

```ts
export function paginate<T>(items: T[], cursor: string | null) {
  // TODO [AI_IMPL]: cursor null이면 첫 페이지(0~20), 아니면 cursor 위치+1부터 20개
  throw new Error('not implemented');
}
```

### 외부 의존성 type stub

```ts
// 백엔드 응답 형상 가정 (합의 전 임시)
export type UserListResponse = {
  data: User[];
  cursor: string | null;
};
```

## 디폴트 — 미정 항목 처리

결정 미정 영역은 placeholder + 마커만 두고 구현 단계로 미룬다.

페이지 routing(Next.js app router)만 예외다 — `page.tsx`/`layout.tsx`/`loading.tsx`/`error.tsx`는 미정이어도 항상 stub을 만든다.

## 양식

### 주석

[comments.md](./comments.md) 단일 출처 참조.

### `.tsx`

- Props 타입 + 컴포넌트 선언
- 합성 안 하면 `return null` (leaf)
- 합성하면 트리 골조 + 조건부 렌더링 골조
- 조건은 placeholder 변수 (`const isLoading = false; // TODO [AI_IMPL]: 로딩 상태 — useUserQuery isLoading 결합`)
- 책임 설명은 함수명 충분하면 생략, 아니면 1줄 JSDoc

### Hook · 페이지

- 시그니처 + Flow 주석 + placeholder 변수 + `throw new Error('not implemented')`
- 결정된 사항(useMutation 사용, API endpoint 등)은 코드로 적음

### `*.test.tsx`

- `describe + it.todo('한 줄 자연어')`

### Fixture

- 컨벤션 위치, **logic 영역 분류** (mock = API 응답)
- test 파일은 import만

### 파일 분리 단위

- 분리 단위는 프로젝트 컨벤션
- 컨벤션 부재 시 사용자 질문 (디폴트 안 박음)

## 라이프사이클

### 생성

- 주석은 [comments.md](./comments.md) 「라이프사이클 > 생성」 적용

### 보존

- stub 커밋이 base 위에 쌓여 있음. 사용자 리뷰까지 보존
- Lead가 stub 파일들을 탐색·분류해서 Implementer에게 컨텍스트 주입. Implementer가 직접 탐색 X
- stub→IMPL 변환 diff를 사용자가 리뷰할 수 있어야 함 → 보존 단계 안에서 squash 금지

### 비판적 검토

구현 진입 시 stub 결정·구조를 무비판 수용하지 않고 비판적으로 검토. 더 나은 방법·문제 발견 시 사용자에게 보고.

### 정리

사용자 리뷰·동작 테스트 통과 후 stub 커밋을 정리한다 (history를 다시 쓰는 작업).

케이스 분기:

#### 케이스 A — stub이 빈 껍데기

stub 파일에 TODO 마커 + 빈 본문만. 슬라이스별 IMPL 커밋이 본문을 다 가짐. stub 커밋을 drop하고 슬라이스별 IMPL에 리뷰 수정을 합친다.

#### 케이스 B — stub이 본문 안고 있음

stub 생성 단계에서 사용자가 검토 후 본문까지 채워 사실상 단일 IMPL 커밋. soft reset으로 풀어 슬라이스별 재분할.

stub만 만들고 구현에서 한 번도 건드리지 않은 파일(계획 변경으로 사용 안 된 utility stub 등)은 재분할 대상에서 빼 사라지게 둔다 — 의도된 정리.

정리 완료 후 사용자에게 force-push를 요청한다.
