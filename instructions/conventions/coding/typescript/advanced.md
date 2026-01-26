# TypeScript Advanced Patterns

## 1. 정교한 타입 정의

### Template Literal Types 활용
문자열이지만 특정한 패턴(숫자 등)만 허용해야 할 때, `string` 대신 템플릿 리터럴 타입을 사용하여 정확도를 높입니다.

**기본: 숫자로만 이루어진 문자열**
```typescript
// ❌ Less Safe
export type NumericString = string;

// ✅ More Safe
export type NumericString = `${number}`;
```

**심화: 특정 자릿수 숫자 문자열 (예: 2자리)**
```typescript
// 1~9 유니온 정의
type OneToNine = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
// 0~9 유니온 정의
type ZeroToNine = 0 | OneToNine;

/**
 * 계산 가능한 2자리 숫자 문자열 (00 ~ 99 아님, 10 ~ 99)
 * 예: "10", "99" (O) / "1", "100" (X)
 */
export type TwoDigitNumberString = `${OneToNine}${ZeroToNine}`;
```

### 빈 문자열 명시적 구분
값이 "없음"을 나타낼 때, `string` 타입 안에 묵시적으로 빈 문자열(`''`)을 포함시키기보다 명시적으로 유니온을 사용하여 의도를 드러냅니다.

```typescript
// ❌ Ambiguous
interface InquiryArticle {
  img1: string; // 빈 문자열이 '없음'을 의미하는지 불명확
}

// ✅ Explicit & Intuitive
interface InquiryArticle {
  // 빈 문자열: 서버에서 값이 없음을 빈 문자열로 응답하는 경우
  img1: '' | string;
}
```

## 2. 빈 값(Optional, Null)에 대한 주석 규칙
`?` (Optional), `null`, `undefined`가 포함된 타입을 정의할 때는, **"어떤 상황에서 값이 비어있는지"** 반드시 주석으로 설명해야 합니다. 그래야 사용하는 측에서 대비할 수 있습니다.

```typescript
export interface SomeProduct {
  /**
   * 재고가 0이거나 판매 중지된 상품일 경우 아예 키가 존재하지 않음.
   */
  restockDate?: string;

  /**
   * 아직 관리자 승인이 완료되지 않은 경우 null.
   * (키는 항상 존재함)
   */
  approvedAt: string | null;
  
  /**
   * /product/marking-list API 응답일 때만 'marking' 값으로 옴.
   * 일반 조회 시에는 undefined.
   */
  status?: 'marking' | 'sold out';
}
```

## 3. 안전한 타입 단언 (`satisfies` vs `as`)

### 원칙: `satisfies` 우선 사용
타입을 확정하면서도 원래 값의 구체적인 정보(Literal Type 등)를 유지하고 싶을 때, `as` 대신 `satisfies`를 우선적으로 검토해야 합니다.

**❌ Bad (Type Assertion)**
- `as`를 쓰면 컴파일러가 타입을 맹신하게 되어, 잘못된 속성이나 오타를 잡아내지 못할 수 있음.

**✅ Good (satisfies)**
- 타입 호환성은 체크하되, 실제 값의 타입 정보를 유지함.

### `as` 사용 시 검토 프로세스
코드에서 `as`를 사용하거나 발견했을 때, 다음 단계를 반드시 따르세요.

1.  **대체 가능성 확인**: `satisfies`로 변경했을 때 동일한 목적을 달성할 수 있는지 확인합니다.
    - 가능하다면 → 사용자에게 `satisfies`로 변경을 제안합니다.
2.  **의도 확인 (Double Check)**: `satisfies`로 대체가 불가능하여 `as`가 꼭 필요한 상황(예: 외부 라이브러리 타입 오버라이딩 등)으로 보인다면,
    - 사용자에게 **"여기에 `as`를 사용했는데, 정말 의도하신 것이 맞나요?"** 라고 1회 되묻습니다.
