# Next.js Rendering Runtime — Node.js vs Edge

본인 학습 자료. Next.js의 두 런타임(Node.js, Edge) 비교 + 본인 미해결 TODO.

## References

- [Next.js: Rendering](https://nextjs.org/docs/app/building-your-application/rendering)
- [Node.js Docs](https://nodejs.org/docs/latest/api/)
- [Edge Runtime APIs](https://edge-runtime.vercel.app/features/available-apis)
- [Vercel: cold and hot boots](https://vercel.com/docs/concepts/get-started/compute#cold-and-hot-boots)
- [HTTP Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

## TODO

엣지 장점, 단점, 해결하려고 했던 문제 뭐 이런 내용이 없음. 일단 못 씀. 안 써야지. 모르는데. 언제(어떤 경우에) 써야 하는지도 모르는데. ← commerce kit에서 어떤 경우에 사용했는지 추론이라도 해보자.

1. Edge Runtime이 13버전에 나온 건지 살펴보고
2. 만약 13버전 이전에 나왔다면 분명 자료 널려있을 거임.
3. 유튜브 구글링 기타 어디든 좋으니 찾아보고
4. 그럼 Edge Runtime은 어떻게 실행해? Next.js Runtime을 실행하는 방법이 `next start`인 걸로 추측하는데
5. `next start` 명령어가 뭘 의미하는지도 알아야 하고 `next` cli도 살펴보자.
6. 하단 필기에 Edge Runtime 배포 관련 설정해야 하는 거 같은 느낌의 내용이 있어서 이 부분도 알아야 결국 쓸 수 있고.

## 필기

> This page will help you understand the differences between rendering environments, strategies, runtimes, and how to opt into them.
>
> There are two environments where your application code can be rendered: the client and the server.
>
> - The client refers to the browser on a user's device that sends a request to a server for your application code. It then turns the response from the server into an interface the user can interact with.
> - The server refers to the computer in a data center that stores your application code, receives requests from a client, does some computation, and sends back an appropriate response.

> Note: Server can refer to computers in regions where your application is deployed to, the [Edge Network](https://vercel.com/docs/concepts/edge-network/overview) where your application code is distributed, or [Content Delivery Networks (CDNs)](https://developer.mozilla.org/en-US/docs/Glossary/CDN) where the result of the rendering work can be cached.

이거 세 줄 굉장히 중요해 보인다.

아무튼 여기서 client environment는 무시하고,

> On the server, there are two runtimes where your pages can be rendered:
>
> 1. The Node.js Runtime (default) has access to all Node.js APIs and compatible packages from the ecosystem.
> 2. The Edge Runtime is based on [Web APIs](https://nextjs.org/docs/app/api-reference/edge).
>
> In the context of Next.js, "runtime" refers to the set of libraries, APIs, and general functionality available to your code during execution. Next.js has two server runtimes where you can render parts of your application code:
>
> Each runtime has its own set of APIs. Please refer to the [Node.js Docs](https://nodejs.org/docs/latest/api/) and [Edge Docs](https://edge-runtime.vercel.app/features/available-apis) for the full list of available APIs.
>
> By default, the app directory uses the Node.js runtime. However, you can opt into different runtimes (e.g. Edge) on a **per-route** basis.
>
> There are many considerations to make when choosing a runtime.

- [cold and hot boots](https://vercel.com/docs/concepts/get-started/compute#cold-and-hot-boots)
- [HTTP Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming) — 왜 이 링크가 여기에 걸려있지? HTTP Streaming이 저기서 무슨 관계가 있는 걸까.

## Edge Runtime

> In Next.js, the lightweight Edge Runtime is a **subset of available Node.js APIs**.
>
> The Edge Runtime is ideal if you need to deliver dynamic, personalized content at low latency with small, simple functions. The Edge Runtime's speed comes from its minimal use of resources, but that can be limiting in many scenarios.
>
> For example, code executed in the Edge Runtime [on Vercel cannot exceed between 1 MB and 4 MB](https://vercel.com/docs/concepts/limits/overview#edge-middleware-and-edge-functions-size), this limit includes imported packages, fonts and files, **and will vary depending on your deployment infrastructure**.

?? 인프라 구성마다 다르다고? 직접 구성하면 설정 좀 바꿀 수 있단 소리야? 그럼 Edge Runtime은 어떻게 실행해? Next.js Runtime을 실행하는 방법이 `next start`인 걸로 추측하는데 `next start` 명령어가 뭘 의미하는지도 알아야 하고 `next` cli도 살펴보자.

## Node.js Runtime

> Using the Node.js runtime gives you access to all Node.js APIs, and all npm packages that rely on them. However, it's not as fast to start up as routes using the Edge runtime.
>
> Deploying your Next.js application to a Node.js server will require managing, scaling, and configuring your infrastructure. Alternatively, you can consider deploying your Next.js application to a serverless platform like Vercel, which will handle this for you.

Serverless Platform에 배포하라고? 그럼 버셀 쓰면 자동으로 되는 거야? 또는 버셀 말고 AWS에 배포하려면 따로 설정해야 하는 거야? 뭐 이런 내용이 어딨을까… 자료 부족함.

## Serverless Node.js

> Serverless is ideal if you need a scalable solution that can handle more complex computational loads than the Edge Runtime. With Serverless Functions on Vercel, for example, your overall code size is [50MB](https://vercel.com/docs/concepts/limits/overview#serverless-function-size) including imported packages, fonts, and files.
>
> The downside compared to routes using the [Edge](https://vercel.com/docs/concepts/functions/edge-functions) is that it can take hundreds of milliseconds for Serverless Functions to boot up before they begin processing requests. Depending on the amount of traffic your site recieves, this could be a frequent occurrence as the functions are not frequently "warm".

## Edge Runtime 적용 방법

> You can specify a runtime for individual route segments in your Next.js application. To do so, declare a variable called runtime and export it.
>
> The variable must be a string, and must have a value of either 'nodejs' or 'edge' runtime.

```ts
export const runtime = 'edge'; // 'nodejs' (default) | 'edge'
```

## 관련 언급

> ImageResponse uses the [Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes#edge-runtime), and Next.js automatically adds the correct headers to cached images **at the edge**, helping improve performance and reducing recomputation.
