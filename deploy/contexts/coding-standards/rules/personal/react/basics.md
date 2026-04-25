# React 컴포넌트 작성 패턴

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

## useRef로 임시 값 저장 시 네이밍

`useRef`를 DOM 참조가 아닌 **리렌더링 없이 값을 보존하는 용도**로 사용할 때, 변수명에 `Ref` 대신 `Cache` 접미사를 사용합니다.

`xxxRef`는 DOM 요소 참조라는 강한 인상을 주기 때문에, 값 저장 용도에서는 의도를 정확히 드러내는 `xxxCache`가 적합합니다.

```tsx
// ✅ Good — 값 저장 용도임을 명확히 드러냄
const prevValueCache = useRef(0);
const timerIdCache = useRef<number | null>(null);
const isFirstRenderCache = useRef(true);

// ✅ Good — DOM 참조는 그대로 Ref 사용
const inputRef = useRef<HTMLInputElement>(null);
const containerRef = useRef<HTMLDivElement>(null);
```
