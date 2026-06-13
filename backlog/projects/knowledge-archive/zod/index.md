# Zod

본인 학습 자료. Zod 기본 + 본인 활용 결론 + TODO.

## References

- [Zod Basics](https://zod.dev/basics)

## TODO

[Features](https://zod.dev/?id=features):

- Works with TypeScript and plain JS
- Built-in JSON Schema conversion
- Extensive ecosystem
- 이 3개가 어떤 의미인지 잘 모르겠음.

[Installation](https://zod.dev/?id=installation)

[Parsing data](https://zod.dev/basics?id=parsing-data) — 검증하는데 비동기 로직이 필요한 경우에 다시 참고하기.

## About

### Schema

> Using Zod, you can define **schemas** you can use to validate data, from a simple string to a complex nested object.

## Features

### Defining a schema

- [Zod API](https://zod.dev/api) — 더 자세한 내용

### Inferring types

(PDF 이미지 placeholder)

### parsing data

> Given any Zod schema, use `.parse()` to validate an input. If it's valid, Zod returns a **strongly-typed** **deep clone** of the input.

- `strongly-typed` = 진짜로 믿을 수 있는 타입의 데이터를 반환한다는 정도의 느낌.
- `deep clone` = 사이드 이펙트가 없음 ㅇㅇ new instance.

[Parsing data](https://zod.dev/basics?id=parsing-data): 에러를 안 던지는 `safeParse()`도 있음.

[Coercion](https://zod.dev/api?id=coercion): 유효성 검증을 하되, 타입 변환도 같이 해주는 `parse()`도 제공함.

### Handling errors

- [Error customization](https://zod.dev/error-customization) — 더 자세한 내용

`handleServerSideError()`랑 `handleClientSideError()`에서 `if error instanceof z.ZodError`인 경우에 `ValidationError`로 감싸되 힌트로 저거 `issues` 집어넣으면 될 듯.

- [Error formatting](https://zod.dev/error-formatting) — 이거 참고해서 에러를 보기 좋게 에러 인스턴스에 넣기

[Include input in issues](https://zod.dev/error-customization?id=include-input-in-issues): 대부분의 경우에 `reportInput: true` 추가해야 함.

## 구체적인 활용 방법

### API 보내기·받기

- API로 데이터 보내기 직전 유효성 검증
- API로 데이터 받고 나서 유효성 검증

검증과 신뢰는 다른 문제. 백엔드 데이터를 신뢰하지 않아서 검증해야 하는 게 아니라, 검증해야 하니까 검증하는 것. 백엔드 개발자도 실수함.

### 폼과 사용하기

`resolver`로 편하게 사용 가능.

페이지마다 살짝 살짝 유효성 검증 규칙 다른 것도 Zod로 삽 가능.
