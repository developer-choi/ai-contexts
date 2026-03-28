# 채용과제 패키지 설치 가이드

## 사용자 직접 진행 항목

아래 항목은 대화형 CLI 또는 에디터 설정이 필요하므로 AI가 대신 수행할 수 없다.

- 프로젝트 초기화 (npx create vite, npx create-next-app 등)
- 에디터 prettier 설정
- 에디터 eslint 설정

---

## 필수 패키지 (모든 채용과제)

### dependencies

- react-error-boundary

### devDependencies

- prettier

---

## 선택 패키지 (과제 요구사항에 따라 논의)

### UI

- dependencies: @radix-ui/themes, @radix-ui/react-icons
- 셋팅: css import 필요 (`@radix-ui/themes/styles.css`)
- [공식 문서](https://www.radix-ui.com/themes/docs/overview/getting-started#2-import-the-css-file)

### 데이터 페칭

- dependencies: @tanstack/react-query
- devDependencies: @tanstack/eslint-plugin-query
- 셋팅:
  - eslint config에 플러그인 추가
  - QueryClientProvider 감싸기
  - 이후 eslint 잘 되는지 테스트
- [공식 문서](https://tanstack.com/query/latest/docs/framework/react/quick-start)

```typescript
// eslint.config.js
import pluginQuery from "@tanstack/eslint-plugin-query";

export default defineConfig([
  ...pluginQuery.configs["flat/recommended"]
])
```

### 오버레이

- dependencies: overlay-kit
- 셋팅: OverlayProvider 감싸기

### 폼

- dependencies: react-hook-form

### 날짜

- dependencies: dayjs

### 토스트

- dependencies: react-toastify
- 셋팅: ToastContainer 배치

### 스타일

- devDependencies: sass

---

## 설치 후 구성

### Provider 순서

선택된 패키지만 포함하여 아래 순서로 감싼다. 설치하지 않은 패키지의 Provider는 제외한다.

```typescript jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { OverlayProvider } from 'overlay-kit';
import { ToastContainer } from 'react-toastify';
import "@radix-ui/themes/styles.css";
import "@/shared/styles/reset.css";
import "@/shared/styles/global.css";

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

### Root Layout (Next.js)

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
