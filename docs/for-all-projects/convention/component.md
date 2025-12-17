# React 컴포넌트 패턴

##  함수형 컴포넌트
- **100% 함수형 컴포넌트** 사용
- 클래스 컴포넌트 사용하지 않음

```typescript
// ✅ Good
export default function Button({children, loading, ...rest}: ButtonProps) {
  return (
    <button {...rest}>
      {loading ? <LoadingSpinner /> : children}
    </button>
  );
}

// ❌ Bad - 화살표 함수로 컴포넌트 선언
export const Button = ({children, loading, ...rest}: ButtonProps) => {
  return (
    <button {...rest}>
      {loading ? <LoadingSpinner /> : children}
    </button>
  );
};
```

**Props 타입 정의**
```typescript
// ✅ Good - 네이티브 요소 확장
export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  size?: ButtonSize;
  variant?: ButtonVariant;
  loading?: boolean;
}

// ✅ Good - PropsWithChildren
function Layout(props: PropsWithChildren<LayoutProps>) {
  return <div>{props.children}</div>;
}
```