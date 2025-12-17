# TypeScript 사용 패턴
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

## 제네릭 활용

**적극적으로 제네릭 사용**
- 재사용 가능한 유틸리티
- 타입 안전성 보장

```typescript
// ✅ Good
export default abstract class Stack<D> {
abstract push(data: D): void;
abstract pop(): D;
abstract peek(): D | undefined;
}

export function replace<T>(
  array: Array<T>,
  conditionCallback: (item: T) => boolean,
  replaceCallback: (item: T) => T
) {
  // ...
}
```

## 유틸리티 타입 활용

```typescript
// Omit - 특정 속성 제외
interface InputProps extends Omit<FormElementWrapperProps, 'kind'> { }
type PostBoardApiRequest = Omit<BoardRow, 'pk'>;

// Pick - 특정 속성만 선택
type UsedProps = Pick<ComponentPropsWithRef<'button'>, 'style' | 'className' | 'onClick'>;

// ComponentPropsWithRef - 네이티브 요소 props + ref
interface CheckboxProps extends ComponentPropsWithRef<'input'> { }

// ComponentPropsWithoutRef - 네이티브 요소 props (ref 제외)
interface ElementProps extends ComponentPropsWithoutRef<'div'> { }

// PropsWithChildren - children 포함
function Layout(props: PropsWithChildren<LayoutProps>) { }
```

## 타입 단언 최소화

```typescript
// ⚠️ 필요한 경우에만 사용
const body = await request.json() as SignUpApiRequest;
const previousCount = map.get(completion) as number;

// ✅ 타입 가드 사용 선호
if (typeof value === 'string') {
  // value는 string 타입
}
```

## Readonly 활용

```typescript
export class SortedHistoryLogger {
  readonly input: SortParam;
  readonly options: SortedHistoryLoggerOptions;
}

export default class StackUsingArray<D> extends Stack<D> {
  private readonly array: D[];
  readonly capacity: number;
}
```