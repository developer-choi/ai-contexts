# TypeScript 사용 패턴

## 객체 구조는 interface로 정의한다

```typescript
// ✅ Good
export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  size?: ButtonSize;
  variant?: ButtonVariant;
  loading?: boolean;
}

export interface SortParam {
  value: number[];
  order: 'asc' | 'desc';
}
```
