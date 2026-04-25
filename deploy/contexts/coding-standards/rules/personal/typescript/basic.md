# TypeScript 사용 패턴

> **심화 내용 참고:** [TypeScript Advanced Patterns](../../coding/typescript/advanced.md) - 정교한 타입 정의, Optional 속성 관리 및 리팩토링 가이드

## 타입 vs 인터페이스

**Interface 사용 (선호)**
- 객체 구조 정의
- Props 타입

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

**Type 사용**
- Union 타입
- Intersection 타입
- 유틸리티 타입
- 함수 타입

```typescript
// ✅ Good
export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonVariant = 'contained' | 'outlined';

export type PostBoardApiRequest = Omit<BoardRow, 'pk'>;
export type ValueOf<T> = T[keyof T];
```
