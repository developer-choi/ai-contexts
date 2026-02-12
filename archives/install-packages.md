# Vite / Nextjs 기반 프로젝트 패키지 설치

하나의 커밋에 아래 내용 읽고 필요한 패키지와 설치 모두 진행하기

## 모든 프로젝트 공통 설치 패키지

```bash
yarn add react-error-boundary
```

```bash
yarn add -D prettier 
```

- 에디터 prettier 설정

---

## 자주 설치하는 패키지
### radix-themes
```bash
yarn add @radix-ui/themes @radix-ui/react-icons
```

---

### tanstack query
```bash
yarn add @tanstack/react-query
```

```bash
yarn add -D @tanstack/eslint-plugin-query
```

https://tanstack.com/query/latest/docs/framework/react/quick-start
- eslint 테스트 + 에디터 eslint 설정

---

### overlay kit
```bash
yarn add overlay-kit
```

---

### 기타
```bash
yarn add react-hook-form
```

```bash
yarn add dayjs
```

```bash
yarn add react-toastify
```

```bash
yarn add -D sass
```

- Vite, Nextjs 둘 다 sass 설치만 하면 동작함.

---

## Provider 순서 정리

```typescript jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { OverlayProvider } from 'overlay-kit';
import { ToastContainer } from 'react-toastify';
import "@radix-ui/themes/styles.css";
import "@/styles/reset.css";
import "@/styles/global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
    },
  },
});

export default function AppProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <Theme>
        <OverlayProvider>
          {children}
          <ToastContainer />
        </OverlayProvider>
      </Theme>
    </QueryClientProvider>
  );
}
```

- [radix](https://www.radix-ui.com/themes/docs/overview/getting-started#2-import-the-css-file)
- [tanstack query](https://tanstack.com/query/latest/docs/framework/react/quick-start)

---

## Root Layout

```typescript jsx
import { Noto_Sans_KR } from 'next/font/google';
import { PropsWithChildren } from 'react';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html>
      <body className={notoSansKr.className}>{children}</body>
    </html>
  );
}
```