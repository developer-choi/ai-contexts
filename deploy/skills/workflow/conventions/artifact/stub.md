# Stub 코드 컨벤션

## 정의·범위

stub = PR 골조 코드. 구현이 본문만 채울 수 있도록 시그니처·구조·결정 사항을 미리 박은 코드.

두 원칙:

1. **PR이 만들 모든 파일·함수·컴포넌트는 stub 필수** — 외부 공개 여부 무관. 내부 헬퍼도 시그니처 + `throw new Error('not implemented')`. 컴포넌트는 아래 「`.tsx`」 양식을 따른다
2. **코드로 표현 가능한 결정은 모두 stub에 박는다** — 의존성 추가(`package.json` + 설치)·설정 파일도 든다. 코드 분량이 크거나 한글 명세가 더 명확하면 `// TODO [AI_IMPL]:` 주석에 한글 요약

### 마크업 예외

마크업의 stub 처리는 두 종류로 갈린다.

- **페이지 마크업** (페이지 단위 `.tsx` 시각 구조·`.module.scss`): MARKUP 세션이 디자인 원본 대조 지적 0건으로 완성한 뒤 **검증본 그대로 PR로 가져온다** — realize-plan 전면 stub 대상이 아니다.
- **공통 지정 컴포넌트** (MARKUP이 [공통 컴포넌트 확정](../../steps/markup/index.md#공통-컴포넌트-확정)으로 추출한 재사용 단위): PR이 **껍데기(위치·이름·시그니처·props)를 realize-plan stub으로 노출**한다.
  - 시각 본문(CSS 수치·HTML 구조)은 MARKUP에서 **이동**한다.
  - props도 PR 소유다(MARKUP props는 임시값). realize-plan stub 공표 후엔 다운스트림 계약이라 freeze.

PR 로직은 가져온 페이지 마크업 파일을 수정하지 않고 **별도 파일**(hook·컨테이너)에서 import·합성한다. realize-plan의 stub 대상은 그 **로직**(hook·test·type·fixture·컨테이너) + **공통 지정 컴포넌트의 껍데기**다.

### 내부 헬퍼 예시

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
  // TODO [AI_IMPL]: cursor null이면 첫 페이지(0~20), 아니면 cursor 위치+1부터 20개 — plan/pr{N}/persistent/decisions.md:{line}
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
- 조건은 placeholder 변수 (`const isLoading = false; // TODO [AI_IMPL]: 로딩 상태 — useUserQuery isLoading 결합 — plan/pr{N}/persistent/decisions.md:{line}`)
- 외부 공개 prop이 HTML 표준 속성의 별칭이면 래퍼 prop을 만들지 않고 `ComponentProps<'element'>`를 extend해 그 속성을 직접 노출한다(필수로 받아야 하면 필수로 override)

### Hook · 라우트 파일(`page.tsx` 등)

- 시그니처 + 처리 순서 주석(무엇을 받아 → 무엇을 호출하고 → 무엇을 반환하는지) + placeholder 변수 + `throw new Error('not implemented')`
- 결정된 사항(useMutation 사용, API endpoint 등)은 코드로 적음

### `*.test.tsx`

- `describe` + `it.todo('IMPL이 아래 주석을 보고 MP 테스트 작성 가이드에 맞게 이름을 짓고, it(...)로 바꾸면 이 주석은 지운다', () => { /* 주석 */ })`
- 이름은 PLAN이 짓지 않는다. 이름 자리에는 위 문구를 그대로 쓰고, 콜백 안 주석에 무엇을 검증하는지 적는다
- 주석은 이 PR을 모르는 사람이 이 파일만 보고 조건·조작·기대 결과를 알 수 있게 풍부하게 쓴다. 「위와 같다」처럼 다른 주석을 가리키지 않고 주석 하나만 읽어도 알게 쓴다
- 데이터에 따라 보였다 안 보였다 하는 것은 「있으면 보인다」와 「없으면 안 보인다」를 각각 하나씩 만든다(이유는 MP `docs/patterns/testing/TestsWeAvoid.md` 「받은 값을 화면에 그대로 보여 준다」)
- Jest 레포는 `it.todo`에 콜백을 넘기면 에러가 나므로, 같은 주석을 `it.todo` 바로 위에 두고 콜백은 넘기지 않는다

### Fixture

- 프로젝트 컨벤션이 정한 위치에 두고, 마크업이 아니라 로직 쪽으로 분류한다(API 응답 mock이다)
- test 파일은 import만

### 파일 분리 단위

- 분리 단위는 프로젝트 컨벤션
- 컨벤션 부재 시 사용자 질문

## 정리

stub 커밋 뒤에 구현 커밋(IMPL에서든 realize-plan에서든)이 따로 쌓여 stub의 `not implemented`·`TODO [AI_IMPL]`·`it.todo` 자리를 채웠으면 케이스 A, 그런 구현 커밋 없이 stub 커밋 하나에 구현까지 들어 있으면 케이스 B다.

어느 케이스든 계획 변경으로 안 쓰게 된 stub 파일은 지운다.

### 케이스 A — 구현 커밋이 따로 쌓임

stub 커밋을 파일별로 나눠, 각 조각을 그 파일을 처음 고친 구현 커밋 바로 앞에 두고 그 구현 커밋과 합친다(메시지는 구현 커밋 것). type·fixture·설정처럼 구현 커밋이 고치지 않은 조각은 첫 구현 커밋과 합친다.

### 케이스 B — stub 커밋 하나에 구현까지 들어 있음

soft reset으로 풀어 슬라이스별 재분할.
