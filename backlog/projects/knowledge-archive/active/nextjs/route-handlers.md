# Route Handlers

본인 학습 자료 + 본인 test-playground 실험 결과.

## TODO

- [Building APIs with Next.js](https://nextjs.org/blog/building-apis-with-nextjs)
- [Route Handlers (docs)](https://nextjs.org/docs/app/building-your-application/routing/router-handlers) — 이건 API Routes인데,
  1. 이것도 유용할 거 같은데
  2. 예전 버전부터 있었으니 쓰임새, 존재 가치부터 좀 알고 싶고,
  3. Edge Runtime 같이 내가 모르는 키워드에 언급도 있으니 나중에 보긴 봐야 함.

## 필기

출처:

- [next-13-2: custom-route-handlers](https://nextjs.org/blog/next-13-2#custom-route-handlers) — 봄
- [next-13-1: A light Node.js runtime for the Edge (now stable for API Routes)](https://nextjs.org/blog/next-13-1#a-light-nodejs-runtime-for-the-edge-now-stable-for-api-routes) — 아직 안 봄

> Custom request handlers, built on Web Request and Response.
>
> Route Handlers allow you to create custom request handlers for a given route using the Web [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) APIs.

> One of the missing pieces for the original beta release of the App Router (app) was API Routes, which exist in the `pages/api` directory. We wanted to take this opportunity to create a new, more modern version of API Routes that were deeply integrated into the new routing system for `app`.

App Router에서 쓸 수 있는 `pages/api` 같은 라우터가 이거인 거 같음.

아무튼 기존 거 다 쓸 수 있다는 뭐 그런 내용인 듯.

> A `route.ts` file can export an async function named by the HTTP verbs: `GET`, `HEAD`, `OPTIONS`, `POST`, `PUT`, `DELETE`, and `PATCH`. These functions can then be wrapped and abstracted to create helpers / reusable logic for your custom route logic.
>
> Other server functions, like `cookies` and `headers`, can be used inside Route Handlers – along with any Web APIs these abstractions are built upon. **This allows for code to be shared between Server Components and Route Handlers**.

이 부분은 무슨 말인지 모르겠음.

> Route Handlers are available in 13.2 for the App Router (app) using the `route.ts` special file. They are not available in the `pages` directory, as they are a replacement for API Routes.

## Route Handler도 static build가 됨

본인 [Route Handler의 빌드 시점에 대한 동작 테스트 커밋](https://github.com/developer-choi/test-playground/commit/ed4fb48061a3e021f10520a9d360e3a078aa0496).

진짜 특이했음. dynamic function이 호출되기 전까지 API 함수 바디 부분이 실행되다가 말았음 ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ.

본인 [Route Handler 도 static하게 빌드 될 수 있다는 것을 테스트했던 커밋](https://github.com/developer-choi/test-playground/commit/db1426709e56b75c1b5360d959f571b6a0873284).

그래서 최신화 시점 테스트하겠다고 테스트 코드 작성할 때 저렇게 하면 계속 똑같은 timestamp 반환돼서 헷갈릴 수 있음.

굳이나 API를 만들어서 최신화 시점을 테스트해야 한다면, **API 호출 함수, API 함수 둘 다** Dynamic Function으로 만들어야 함. 근데 그럴 바엔 걍 간단하게 API 호출 함수만 Dynamic Function으로 만들어서 timestamp 반환하게 만들자.

## How to access cookies in Route Handler

SC에서는 쿠키를 가져올 수 있음.

하지만 SC에서 Route Handler 호출하는 구조에서 Route Handler에서는 쿠키를 가져올 수가 없음.

Server Component나 Route Handler나 둘 다 Server Side인데 그럼 ㅇㅇ.

브라우저에서는 HTTP 요청을 할 때 쿠키는 Request Header에 포함되어 날아가지만,

Server Component (Server)에서 Route Handler (Server)로 HTTP 요청을 할 때는 그렇지가 않음.

그래서, Client Side에서 Route Handler를 직접 호출하는 경우에는 다시 Route Handler에서 쿠키에 접근할 수 있음. 그 요청에 브라우저가 들고 있는 쿠키 같이 전달되니까.

본인 [테스트 커밋 링크](https://github.com/developer-choi/test-playground/commit/4fa986ee33694e669358f9730a065d355871c3ef).

## Handle Response

Route Handler에서는 응답을 반환하는 두 가지 방식 중 하나는 해야 함 (PDF 이미지 6/7 참고).

200이어도 명시적으로 응답을 반환하는 형태로는 작성해야 함 (PDF 이미지 8 참고).
