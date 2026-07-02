# Next.js

## TODO

### Static Rendering 안 되는 실무 케이스 (검증·정리 필요)

- 공통 fetch 안에서 Dynamic Function 호출
- PC/MO 체크 로직
- SessionProvider에서 auth() 사용
- 공통 레이아웃에 로그인 분기 UI가 있을 때 Static Rendering 가능 여부 (미해결 실험)

→ techniques/nextjs 또는 tips/nextjs 라우팅 후보 (검증 후 KA로).

### middleware Static Generation 호환 tip

- middleware에서 dynamic function 호출해도 static generation 정상 작동 — KA `tips/nextjs/routing` 후보.

### PPR 심화 자료

- [Our Journey with Caching (nextjs blog)](https://nextjs.org/blog/our-journey-with-caching)
- [Composable Caching with Next.js](https://nextjs.org/blog/composable-caching)

KA `knowledge/frontend/nextjs/rendering/partial-prerendering.md` 보강 후보.

### 미export 내부 Google Docs

렌더링 기술 발전과정, getServerSideProps, generateStaticParams 등 다수 — 사용자가 별도 export 후 convert 처리.
