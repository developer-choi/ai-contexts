# React 컴포넌트 작성 패턴

> **설계 원칙 참고:** [Component Design Patterns](design.md) - 기본값 설정, 전역 상태 관리, 이벤트 리스너 등 설계 철학

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

## 모달(Modal) / 오버레이 구현 규칙

모달이나 다이얼로그를 띄울 때는 컴포넌트 내부 상태(`useState`)가 아닌 **`overlay-kit`** 라이브러리를 사용해야 합니다.

### 원칙
- **❌ Bad**: `useState` boolean 값으로 모달의 표시 여부를 제어하는 방식. (부모 컴포넌트 로직 오염)
- **✅ Good**: `overlay-kit`을 사용하여 핸들러 내부에서 명령형으로 모달을 호출.

### 구현 예시

**❌ Bad (useState 사용)**
```tsx
const [isOpen, setIsOpen] = useState(false);

return (
  <>
    <button onClick={() => setIsOpen(true)}>삭제</button>
    {isOpen && <DeleteModal onClose={() => setIsOpen(false)} />}
  </>
);
```

**✅ Good (overlay-kit 사용)**
```tsx
import { overlay } from 'overlay-kit';

const handleDelete = () => {
  overlay.open(({ isOpen, close }) => (
    <DeleteModal 
      isOpen={isOpen} 
      onClose={close} 
      onConfirm={() => {
        close();
      }} 
    />
  ));
};

return <button onClick={handleDelete}>삭제</button>;
```