# Pagination with Filter & Sort & Search

## 두 가지 방식 — URL vs onClick

페이지네이션 상태(page, filter, sort)를 **URL에 넣거나 스토어에 넣거나, 반드시 택1**해야 한다. 두 방식을 혼합하면 filter/sort 변경 + page 1 이동이 각각 렌더링을 유발해 API가 2번 호출되는 버그가 발생한다.

| 방식 | 사용 시점 | 구현 핵심 |
|---|---|---|
| URL 방식 | 게시글이 페이지 **메인 컨텐츠**인 경우 (url에 page·filter·sort 포함) | `<Link href={...}>` |
| onClick 방식 | 게시글이 페이지 **서브 컨텐츠**인 경우 (url에 노출 불필요) | `<a onClick={...}>` + store |

## URL 방식

페이지네이션 UI를 모두 `<Link>`로 만든다. `useRouter().push()`를 사용하지 않는다.

```tsx
<Link
  href={buildHref({ page: targetPage })}
  prefetch={false}
  scroll={true} // 기본값 — 상단으로 스크롤
>
  {label}
</Link>
```

### href 생성 규칙

- 현재 쿼리스트링을 **전부 복원**하되 page 값만 교체한다.
- 배열 쿼리스트링도 그대로 복원해야 한다.
- page 쿼리스트링 키는 기본값 `page`이지만, 한 페이지에 페이지네이션이 2개 이상 올 경우를 위해 커스텀 가능하게 열어둔다 (예: `aPage`, `bPage`).

### Server/Client Component 모두 지원

URL 방식에서 현재 쿼리스트링을 읽어 page만 덮어쓸 때 `useSearchParams()`를 사용하지 않는다. 그러면 컴포넌트가 강제로 Client Component가 된다.

Server Component에서도 동작하려면 `searchParams` prop을 받아 처리한다.

### pre-build 지원

정적 생성이 가능한 경우 `/event/list/[page]` path segment 방식으로 pre-build할 수 있다.

정적 생성이 불가능한 경우 `/event/list?page=1&sort=...` 쿼리스트링 방식을 사용한다. path와 쿼리스트링을 혼용하지 않는다.

## onClick 방식

드문 케이스 — 서브 컨텐츠 페이지네이션. URL에 상태가 없으므로 `<a>` + onClick으로 스토어의 page·filter·sort를 업데이트한다.

## 요구조건

- filter·검색·정렬 변경 시 **1페이지로 이동**해야 한다.
- 페이지 이동 시 **테이블 헤더로 스크롤이 이동**되어야 한다.
- 페이지 이동 불가 시 현재 페이지를 유지한다 (disabled 상태).

## pagination util — 계산 로직 분리

컴포넌트에서 UI 렌더링에만 집중할 수 있도록, 계산 로직을 별도 util로 분리한다.

5가지 페이지 요소(first, previous, next, last, pages) 각각에 대해 계산한다:

```ts
type PageElementState = {
  page: number;      // 이동할 페이지 번호
  disabled: boolean; // 이동 불가 여부 (현재 페이지로 설정하여 예외처리)
  active: boolean;   // 현재 페이지 여부
};
```

## PageElement 컴포넌트

```tsx
// URL 모드
<Link href={buildHref({ page: elementState.page })}>...</Link>

// onClick 모드
<a onClick={() => onPageChange(elementState.page)}>...</a>
```

- `disabled` / `active` 두 클래스명으로 스타일링을 제어한다.
- state prop: `'active' | 'disabled' | 'default'`
