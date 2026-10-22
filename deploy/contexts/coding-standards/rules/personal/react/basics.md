# React 컴포넌트 작성 패턴

## useRef로 임시 값 저장 시 네이밍

`useRef`를 DOM 참조가 아닌 **리렌더링 없이 값을 보존하는 용도**로 사용할 때, 변수명에 `Ref` 대신 `Cache` 접미사를 사용합니다.

```tsx
// ✅ Good — 값 저장 용도임을 명확히 드러냄
const prevValueCache = useRef(0);
const timerIdCache = useRef<number | null>(null);
const isFirstRenderCache = useRef(true);

// ✅ Good — DOM 참조는 그대로 Ref 사용
const inputRef = useRef<HTMLInputElement>(null);
const containerRef = useRef<HTMLDivElement>(null);
```
