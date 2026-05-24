# Stub 코드 컨벤션

PR 골조 코드(stub)의 정의·범위·양식·라이프사이클 단일 출처. 생성·보존·비판적 검토·정리 단계 모두 본 컨벤션 참조.

## 정의·범위

stub = PR 골조 코드. IMPL이 본문만 채울 수 있도록 시그니처·구조·결정 사항을 미리 박은 코드.

두 원칙:

1. **PR이 만들 모든 파일·함수·컴포넌트는 stub 필수** — 외부 공개 여부 무관. 내부 헬퍼·내부 컴포넌트도 시그니처 + `throw new Error('not implemented')`
2. **코드로 표현 가능한 결정은 모두 stub에 박는다** — 결정·코드 표현 가능 → 별도 narrative가 아닌 stub 코드. 코드 분량 크거나 한글 명세가 더 명확하면 `// TODO [AI_IMPL]:` 주석에 한글 요약

### 컴포넌트 트리 예시

```tsx
// page.tsx
export function UsersPage() {
  return (
    <>
      <Header />
      <Body />
      <Footer />
    </>
  );
}

// Header.tsx — 내부 컴포넌트도 stub 필수
export function Header() {
  throw new Error('not implemented');
}
```

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

step-4 vs step-5 경계의 항목별 매핑·점검은 scw/specialized/workflow.md 「step-4 vs step-5 코드 작성 경계」 참조.

## 디폴트 — 미정 항목 처리

결정 미정 영역은 placeholder + 마커만 두고 구현 단계로 미룬다.

| 케이스 | stub 처리 |
|---|---|
| `useEffect` | 의존성·정리 함수 결정됐으면 시그니처 + `[stub]`. 미결이면 사용자 질문 |
| Context Provider | 트리 위치·value 타입 결정됐으면 stub. 미결이면 사용자 질문 → 결정 후 stub. 결정 못 하면 placeholder + `// TODO [AI_IMPL]:` |
| 페이지 routing (Next.js app router) | `page.tsx`/`layout.tsx`/`loading.tsx`/`error.tsx` 항상 stub 생성 |
| Server Component vs Client | `'use client'` 결정됐으면 명시. 미결이면 사용자 질문 |
| 외부 라이브러리 호출 | API 메서드 결정됐으면 import + 호출 stub. 미결이면 placeholder 변수 |

## 양식

### 주석

[comments.md](./comments.md) 단일 출처 참조. 상단 출처 블록·인라인 마커·라이프사이클·게이트 모두 거기.

### `.tsx`

- Props 타입 + 컴포넌트 선언
- 합성 안 하면 `return null` (leaf)
- 합성하면 트리 골조 + 조건부 렌더링 골조
- 조건은 placeholder 변수 (`const isLoading = false; // TODO [AI_IMPL]: 로딩 상태 — useUserQuery isLoading 결합`)
- 책임 설명은 함수명 충분하면 생략, 아니면 1줄 JSDoc

### `.module.scss`

- 빈 파일이라도 같이 생성 (lint·import 통과)
- **layout 구조 속성만 PLAN** — 컴포넌트 의도 표현 속성
- **디자인 값 속성은 PLAN 금지** — raw 값·토큰 변수 둘 다 금지. IMPL이 markup.md 체크리스트로 채움

| 분류 | 예시 속성 | PLAN |
|---|---|---|
| **layout 구조** | `display`, `flex`, `flex-direction`, `flex-shrink`, `flex-grow`, `grid`, `grid-template-columns/rows`, `position`, `align-items`, `justify-content`, `align-self`, `justify-self`, `min-width`, `max-width`, `width: auto`, `overflow`, `white-space`, `text-align`, `box-sizing` | ✓ |
| **디자인 값** | `color`, `background`, `padding`, `margin`, `gap`, `border`, `border-radius`, `box-shadow`, `font-size`, `font-weight`, `line-height`, 구체적 `width`/`height` (px·rem) | ❌ |

```scss
// ✓ Good
.row {
  display: flex;
  align-items: center;
  // TODO [AI_IMPL]: gap 토큰 매핑 — markup.md "IMPL 시점 Figma 확인 체크리스트 > X.module.scss"
}

// ❌ Bad — raw 값
.row { display: flex; gap: 16px; }

// ❌ Bad — 추측 토큰
.row { display: flex; gap: var(--semantic-gap-lg); }
```

### Hook · 페이지

- 시그니처 + Flow 주석 + placeholder 변수 + `throw new Error('not implemented')`
- 결정된 사항(useMutation 사용, API endpoint 등)은 코드로 적음

### `*.test.tsx`

- `describe + it.todo('한 줄 자연어')`
- 위치·중첩 깊이는 프로젝트 컨벤션

### Fixture

- 컨벤션 위치, **logic 영역 분류** (mock = API 응답)
- test 파일은 import만

### 파일 분리 단위

- PR이 만들 모든 파일을 stub으로 생성
- 분리 단위는 프로젝트 컨벤션
- 컨벤션 부재 시 사용자 질문 (디폴트 안 박음)

## 라이프사이클

### 생성

- 위 양식·디폴트로 stub 파일 생성
- 주석은 [comments.md](./comments.md) 「라이프사이클 > 생성」 적용

### 보존

- stub 커밋이 base 위에 쌓여 있음. 사용자 리뷰까지 보존
- Lead가 stub 파일들을 탐색·분류해서 Implementer에게 컨텍스트 주입. Implementer가 직접 탐색 X
- stub→IMPL 변환 diff를 사용자가 리뷰할 수 있어야 함 → 보존 단계 안에서 squash 금지

### 비판적 검토

stub 코드는 SKILL.md [CRITICAL] 「입력 산출물 비판적 검토」 메타 룰 적용 대상. 구현 진입 시 stub 결정·구조를 무비판 수용하지 않고 비판적으로 검토. 더 나은 방법·문제 발견 시 사용자에게 보고.

### 정리

사용자 리뷰·동작 테스트 통과 후 stub 커밋을 정리. history rewriting을 동반하므로 [commits.md](../commits.md) 「history rewriting 안전 절차」 적용.

케이스 분기:

#### 케이스 A — stub이 빈 껍데기

stub 파일에 TODO 마커 + 빈 본문만. 슬라이스별 IMPL 커밋이 본문을 다 가짐.

```
git rebase -i <stub 직전 커밋>   # stub drop, 슬라이스별 IMPL + 리뷰 수정은 fixup squash
```

비대화형 환경(claude code 등 `git rebase -i` 불가) → 케이스 B 방식 그대로 적용해도 결과 동일.

#### 케이스 B — stub이 본문 안고 있음

stub 생성 단계에서 사용자가 검토 후 본문까지 채워 사실상 단일 IMPL 커밋. soft reset으로 풀어 슬라이스별 재분할.

```
git reset --soft <stub 직전 커밋>     # stub부터 마지막 리뷰 수정까지 staged
git reset HEAD                        # 모두 unstage
git add <슬라이스 1 파일들>
git commit -m "<슬라이스 1 메시지>"
git add <슬라이스 2 파일들>
git commit -m "<슬라이스 2 메시지>"
```

커밋 메시지 양식은 [commits.md](../commits.md) 「슬라이스 분할 정리 예시」 참조.

stub만 만들고 구현에서 한 번도 건드리지 않은 파일(계획 변경으로 사용 안 된 utility stub 등)은 add 안 하면 자동으로 사라짐 — 의도된 정리.

정리 완료 후 [commits.md](../commits.md) 「force-push 요청 보고 양식」 적용.
