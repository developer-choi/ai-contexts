# Next.js 15 버전 변경사항

본인 학습 자료. 15.1까지 읽음 + TODO + 본인 미해결.

## References

- [next-15](https://nextjs.org/blog/next-15)
- [next-15-1](https://nextjs.org/blog/next-15-1)

RC 글은 안 읽는 게 좋을 듯. 어차피 stable release 블로그 글 써줄 거라서. RC 글 읽으면 stable release 글도 읽으면서 서로 비교해야 하는 치명적인 문제가 있음.

## TODO

15.1까지 읽었고 아래 4개 읽은 다음 위 Ref에 올리면 됨:

- [next-15-2](https://nextjs.org/blog/next-15-2)
- [next-15-3](https://nextjs.org/blog/next-15-3)
- [next-15-4](https://nextjs.org/blog/next-15-4)
- [next-15-5](https://nextjs.org/blog/next-15-5)

### Caching journey + PPR

[Our journey with caching](https://nextjs.org/blog/our-journey-with-caching) — 기존 렌더링 방식의 단점과, PPR이 개선하는 부분.

- PPR 문서와 PPR 공식문서 링크 각 잡고 분석하기.

### Async Request APIs (breaking)

[next-15: async-request-apis-breaking-change](https://nextjs.org/blog/next-15#async-request-apis-breaking-change)

이걸 비동기로 바꾸면 서버사이드 API 기다리는 동안 더 많이 미리 준비를 할 수 있는 게 맞아? 내가 이해하는 코드 실행 흐름이랑 다른데…

### 기타 next-15 changes

- [Client prefetches on the App Router now use the `priority` attribute](https://github.com/vercel/next.js/pull/67356)
- [`experimental.allowDevelopmentBuild`로 `NODE_ENV=development`로 `next build` 가능](https://github.com/vercel/next.js/pull/65463) — 와 이거 꼭 알아내야 함
- [`next/dynamic` component SSR 시 chunk prefetch](https://github.com/vercel/next.js/pull/65486) — 뭔 소리지? 근데 중요한 내용임
- [Enhanced Forms (`next/form`)](https://nextjs.org/blog/next-15#form-component): Enhance HTML forms with client-side navigation.
- [instrumentation.js API (Stable)](https://nextjs.org/blog/next-15#instrumentationjs-stable): New API for server lifecycle observability.
- [Enhanced security for Server Actions](https://nextjs.org/blog/next-15#enhanced-security-for-server-actions) — 그래서 내가 Server Actions 쓸 때 뭐 바꿔야 하는 거 있나
- `instrumentation.ts` 쓰려면 14버전에서는 `next.config.js`에서 뭐 켜야 했나 보네. 근데 나 이거 Sentry였나 next-auth였나 구축해야 해서 추가한 적이 있었는데 그럼 동작 안 하는 건가? 확인해보고 나중에 하는 걸로 미루기.
- [ESLint 9 Support](https://nextjs.org/blog/next-15#eslint-9-support) — 이것도 ESLint 10 되기 전에 마이그레이션 하긴 해야 함. 지금이야 하위 호환성 보장해주지만…
- [`unstable_rethrow` to rethrow Next.js internal errors in the App Router](https://github.com/vercel/next.js/pull/65831)
- [next-15-1: Add experimental CSS inlining support](https://github.com/vercel/next.js/pull/72195)

## fetch Requests are no longer cached by default

[next-15-rc: fetch-requests-are-no-longer-cached-by-default](https://nextjs.org/blog/next-15-rc#fetch-requests-are-no-longer-cached-by-default)

이야 페이지 파일에서 설정할 수 있는 캐시 설정이 다 많아졌네.

이게 링크는 RC이긴 하지만, [next-15 caching-semantics](https://nextjs.org/blog/next-15#caching-semantics) 여기에 설명이 없긴 함. 어? 설마 여기에 나오는 캐시 설명들이 Next.js 15에 사라졌나? `cache` 기본값은 캐싱 안 하는 걸로 되어 있긴 하던데.

## Client Router Cache no longer caches Page components by default

[next-15: client-router-cache-no-longer-caches-page-components-by-default](https://nextjs.org/blog/next-15#client-router-cache-no-longer-caches-page-components-by-default)

- 테스트해보니 진짜임 ㅇㅇ.

## Unstable

- [next-15-1: Improved Error Debugging](https://nextjs.org/blog/next-15-1#improved-error-debugging)
- [next-15-rc: Incremental Adoption of Partial Prerendering (Experimental)](https://nextjs.org/blog/next-15-rc#incremental-adoption-of-partial-prerendering-experimental) — Next.js 15에는 없었음

## 링크들

- [Static Indicator](https://nextjs.org/blog/next-15#static-route-indicator): New visual indicator shows static routes during development.
- [next.config.ts](https://nextjs.org/blog/next-15#support-for-nextconfigts): TypeScript support for `next.config.ts`.
- [ESLint 9 Support](https://nextjs.org/blog/next-15#eslint-9-support): Added support for ESLint 9.

### During Development

- [next-15: Development and Build Improvements](https://nextjs.org/blog/next-15#development-and-build-improvements)

### Turbopack

- [next-15-rc2: Turbopack for development](https://nextjs.org/blog/next-15-rc2#turbopack-for-development)
- [next-15: Turbopack Dev](https://nextjs.org/blog/next-15#turbopack-dev)
- [Turbopack for development stable](https://nextjs.org/blog/turbopack-for-development-stable)

### Migration

- [Smooth Upgrades with @next/codemod CLI](https://nextjs.org/blog/next-15#smooth-upgrades-with-nextcodemod-cli)

### next/after

- [after (stable)](https://nextjs.org/blog/next-15-1#after-stable): New API to execute code after a response has finished streaming.

### Deployment

- [next-15: Improvements for Self-Hosting](https://nextjs.org/blog/next-15#improvements-for-self-hosting) — AWS도 Self-hosting에 포함되는구나…
- [Breaking: `runtime = "experimental-edge"` deprecated, use `runtime = "edge"`](https://github.com/vercel/next.js/pull/70480) — 엣지가 뭘까… ([rendering-runtime.md](./rendering-runtime.md) 참고)

### Error Debugging

- [next-15-1: Improved Error Debugging](https://nextjs.org/blog/next-15-1#improved-error-debugging) — Next.js에서 되게 좋은 걸 개발했구나. `ignoreList`가 핵심이군.
