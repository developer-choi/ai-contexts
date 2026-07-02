# TypeScript enum — 본인 학습 + 결론

본인 학습 자료 + 본인 결정("안 쓸 생각임").

## References

- [TS Handbook: Enums](https://www.typescriptlang.org/docs/handbook/enums.html)
- [타입스크립트 꿀팁 (카카오엔터)](https://tech.kakaoent.com/front-end/2021/211012-typescript-tip/)

## 주의사항

### Heterogeneous enums

[Heterogeneous enums](https://www.typescriptlang.org/docs/handbook/enums.html#heterogeneous-enums)

### keyof typeof

[Enums at compile time](https://www.typescriptlang.org/docs/handbook/enums.html#enums-at-compile-time) — `keyof` 쓰고 싶으면 `keyof typeof` 키워드로 `typeof`까지 같이 써야 함.

### const enum

[const enums](https://www.typescriptlang.org/docs/handbook/enums.html#const-enums) — install해서 사용하는 쪽에서 오류가 날 수도 있음.

물론 해결은 가능하지만, 공식문서에서 안내하는 해결 방법 중 하나가 "Do not use const enums at all"인데 굳이 쓸 이유도 없어 보임.

## 종류

### String enum / Numeric enum

enum에 숫자 / 문자열 저장 가능. 자동 증감은 숫자만 가능함. [reverse mapping](https://www.typescriptlang.org/docs/handbook/enums.html#reverse-mappings)도 숫자만 가능함.

### Constant enum / Computed enum

Constant enum은 [Union enums and enum member types](https://www.typescriptlang.org/docs/handbook/enums.html#union-enums-and-enum-member-types) 이런 특별한 기능이 있음.

### Ambient enum

[Ambient enums](https://www.typescriptlang.org/docs/handbook/enums.html#ambient-enums)

### const enum

[const enums](https://www.typescriptlang.org/docs/handbook/enums.html#const-enums)

## 특별한 기능

### Enum members also become types as well

(PDF 이미지 2)

### Enum types themselves effectively become a union of each enum member

(PDF 이미지 3) 원래 이런 기능이 있었는데, (PDF 이미지 4) enum도 동시에 됨.

## 공식문서 측 입장

[Objects vs Enums](https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums):

> The biggest argument in favour of this format over TypeScript's enum is that it keeps your codebase aligned with the state of JavaScript, and when/if enums are added to JavaScript then you can move to the additional syntax.

## 코드 비교

여러 번 재정의 하는 문제를 2가지 방법으로 해결할 수 있음. (PDF 이미지 6/7/8)

## enum 단점

코드가 좀 증가함. 객체 방식보다. (PDF 이미지 9)

## 결론

위에 주의사항이라는 러닝 커브도 있고, 공식문서 입장도 "enum 써라" 라는 느낌은 아니고… 코드가 상대적으로 좀 더 길어지고 컴파일 결과물도 좀 더 길어지고.

라는 단점 대비 가지는 장점이 뭐가 있지… enum의 장점은 뭘까… 싶어서 안 쓸 생각임.

Tree shaking이 안 된다는 썰도 있던데 타입스크립트 공식 문서에서는 언급이 없었고, 대기업 기술 블로그 안 찾아봤지만 찾아볼 가치를 못 느낌 ㅠㅠ.

## TODO

- PDF 이미지 9개에 코드 예시 있음. 검수 시 옮기기.
