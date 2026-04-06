# React 컴포넌트 작성 패턴

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

## 모달 / 오버레이 구현 규칙

모달이나 다이얼로그를 띄울 때는 컴포넌트 내부 상태(`useState`)가 아닌 **`overlay-kit`** 라이브러리를 사용해야 합니다.

### 원칙
- **❌ Bad**: `useState` boolean 값으로 모달의 표시 여부를 제어하는 방식. (부모 컴포넌트 로직 오염)
- **✅ Good**: `overlay-kit`을 사용하여 핸들러 내부에서 명령형으로 모달을 호출.
