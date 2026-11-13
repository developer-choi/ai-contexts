# TypeScript Advanced Patterns

## 정교한 타입 정의

### Template Literal Types 활용
문자열이지만 특정한 패턴(숫자 등)만 허용해야 할 때, `string` 대신 템플릿 리터럴 타입을 사용하여 정확도를 높입니다.

**기본: 숫자로 읽히는 문자열** (`'-1.5'`·`'1e3'`도 포함)
```typescript
// ❌ Less Safe
export type NumericString = string;

// ✅ More Safe
export type NumericString = `${number}`;
```

**심화: 특정 자릿수 숫자 문자열 (예: 2자리)**
```typescript
type OneToNine = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type ZeroToNine = 0 | OneToNine;

export type TwoDigitNumberString = `${OneToNine}${ZeroToNine}`;
```

### 빈 문자열 명시적 구분
값이 "없음"을 나타낼 때, `string` 타입 안에 묵시적으로 빈 문자열(`''`)을 포함시키기보다 명시적으로 유니온을 사용하여 의도를 드러냅니다. `'' | string`은 컴파일러에서 `string`으로 합쳐지므로 타입 검사는 그대로다.

```typescript
// ❌ Ambiguous
interface InquiryArticle {
  img1: string; // 빈 문자열이 '없음'을 의미하는지 불명확
}

// ✅ Explicit & Intuitive
interface InquiryArticle {
  /** 빈 문자열: 서버에서 값이 없음을 빈 문자열로 응답하는 경우 */
  img1: '' | string;
}
```

## 빈 값(Optional, Null)에 대한 주석 규칙

`?`, `null`, `undefined`가 포함된 타입 정의 시, 값이 비는 것이 데이터 상태(아직 고르지 않음, 받지 못함, 서버가 값 없이 응답함 등)이면 그 상황을 주석으로 설명한다.

함수 반환 타입의 `null`·`undefined`도 빈 값 타입 정의로 본다. 데이터 상태인지와 상관없이 어떤 경우에 비어 돌아오는지를 함수 JSDoc(`/** */`)에 `null: …`·`undefined: …` 중 해당하는 것마다 한 줄로 적는다.
