# React 컴포넌트 작성 패턴

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

---

## 모달 / 오버레이 구현 규칙

모달이나 다이얼로그를 띄울 때는 컴포넌트 내부 상태(`useState`)가 아닌 **`overlay-kit`** 라이브러리를 사용해야 합니다.

### 원칙
- **❌ Bad**: `useState` boolean 값으로 모달의 표시 여부를 제어하는 방식. (부모 컴포넌트 로직 오염)
- **✅ Good**: `overlay-kit`을 사용하여 핸들러 내부에서 명령형으로 모달을 호출.
