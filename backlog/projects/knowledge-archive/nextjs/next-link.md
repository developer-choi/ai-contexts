# next/link

`next/link` 학습 흔적·References 인덱스. 응용 케이스는 design-system의 `active-link.md`·`link-or-anchor.md` 참조.

## 필기

- 13.2 기준 Statically Typed Links는 베타. 13.4 기준 stable 여부 미확인.

## Statically Typed Links (Next 13.2)

App Router + TypeScript 사용 시 `next/link`의 href를 정적으로 타입 체크 → 잘못된 경로 컴파일 에러로 사전 차단.

```tsx
import Link from 'next/link'

// ✅
<Link href="/about" />
<Link href="/blog/nextjs" />
<Link href={`/blog/${slug}`} />

// ❌ TypeScript errors if href is not a valid route
<Link href="/aboot" />
```

활성화 (베타 시점 설정):

```js
// next.config.js
const nextConfig = {
  experimental: {
    appDir: true,
    typedRoutes: true,
  },
};
```

rewrites·redirects는 미지원 (베타 시점).

출처: [next-13-2#statically-typed-links](https://nextjs.org/blog/next-13-2#statically-typed-links), [공식 가이드](https://beta.nextjs.org/docs/configuring/typescript#statically-typed-links)

## References

### 상위·관련

- [Anchor Overview](https://docs.google.com/document/d/1t-9MgFAD3UIWJZSVUsC3jBW3H9gMExVK94jqTl-X1_A/edit)
- [Announce 리스트페이지 태그 링크 이동 버그](https://drive.google.com/file/d/1CVMhH_E3TbBSbm4MpIpjmx_YaH65_5Yz/view?usp=drive_link)

### 기초

- [(Pages Router) prefetch](https://docs.google.com/document/d/1dU_i2ZLwqOVEOoGU7aYAq6BkNp_vgsjEUthXMBkG5LE/edit#heading=h.swcsny60d0wb)
- [(App Router) Prefetching](https://docs.google.com/document/d/1YHHOxCfMh_sxAw3AZQrsxR-2iyUH_R4A7qDGXEloQPc/edit?tab=t.0)

### 응용 (design-system 토픽으로 별도 정리)

- [LinkOrAnchor (Google Docs)](https://docs.google.com/document/d/148ds9wcRSHL0y7_3rxpCdQDziXZv7TUFeQZQ6I2EH7s/edit) → `backlog/projects/monorepo-playground/design-system/link-or-anchor.md`
- [Active Link (Google Docs)](https://docs.google.com/document/d/1FmklHJmf9oTMpfqTxHReefj8iSXqphABXP1yoq2nh8M/edit?tab=t.0) → `backlog/projects/monorepo-playground/design-system/active-link.md`

### Next.js 공식

- [next-13#nextlink](https://nextjs.org/blog/next-13#nextlink)
- [next-13-2#statically-typed-links](https://nextjs.org/blog/next-13-2#statically-typed-links)
