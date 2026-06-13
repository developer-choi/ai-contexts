# Server Action

본인 학습 자료 + 본인 프로젝트 사례 (랭디어드민) + 실험 결과 + 본인 결론. 큰 자료.

## References

- [Server Actions and Mutations (Next.js docs)](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Understanding React Server Components (Vercel)](https://vercel.com/blog/understanding-react-server-components#server-actions:-react%E2%80%99s-first-steps-into-mutability)

## TODO

[Mutating data — what are server actions](https://nextjs.org/learn/dashboard-app/mutating-data#what-are-server-actions)

음 읽어보니 필요성 자체는 격하게 공감하긴 하는데, Next.js Server에서 직접 DB에 쓰는 케이스를 도와주는 거면 안 쓸 듯.

출처: [Create a server action](https://nextjs.org/learn/dashboard-app/mutating-data#2-create-a-server-action)

> Good to know: In HTML, you'd pass a URL to the `action` attribute. This URL would be the destination where your form data should be submitted (usually an API endpoint). However, in React, the `action` attribute is considered a special prop — meaning React builds on top of it to allow actions to be invoked. Behind the scenes, Server Actions create a POST API endpoint. ***This is why you don't need to create API endpoints manually when using Server Actions.***

이게 뭔 소린지 모르겠다…

> React Server Actions allow you to run asynchronous code directly on the server.

처음엔 단순히 CRD 하는 서버 측 코드를 (Client에서도) 실행할 수 있게 해주는 거고 난 RHF 쓰니까 상관없음~ 그랬는데, 뭔가 뭔가 스윽 보니 되게 혁신적인 거라서 활용할 가치가 많아 보였음..

## Server Action

> you can still interact with the server from the client through Server Actions
>
> Now that we have data fetching pretty well sorted, we're exploring the other direction: sending data from the client to the server, so that you can execute database mutations and implement forms. We're doing this by letting you pass Server Action functions across the server/client boundary, which the client can then call, providing seamless RPC. Server Actions also give you progressively enhanced forms before JavaScript loads.

[Vercel blog](https://vercel.com/blog/understanding-react-server-components#server-actions:-react%E2%80%99s-first-steps-into-mutability):

> Within the context of RSCs, Server Actions are functions that you define in an RSC on the server side that you can then pass across the server/client boundary. When a user interacts with your app on the client side, they can directly call Server Actions which will be executed securely on the server side.
>
> This approach provides a seamless [Remote Procedure Call](https://en.wikipedia.org/wiki/Remote_procedure_call) (RPC) experience between the client and the server. Instead of writing a separate API route to communicate with the server, you can directly call Server Actions from your Client Components.

> Keep in mind, too, that the Next.js App Router is built entirely around smart data caching, revalidating, and mutating. Server Actions in Next.js mean you can both mutate the cache and update the React tree in the same roundtrip request to the server — all while maintaining client cache integrity through navigation.
>
> Specifically, Server Actions are designed to handle tasks like database updates or form submissions. For example, they can progressively enhance your forms, which means that even if JavaScript hasn't loaded yet, the user can still interact with the form, and Server Actions will handle the submission and processing of the form data.

> The opportunities that Server Actions offer, both for progressive enhancement and eliminating development work on APIs, are great for accessibility, usability, and developer experience.

## 치명적인 단점

에러 던지면 그 에러의 클래스 정보가 유실됨. Client Side에서 Server Side의 Server Action을 호출했고 Server Action에서 `SomeCustomError`를 던지면 Client Side에서 `error.name`으로 접근하면 `Error`로만 나옴.

아오 그렇다고 이걸 에러 클래스가 아니라 에러 코드 기반으로 바꾸면

```ts
if (error.code === CONSTANT_ERROR_CODE) {
  (error as SomeError).some
}
```

으로 매번 assertion 해야 하는 게 `instanceof` 대비 단점인데 ㅠㅠ

## revalidateTag()가 화면 새로고침 하는 게 아님

> Server Actions integrate with the Next.js [caching and revalidation](https://nextjs.org/docs/app/building-your-application/caching) architecture. When an action is invoked, Next.js can return both the updated UI and new data in a single server roundtrip.
>
> There are two places you can use revalidateTag, depending on what you're trying to achieve:
>
> - [Route Handlers](https://nextjs.org/docs/14/app/building-your-application/routing/route-handlers) — to revalidate data in response of a third party event (e.g. webhook). This will not invalidate the Router Cache immediately as the Router Handler isn't tied to a specific route.
> - [Server Actions](https://nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations) — to revalidate data after a user action (e.g. form submission). **This will invalidate the Router Cache for the associated route.**

`revalidateTag()`를 호출한 client에서만 화면이 업데이트됨.

## revalidateTag() 문법

react-query처럼 계층 구조로 tag를 사용하는 건 아니었음. (`['name', 'detail']` 같은 배열 형태로 못 씀. 애초에 타입이 문자열임.)

그래서 계층적으로 쓰고 싶다면 `name`, `name-${name}` 같은 문자열 접두사 패턴으로 해놓고:
- 모든 name 다 revalidation 하고 싶다 = `name` 사용
- 일부 name만 revalidation 하고 싶다 = `name-${name}` 사용

## revalidateTag 주의사항

상세 페이지에서 수정했다고 모든 detail tag를 한 번에 revalidate 하면, 모든 상세 데이터 캐시가 한 방에 다 날아가는 대참사가 생기기 때문에, 반드시 그 하나만 삭제해야 함.

## revalidatePath()

```ts
await revalidatePathOnServerAction(location.pathname);
```

리스트 페이지에서 별도 상세페이지 없이 모달로 수정하는 경우, 이런 식으로 쓰는 게 정말 짧고 좋은 거 같음.

> `revalidatePath` allows you to purge [cached data](https://nextjs.org/docs/app/building-your-application/caching) on-demand for a specific path.
>
> Currently, `revalidatePath` **invalidates all the routes** in the [client-side Router Cache](https://nextjs.org/docs/app/building-your-application/caching#client-side-router-cache) when used in a server action. This behavior is temporary and will be updated in the future to apply only to the specific path.

이 이유 하나 때문에, [vercel/next.js#77552](https://github.com/vercel/next.js/discussions/77552) 이건 더 이상 가치를 잃음.

> Using `revalidatePath` invalidates **only the specific path** in the [server-side Route Cache](https://nextjs.org/docs/app/building-your-application/caching#full-route-cache).

그리고 Data Cache도 Revalidate 함. 아마 그 path에서 호출하는 모든 API 다 revalidate 하겠지. 잘 찾아서. (따로 테스트 안 해봄)

특이한 건, dynamic route 들어가면 page나 layout 둘 중 하나를 포함해야 한다더라.

> If the path contains a dynamic segment (for example, `/product/[slug]/page`), this parameter is required. If path refers to the literal route segment, e.g., `/product/1` for a dynamic page (e.g., `/product/[slug]/page`), you should not provide `type`.

### 요약

1. dynamic route로 안 만들면 2nd parameter 전달 안 해도 됨
2. dynamic route로 만들었어도, 실제 경로만 revalidate 할 거면 2nd parameter 전달 안 해도 됨
3. dynamic route로 만들었고, 모든 dynamic route 다 revalidate 할 거면 2nd parameter 전달 해도 됨.
4. route group이면 폴더명에 잘 써줘야 함.

### 시도

`revalidatePath()`를 try/catch로 감싸서 에러 던져지면 던지는 패턴을 해볼 생각도 했었음. 근데 일단 접었음. `revalidatePath()`가 에러 던져져서 호출도 안 되면 server action의 기본 동작인 client router cache 초기화도 안 돼서.. 저게 꼭 필요했으면 프레임워크에서 저렇게 구현했겠지 싶음.

### revalidateTag()와의 쓰임새 비교

기존에 랭디 어드민 챕터 리스트 페이지 수정 성공 후 리스트 페이지로 돌려보낼 때 (대부분의 페이지는 리스트가 로그인 해야만 접근이 가능함):

리스트 API에 태그 넣어두고 그 태그를 수정 성공 시점에 revalidate 했었는데, 이게 존나게 멍청한 코드였음.

어차피 유저 A의 컴퓨터에서 챕터 리스트를 revalidate 한다고 해봐야 의미가 없는 게,

1. 유저 A 컴퓨터에서 리스트 최신화되어야 함 ⇒ client router cache만 날리면 됐음. (= revalidatePath도 가능)
2. 유저 B의 Client Router Cache에 이미 리스트 페이지가 있었고 이걸 최신화? ⇒ 어차피 못함.
3. 아무리 봐도 **태그 방식은 유저 사이트에서 public 데이터로 되어 있는 구조에서 프론트 서버에서 공개한 걸 어드민 서버에서 revalidate 하는 용도** 말고는 못 찾겠음.

근데 또 `revalidateOnTag`가 유용한 경우가 있긴 하더라.

랭디어드민처럼 좌측 리스트 우측 수정페이지 구조에서 리스트들을 죄다 revalidate 하려면 path는 무리임. 리스트가 거의 하위 모든 페이지에 다 나오는데 그거 일일이 다 revalidate 할 수는 없으니까.

그래서 수정페이지에서 수정 성공하면:
1. revalidate path (수정페이지 경로)
2. revalidate tag (리스트 데이터)

이렇게 했음.
