# Next.js 13 / 14 버전 변경사항

본인 학습 자료. 주요 변경 영역(Turbopack/Webpack/Module/Import Resolution/Deploy) + 본인 미해결.

## References

- [Progressive Hydration (patterns-dev-kr)](https://patterns-dev-kr.github.io/rendering-patterns/progressive-hydration/) — 메뉴 모르겠음
- [App Router (timegambit blog)](https://www.timegambit.com/blog/blog-log/app-router)
- [next-13-4: server-actions-alpha](https://nextjs.org/blog/next-13-4#server-actions-alpha) — 미래의 App Router를 위한 것
- [Pages Router upgrading](https://nextjs.org/docs/pages/building-your-application/upgrading)
- [From CRA to Next.js](https://nextjs.org/docs/app/building-your-application/upgrading/from-create-react-app)
- [App Router Migration](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration) — Pages Router vs App Router를 비교하기 좋은 링크
- [Rendering](https://nextjs.org/docs/app/building-your-application/rendering) ← 특히 이거 전반적으로 다 영향 줘서 읽어야 함
- [Streaming with Suspense](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming#streaming-with-suspense)
- [Next.js 13: Prevent Common Mistakes w/ New TypeScript Plugin (YouTube)](https://www.youtube.com/watch?v=pqMqn9fKEf8)

## Turbopack — References

- [next-13-2: turbopack improvements](https://nextjs.org/blog/next-13-2#turbopack-improvements) — Compatibility with Webpack loaders and improved support.
- [next-13-1: turbopack improvements](https://nextjs.org/blog/next-13-1#turbopack-improvements) — Support for Tailwind CSS, next/image, @next/font, and more.
- [next-13: introducing turbopack alpha](https://nextjs.org/blog/next-13#introducing-turbopack-alpha)

## Webpack — References

- [next-13-2: custom-file-transformation-with-webpack-loaders](https://nextjs.org/blog/next-13-2#custom-file-transformation-with-webpack-loaders)
- [next-13-2: webpack-style-resolve-aliases](https://nextjs.org/blog/next-13-2#webpack-style-resolve-aliases)

## Module — References

- [next-13-1: built-in-module-transpilation-stable](https://nextjs.org/blog/next-13-1#built-in-module-transpilation-stable) — 여전히 뭔 소린지 모르겠음.

## Others

- [와 Vite 쓰면 리액트 10배 빨라짐 (과장 아님) (YouTube)](https://www.youtube.com/watch?v=iX3Nu1FcZKA&feature=youtu.be)

## Import Resolution

출처:

- [next-13-1: import resolution for smaller bundles](https://nextjs.org/blog/next-13-1#import-resolution-for-smaller-bundles)
- [Modularize Imports](https://nextjs.org/docs/advanced-features/compiler#modularize-imports)

[Next 13에서 개선된 smaller bundles](https://nextjs.org/blog/next-13-1#import-resolution-for-smaller-bundles)가 뭐냐면,

위에처럼(barrel import) 작성하면 문제가 돼서 아래처럼(direct import) 작성을 했었는데 (수작업으로)

이제 위에처럼 작성해도 아래처럼 바꿔준다는 것. (써보지는 못했음 아직)

### 자세한 내용

[배럴 파일이란 무엇입니까 (flaming.codes)](https://flaming.codes/ko/posts/barrel-files-in-javascript)

> While bundlers understand these barrel files and can remove unused re-exports, this process involves **parsing/compiling** **all re-exported files**, which **slows down compile times**.

이런 문제가 있어서,

> We've added a new SWC transform built into Next.js called **modularizeImports**.

> the above code for using three components would be **automatically** converted to use **direct imports**, without the developer needing to write this code manually

### 적용 방법

> This transformation is possible with the `modularizeImports` option in **next.config.js**

## Deploy

> When deployed to Vercel, Next.js 13 applications that use the app/ directory will stream responses by default in both the Node.js and Edge runtimes for improved performance.

- Edge runtime이 진짜 뭔지 여전히 모르겠음. ([rendering-runtime.md](./rendering-runtime.md) 참고)
