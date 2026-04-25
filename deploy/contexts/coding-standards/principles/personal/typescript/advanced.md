# TypeScript Advanced Patterns

## 정교한 타입 정의

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

## 빈 값(Optional, Null)에 대한 주석 규칙

`?`, `null`, `undefined`가 포함된 타입 정의 시 어떤 상황에서 값이 비어있는지 반드시 주석으로 설명한다.
