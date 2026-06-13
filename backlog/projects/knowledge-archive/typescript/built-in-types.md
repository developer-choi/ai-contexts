# TypeScript Built-in Types — any / unknown / never / void / 대문자 타입

본인 학습 자료. TS 공식 핸드북 인용 + 본인 의사결정 + TODO.

## References

- [TS Handbook — Do's and Don'ts (any)](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html#any)
- [TypeScript FAQ (GitHub Wiki)](https://github.com/Microsoft/TypeScript/wiki/FAQ)
- [void는 undefined랑 다르다 (SO)](https://stackoverflow.com/a/58885486)
- [TS Playground: unknown and never](https://www.typescriptlang.org/play/#example/unknown-and-never)
- [TS Handbook — Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [TS Handbook — 5-minute func: Other important types](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#other-important-typescript-types)
- [Typescript — Union Type, Intersection Type, Etc. | 카카오엔터테인먼트 테크블로그](https://tech.kakaoent.com/front-end/2022/221124-typescript-tip/)

## TODO

### any vs unknown vs never

`any` vs `unknown` vs `never`, `catch`에 전달되는 `error`는 왜.... `unknown`이 되었을까?

일단 합리적이긴 한 게, 진짜로 에러 타입이 뭔지 알 수가 없으니까. `throw '123'`도 되는데... `any` 아니면 `unknown`이 맞긴 하지...

다만 `any` 대신에 `unknown`이 더 적절한지를 알려면, 이 두 타입의 차이점을 이해해야 하긴 하니까…

⇒ 다 해결되면 `any` 쓴 프로젝트 다 찾아서 대체하기.

## Never

[TS Handbook: Never](https://www.typescriptlang.org/docs/handbook/2/functions.html#never)

> Some functions *never* return a value:

```ts
function fail(msg: string): never {
  throw new Error(msg);
}
```

> The *never* type represents values which are never observed. In a return type, this means that the function throws an exception or terminates execution of the program.

> *never* also appears when TypeScript determines there's nothing left in a union.

## void

> *void* represents the return value of functions which don't return a value. It's the inferred type any time a function doesn't have any return statements, or doesn't return any explicit value from those return statements.

> In JavaScript, a function that doesn't return any value will implicitly return the value *undefined*. However, *void* and *undefined* are not the same thing in TypeScript.

## Number / String / Object / Boolean 등 쓰지 말기

[TS Handbook — General Types](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html#general-types)

`Number`, `String`, `Boolean`, `Symbol` and `Object`:

> ❌ **Don't** ever use the types `Number`, `String`, `Boolean`, `Symbol`, or `Object`. These types refer to non-primitive boxed objects that are almost never used appropriately in JavaScript code.

```ts
/* WRONG */
function reverse(s: String): String;
```

> ✅ **Do** use the types `number`, `string`, `boolean`, and `symbol`.

```ts
/* OK */
function reverse(s: string): string;
```

Instead of `Object`, use the non-primitive `object` type (added in TypeScript 2.2).
