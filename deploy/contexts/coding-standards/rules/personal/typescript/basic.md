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

## 추상 메소드 구현 시 반환 타입 재선언 금지

abstract class의 메소드를 구현할 때 반환 타입을 다시 적지 않는다. 추상 클래스가 이미 시그니처를 정의하므로 TypeScript가 호환성을 체크하고 추론한다.

```typescript
// ❌ Bad (중복 반환 타입)
async get<T>(url: string, options?: FetchOptions): Promise<T> {

// ✅ Good (추론에 위임)
async get<T>(url: string, options?: FetchOptions) {
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

## `?.` vs `!` 선택 기준

값이 보장되는 상황에서는 `?.` 대신 `!`로 의도를 명시한다.
