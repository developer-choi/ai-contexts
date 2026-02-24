# React 컴포넌트 작성 패턴

> **설계 원칙 참고:** [Component Design Patterns](design.md) - 기본값 설정, 전역 상태 관리, 이벤트 리스너 등 설계 철학

## 파일 내 코드 순서

컴포넌트, 훅, 유틸 등 모든 파일의 코드는 아래 순서를 따릅니다. 사람은 위에서 아래로 읽으므로, **핵심(타입, export 함수)이 먼저** 오고 부수적인 것(상수, 유틸)은 뒤로 보냅니다.

1. Props 타입 정의 (`interface`, `type`)
2. `export default` 컴포넌트 함수
3. 상수 (`const ITEMS = [...]`)
4. 유틸 함수 (`function formatPrice() {}`)

```tsx
// ✅ Good
interface ProductCardProps {
  name: string;
  price: number;
}

export default function ProductCard({ name, price }: ProductCardProps) {
  return <div>{name} - {formatPrice(price)}</div>;
}

const DUMMY_ITEMS = ['a', 'b', 'c'];

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR');
}
```

---

## Named Import 사용

`React.useEffect`, `React.useState` 등 네임스페이스 접근 대신 named import를 사용합니다.

```tsx
// ❌ Bad
React.useEffect(() => { /* ... */ }, []);
React.useState(0);

// ✅ Good
import { useEffect, useState } from 'react';

useEffect(() => { /* ... */ }, []);
useState(0);
```

---

## children props는 PropsWithChildren 사용

children을 받는 컴포넌트는 `PropsWithChildren`을 사용합니다.

```tsx
// ❌ Bad
function Layout({ children }: { children: ReactNode }) {
  return <main>{children}</main>;
}

// ✅ Good
import { PropsWithChildren } from 'react';

function Layout({ children }: PropsWithChildren) {
  return <main>{children}</main>;
}

// ✅ Good — 다른 props도 있는 경우
interface SidebarProps {
  title: string;
}

function Sidebar({ title, children }: PropsWithChildren<SidebarProps>) {
  return <aside><h2>{title}</h2>{children}</aside>;
}
```

---

## useCallback / useMemo 수동 사용 금지

React Compiler가 활성화된 프로젝트에서는 `useCallback`과 `useMemo`를 수동으로 사용하지 않습니다. 컴파일러가 자동으로 메모이제이션을 처리합니다.

React Compiler는 React 19에서 기본 활성화가 아니며 별도 설정이 필요합니다. 작업 전 프로젝트 설정을 확인하세요.
- Next.js: `next.config.js`의 `reactCompiler: true`
- Vite: `vite.config.ts`의 `reactCompiler` 플러그인
- Babel: `babel-plugin-react-compiler`

```tsx
// ❌ Bad — React Compiler 활성화 시
const handleClick = useCallback(() => { /* ... */ }, [dep]);
const computed = useMemo(() => calculate(value), [value]);

// ✅ Good — React Compiler가 자동 처리
const handleClick = () => { /* ... */ };
const computed = calculate(value);
```

---

## Skeleton 컴포넌트 작성 규칙

Skeleton은 원본 컴포넌트의 **레이아웃 클래스를 그대로 import하여 재사용**합니다. Skeleton 전용 스타일에는 뼈대(bone) 시각 효과만 정의합니다.

- **❌ Bad**: Skeleton에서 `margin-top`, `aspect-ratio` 등 레이아웃 값을 중복 선언. 원본과 값이 어긋나면 CLS 방지 효과가 없어지고, 원본 수정 시 Skeleton도 따로 수정해야 함.
- **✅ Good**: 원본의 레이아웃 클래스를 가져다 쓰고, Skeleton 스타일에는 `background-color`, `animation`, `width`, `height` 등 뼈대 표현만 작성.

```tsx
// ✅ Good
import cardStyles from "./ProductCard.module.scss";
import styles from "./ProductCardSkeleton.module.scss";

export default function ProductCardSkeleton() {
  return (
    <div className={cardStyles.card}>
      <div className={`${cardStyles.imageWrapper} ${styles.bone}`} />
      <div className={cardStyles.info}>
        <div className={`${cardStyles.brand} ${styles.bone} ${styles.brandBone}`} />
      </div>
    </div>
  );
}
```

---

## 모달 / 오버레이 구현 규칙

모달이나 다이얼로그를 띄울 때는 컴포넌트 내부 상태(`useState`)가 아닌 **`overlay-kit`** 라이브러리를 사용해야 합니다.

### 원칙
- **❌ Bad**: `useState` boolean 값으로 모달의 표시 여부를 제어하는 방식. (부모 컴포넌트 로직 오염)
- **✅ Good**: `overlay-kit`을 사용하여 핸들러 내부에서 명령형으로 모달을 호출.
