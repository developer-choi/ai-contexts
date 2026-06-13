# null vs undefined — 작성 중단된 WIP

본인 학습 자료. `knowledge/null-undefined` 브랜치(커밋 b918bc9 "null vs undefined 만들던중")에서 작성하다 중단된 문서를 보존한다. main에 동일 주제 문서가 없어 백로그로 옮긴다.

종료 조건: 아래 내용을 정리(중복 질문 통합, OA 영어 원문/User 구분, MDN 외 stackoverflow 출처 정리)해 KA 본문 `knowledge/frontend/javascript/`로 정식 편입하면 이 파일 삭제.

첫 행동: 아래 "What is the difference between null and undefined?" 항목이 가장 완성도 높음(MDN OA + 비교표 + Reference). 이를 축으로 나머지 단편 답변을 흡수.

---

# Questions
- What's the null?
- What's the undefined?
- null과 undefined의 공통점이 뭔가요?
- null과 undefined의 차이점이 뭔가요?
- null은 언제 사용하나요?
- undefined는 언제 사용하나요?

# Answers
## What's the null??
The null keyword refers to the null primitive value, which represents the intentional absence of any object value.

## null과 undefined의 공통점이 뭔가요?
Like undefined, accessing any property on null throws a TypeError.

Like undefined, null is treated as falsy for boolean operations, and nullish for nullish coalescing and optional chaining.

## null과 undefined의 차이점이 뭔가요?
The typeof null result is "object". This is a bug in JavaScript that cannot be fixed due to backward compatibility.


## What is the difference between null and undefined?
### keywords
`null`, `undefined`, `typeof`, `primitive value`, `falsy`

### Official Answer
**null**
The `null` value represents the intentional absence of any object value. It is one of JavaScript's primitive values and is treated as falsy for boolean operations.
> `null` keyword refers to the null primitive value. Unlike `undefined`, `null` is not an identifier but a syntax keyword.

**undefined**
The `undefined` global property represents the primitive value `undefined`. It is one of JavaScript's primitive types. A variable that has not been assigned a value is of type `undefined`. A method or statement also returns `undefined` if the variable that is being evaluated does not have an assigned value.

**Comparison**
| Feature | `null` | `undefined` |
| :--- | :--- | :--- |
| **Definition** | Intentional absence of any object value. | Absence of a value (not assigned yet). |
| **Type (`typeof`)** | `"object"` (Historical bug) | `"undefined"` |
| **Equality (`==`)** | `null == undefined` // true | `undefined == null` // true |
| **Identity (`===`)** | `null === undefined` // false | `undefined === null` // false |
| **Numeric Context** | Coerced to `0` (e.g., `1 + null === 1`) | Coerced to `NaN` (e.g., `1 + undefined` is `NaN`) |
| **JSON Serialization** | Included (`{"a": null}`) | Omitted (`{"a": undefined}` -> `{}`) |

> JavaScript is unique to have two nullish values: `null` and `undefined`. Semantically, their difference is very minor: `undefined` represents the absence of a value, while `null` represents the absence of an object.

### Reference
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/null
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined
- https://stackoverflow.com/questions/5076944/what-is-the-difference-between-null-and-undefined-in-javascript
