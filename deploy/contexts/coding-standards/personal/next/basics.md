# Next.js 컨벤션

## 레이아웃은 layout.tsx를 사용한다

페이지에 공통 레이아웃(Header, Sidebar 등)을 적용할 때 Layout 컴포넌트를 만들어 page.tsx에서 감싸지 않는다. Next.js App Router의 `layout.tsx`를 사용한다.

```tsx
// ❌ Bad — page.tsx에서 Layout 컴포넌트로 감싸기
import ListLayout from '@/components/ListLayout';

export default function Page() {
  return (
    <ListLayout>
      <Content />
    </ListLayout>
  );
}

// ✅ Good — layout.tsx 사용
// app/some-page/layout.tsx
export default function Layout({ children }) {
  return (
    <>
      <Header />
      <Sidebar />
      <main>{children}</main>
    </>
  );
}
```
