# TypeScript 사용 패턴

> **심화 내용 참고:** [TypeScript Advanced Patterns](advanced.md) - 정교한 타입 정의, Optional 속성 관리 및 리팩토링 가이드

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

## Enum 사용 지양 (Union Type 선호)
상수 집합을 정의할 때는 **Enum 사용을 지양**하고, **Union Type** 또는 **Const Assertion(`as const`)** 객체를 사용합니다.
- Enum은 런타임에 불필요한 코드를 생성하며, Tree-shaking 최적화에 불리할 수 있습니다.
- 리터럴 타입이 더 직관적이고 가볍습니다.

```typescript
// ❌ Bad (Enum 지양)
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

// ✅ Good (Union Type)
export type UserRole = 'ADMIN' | 'USER' | 'GUEST';

// ✅ Good (객체 상수가 필요할 때 - as const)
export const USER_ROLE = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  GUEST: 'GUEST',
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE]; // 타입 추출
```

## any 절대 금지

`any`는 **절대 사용하지 않습니다**. 사용자가 명시적으로 요청하고 다른 대안이 완전히 없음을 설득한 경우에만 최후의 수단으로 허용합니다.

## ts-ignore 금지

`@ts-ignore`는 사용하지 않습니다. 타입 에러는 무시하지 말고 올바르게 해결하세요.

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
