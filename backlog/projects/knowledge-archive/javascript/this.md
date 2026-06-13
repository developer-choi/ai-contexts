# `this` — TS Class·영단어 풀이

본인 학습 자료. TypeScript Class에서의 `this` + 본인 영단어·문법 풀이 노트.

## `this` 키워드는 함수가 어떻게 호출되었는가에 의존

> The keyword 'this' same 'some' in `[some].method()`.

> **Long story short**, **by default**, the value of `this` inside a function depends on how the function was called. In this example, because the function was called through the `obj` reference, its value of `this` was `obj` **rather than** the class instance.

본인 영단어 풀이:

- Long story short = 간단히 말해서
- by default = 기본적으로 (= Basically)
- **B라기보다… A다.** 라는 어감인가? Not A but B랑 비슷하네.
  - `This is rather an airplane than a car.` = 이것은 자동차라기보다… 비행기다.
  - `This is rather a cafe than restaurant` = 이것은 카페다. 레스토랑이라기보다…
  - rather A than B = A rather than B
  - `This is not an airplane but a car.`

> This is **rarely** what you want to happen! TypeScript provides some ways to mitigate or prevent this kind of error.

- Adverb, not often: on very few occasions; almost never.

> TypeScript is also not good at **inferring** type when it is related to this.

In the above case, the result is not 'MyClass' but 'obj'. But inferred type is 'MyClass'.

[TS Documentation — Classes: arrow-functions](https://www.typescriptlang.org/docs/handbook/2/classes.html#arrow-functions) — Here's what's difficult about This.

## Parameter Properties

> TypeScript offers a special syntax for turning a constructor parameter into a class property with the same name and value. These are called parameter properties and are created by prefixing a constructor argument with one of the visibility modifiers `public`, `private`, `protected`, or `readonly`.

That is surprising syntax. But I will not use that.

## Class Expression

> Class expressions are very similar to class declarations. The only real difference is that class expressions don't need a name, **though** we can **refer to** them **via** whatever identifier they **ended up** **bound** to:

본인 영단어 풀이:

- though: Conjunction, But.
- refer to: 참조하다.
  - 영어책에서는 자동사 + 전치사 + N로 쓰이는 타동사 목록을 보여줬는데 그중에 `refer to N`를 "N을 말하다, N을 언급하다"라고 알려줬지만 저기서는 "참조하다"라고 해석됨.
- via: Preposition, 통해서, 경유해서. 컴공에서는 "통해서"라는 뜻으로 먼저 해석하면 될 듯. (via == through)
- I really don't know what this means.
- Bound라는 동사가 아니라 `bind` 동사의 과거? 과거분사? 형이더라. 그렇지만 여전히 잘 모르겠음.

> Both expressions are valid syntax.

## Abstract Class

> Classes, methods, and fields in TypeScript **may** be abstract.

> An abstract method or abstract field is one that hasn't had an **implementation provided.**

본인 영단어 풀이:

- The word 'May' can mean that you can do it like 'can'.
- ??? 어떻게 어순이 저렇게 되지? 모르는 단어는 없긴 한데…

> **These members** **must exist inside an abstract class**

- I misunderstood that I had to be in Abstract class. Does Abstract Class necessarily contain at least one abstract member? I misunderstood that. (It wasn't actually.)

> The role of abstract classes is to **serve** **as** a base class **for** subclasses that do implement all the abstract members. When a class doesn't have any abstract members, it is said to be **concrete**.

- 다 아는 단어인데도 모르겠고
- Concrete가 뭐지 파파고 번역도 잘 모르겠다.

## TODO

- `this` 동작 1차 소스(MDN, ECMA-262) 검증.
- TS Class arrow function method 패턴으로 `this` 바인딩 보존하는 코드 예시 정리.
- PDF 이미지 7개 placeholder — 검수 시 코드 옮기기.
