> 이관: KA main `knowledge/frontend/javascript/internal/prototype-chaining.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [javascript, concept]
source: unverified
priority:
---
# Questions
- [UNVERIFIED] 프로토타입 체이닝이란 무엇이고, 자바스크립트에서 어떻게 동작하는가?
- [UNVERIFIED] 객체에서 메소드(프로퍼티)를 호출하면 어떤 순서로 탐색되는가?
---
# Answers
## [UNVERIFIED] 프로토타입 체이닝이란 무엇이고, 자바스크립트에서 어떻게 동작하는가?
### User Answer
객체에서 부모의 필드나 메소드에 접근할 수 있는 이유는, prototype 객체끼리 chain처럼 연결되어 있기 때문이다.
자바스크립트는 상속을 prototype으로 구현하고 있다.

먼저, 배열 객체를 만들고 그 배열 객체의 각종 배열 메소드와 필드에 접근할 수 있는 이유는, 배열 객체의 프로토타입 객체 안에 그 메소드/필드가 있기 때문이다.

그런데 배열 객체에서 Object의 메소드도 이용 가능한 이유는, 배열의 프로토타입에 Object의 프로토타입이 연결되어 있기 때문이다.

예시:
```js
const array = [1, 2, 3]
array.__proto__
// [constructor: f, at: f, concat: f, copyWithin: f, fill: f, …]

array.__proto__.__proto__
// {constructor: f, __defineGetter__: f, __defineSetter__: f, hasOwnProperty: f, __lookupGetter__: f, …}
//   constructor: f Object()
//   hasOwnProperty: f hasOwnProperty()
//   isPrototypeOf: f isPrototypeOf()
//   propertyIsEnumerable: f propertyIsEnumerable()
//   toLocaleString: f toLocaleString()
//   toString: f toString()
```

## [UNVERIFIED] 객체에서 메소드(프로퍼티)를 호출하면 어떤 순서로 탐색되는가?
### User Answer
객체 안에 메소드를 호출하면,
제일 먼저 그 객체 안에 해당 프로퍼티가 있는지 찾아본다.
없으면 프로토타입 객체에 그 프로퍼티가 있는지 찾고,
또 없으면 프로토타입 객체 위의 프로토타입 객체 안에 그 프로퍼티가 있는지 찾아보고,
또 없으면 그 위에, 그 위위위로 계속 찾게 되어 있다.

array 객체 프로퍼티 안에는 toString()이 없어서 처음에는 프로토타입 객체 안에 있는 toString()이 실행되어 '1,2,3'이 출력되었지만, 강제로 객체 안에 toString 프로퍼티에 함수를 할당하고 다시 호출해 보니 바뀐 것을 보면 알 수 있다.

```js
array.toString()
// '1,2,3'

array.toString = () => console.log('Call toString method')
// () => console.log('Call toString method')

array.toString()
// Call toString method
```
