# Next.js Routes Overview

본인 학습 자료 + TODO. App Router 라우팅 전반.

## References

- [Linking and Navigating](https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating) — 지금 당장 안 중요하지만 다 읽어봐야 하는 링크임.
- [Server-Centric Routing with Client-side Navigation](https://nextjs.org/docs/app/building-your-application/routing#server-centric-routing-with-client-side-navigation) — 정말 너무 엄청나게 중요한 내용인 거 같고 라우팅의 내부 동작을 자세히 알려주는 거 같고 단어 하나도 안 놓치고 깊게 봐야 하는 문단인 거 같은데 (연결된 링크까지 다 봐야 하는데) 영어가 하나도 해석이 안 됨.
- [Nextjs Caching 모든 종류](https://nextjs.org/docs/app/building-your-application/caching)
- [next-13.4: zero-setup-use-the-filesystem-as-an-api](https://nextjs.org/blog/next-13-4#zero-setup-use-the-filesystem-as-an-api) — 좀 아랫부분부터 시작
- [next-13#layouts](https://nextjs.org/blog/next-13#layouts)

## Server Component / Layout (on server) 요약

### Server Component

`params` / `searchParams`는 가져올 수 있지만, `origin`, `pathname`은 가져올 수 없음. (간접적으로 가져올 수는 있긴 함)

### Layout

[Layouts do not receive searchParams](https://nextjs.org/docs/app/api-reference/file-conventions/layout#layouts-do-not-receive-searchparams)

(server side에서) `params`는 가져올 수 있지만, `searchParams`, `pathname`은 못 가져옴. (우회해서 가져올 수는 있지만 찝찝하고 완벽하지 못함)

그 대신 Client Side에서는 [`useSelectedLayoutSegment()`](https://nextjs.org/docs/app/api-reference/functions/use-selected-layout-segment) 이런 게 있긴 함.

### Streaming

> However, it can still be slow as all data fetching on server needs to be completed before the page can be shown to the user.

정의 딱 나옴.

## Relative Routing

```jsx
<Link href="?hello=world">쿼리스트링 바꾸기</Link>
```

이렇게 하면, 이 링크가 상대경로로 잘 동작함.

```jsx
<Link href="some">쿼리스트링 바꾸기</Link>
```

하지만 pathname은 상대경로로 동작을 안 함.

```js
push('some?key=value');
replace('some?key=value');
```

`useRouter()`도 동일함.

## hooks

- [Adding Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination#adding-the-search-functionality)
- [Updating the table](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination#4-updating-the-table)

### useSearchParams

> Allows you to access the parameters of the current URL. For example, the search params for this URL `/dashboard/invoices?page=1&query=pending` would look like this: `{page: '1', query: 'pending'}`.

### usePathname

> Lets you read the current URL's pathname. For example, for the route `/dashboard/invoices`, `usePathname` would return `/dashboard/invoices`.

### useRouter

> Enables navigation between routes within client components programmatically. There are multiple methods you can use.

## Grammar

### Root Layout

> The root layout replaces the `_app.js` and `_document.js` files.
> - No longer need `_app` and `_document`.
>
> Root layouts must contain `html` and `body` tags.
>
> The root layout is a Server Component by default and can not be set to a Client Component.

### Layout

> The (export default) component in a `layout.js` should accept a `children` prop. This required layout is shared across all pages in an application.

[Partial rendering](https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating#4-partial-rendering):

> Partial rendering means only the route segments that change on navigation re-render on the client, and any shared segments are preserved.

페이지 바뀌면 그 위에 감싸진 레이아웃들 전부 유지된다는 뜻.

### 기타

> Previously, you could only import global stylesheets from external npm packages (like component libraries) in `_app.js`. With the App Router, you can import (and colocate) any CSS file in any component.

## redirect()

- [redirect() API](https://nextjs.org/docs/app/building-your-application/routing/redirecting#redirect-function)

### 주의사항

> `redirect` internally throws an error so it should be called outside of try/catch blocks.

### Usage — 페이지 URL이 바뀐 경우

본인 프로젝트의 [기본 리다이렉트 방식 변경 커밋](https://github.com/developer-choi/plan-for-myself/commit/407fd2c7683bc68e65e7fe76b8792db13a3fcab2)

[Redirects in next.config.js](https://nextjs.org/docs/app/building-your-application/routing/redirecting#redirects-in-nextconfigjs)

`next.config`에서 설정을 하는 게 `page.ts`나 `route.ts`에서 `redirect()` 쓰는 거 보다 나아 보임.

> If you'd like to redirect **before the render process**, use [next.config.js](https://nextjs.org/docs/app/building-your-application/routing/redirecting#redirects-in-nextconfigjs) or [Middleware](https://nextjs.org/docs/app/building-your-application/routing/redirecting#nextresponseredirect-in-middleware).

라고 공식문서에서 그랬음.

**redirects runs before Middleware.** 라고 하니 참고.

## useSearchParams() — 사용 시점

`useSearchParams()`는 진짜 쓸 일이 렌더링 시점에 필요한 거 (필터 UI 등)가 아니면 `useCallback`이나 `useEffect`에서 가져오는 게 맞는 듯.

## TODO

### Prevent navigation

- [Vercel discussion #47020](https://github.com/vercel/next.js/discussions/47020) — 젤 밑에 뭐 누가 답변 올려준 거 있던데 그 사람 검증도 좀 하고... 전체 내용 흐름 다 분석해야... 내가 잘못 기억하고 있을 수도 있는 게 있을지도 모르니까.
- [NextJS 14 router.events (Velog)](https://velog.io/@khxxjxx/NextJS-14-router.events) — 이런 것도 있더라..

### useSearchParams — pre-rendering / Suspense bailout

본인 프로젝트(다른 타임존 작업)에서 BulletTab을 1→2→3→2 빠르게 왔다 갔다 하면 클릭이 안 먹는 버그가 있었음.

- [use-search-params: Static Rendering](https://nextjs.org/docs/app/api-reference/functions/use-search-params#static-rendering)
- [missing-suspense-with-csr-bailout](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout)

이거 있으면 pre-rendering에서 스킵된다거나, Suspense를 감싸야 하는 근본적인 이유가 있었다거나 하는 내용이 있음.

본인이 특정 커밋(`bb8dc7ed`)까지 되돌아가서 Suspense 날리고 빌드하는데 왜 자꾸 성공할까... `test-playground` 프로젝트의 `test/suspense`에 테스트하던 코드 있음.

### Navigating — 모달 + 뒤로가기

모달 띄우고 뒤로가기하는 거 정상 동작하게 구현하기. 이거 Next.js 13 Route 중에 있었음.

Google Keep이 이거 잘 되어 있음. 모달 하나 띄우고 뒤로가기했을 때 잘 됨.

이거 구현 안 하면, 모바일 웹에서 뒤로가기했다가 페이지 나가짐.

### SC/CC 통합 타입 설계

SC, CC에서 `pathname` / querystring 얻어오는 방식이 다르고, SC, CC에서 페이지 이동시키는 방식도 달라서 왠지 모르게 분명 나중에 문제가 생길 거 같다. 예전에 본인이 Date 관련 Util 만들 때 타입이 서로 달라서 가장 중심이 되는 타입을 `Date`로 잡고 시작했었으니까. 뭐 별도의 Object를 extends하는 객체 타입 만들었다가 서로 변환변환하는데 머리 아파서.
