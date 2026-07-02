# Iterator Pattern / Iterable Protocol — 종합 정리

본인 미해결. 본인 학습 자료 + LLM 답변 캡처 통합. 1차 소스(MDN, ECMA-262) 보강 후 학습 시 검증 필요.

상세 사용 시나리오·본인 코드는 [`generator.md`](./generator.md)에도 정리 있음 — 통합 검토 필요.

## References

- [MDN: Iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator)
- 본인 [toArray를 Array.from()으로 대체 커밋 (dsa-playground)](https://github.com/developer-choi/dsa-playground/commit/0529b2059304f9f87de0cb8a6e100207009fa29e)

## Note (LLM 답변 캡처)

> **이터레이터 패턴(Iterator Pattern)**을 구현한다는 것은, 정확히 말해 JavaScript의 **이터러블 프로토콜(Iterable Protocol)**을 따르는 것을 의미합니다.
>
> 객체에 `[Symbol.iterator]` 라는 키로 메서드를 구현해두면, 그 객체는 '이터러블(iterable, 반복 가능)객체'가 됩니다. 그리고 일단 이터러블 객체가 되면, 말씀하신 모든 기능들이 마법처럼 잠금 해제됩니다.

### 1. Spread Syntax (전개 구문, `...`)

가장 대표적인 기능. 객체의 요소들을 하나씩 펼쳐서 배열이나 다른 곳에 넣을 수 있음.

```ts
const tree = new YourTree<number>();
tree.add(1);
tree.add(2);
tree.add(3);

// 1-1. 배열로 변환
const arrayFromTree = [...tree]; // [{data: 1, level: 0}, {data: 2, level: 1}, {data: 3, ...}]

// 1-2. Set으로 변환 (중복 제거)
const setFromTree = new Set(tree);
```

### 2. `for...of` 루프

가장 흔하게 사용되는 기능. 객체의 각 요소를 순회하며 코드를 실행.

```ts
for (const node of tree) {
  console.log(`Value: ${node.data}, Level: ${node.level}`);
}
```

### 3. Destructuring Assignment (구조 분해 할당)

이터레이터가 반환하는 순서대로 값을 변수에 할당.

```ts
const [root, leftChild, rightChild] = tree;

console.log(root.data);       // 1
console.log(leftChild.data);  // 2
console.log(rightChild.data); // 3
```

### 4. `Array.from()`

이터러블 객체를 명시적으로 배열로 만들 때 사용.

```ts
const anotherArray = Array.from(tree);
```

### 5. 다른 컬렉션 생성자의 인자

`Map`, `Set`, `WeakMap`, `WeakSet` 등 다른 컬렉션을 만들 때 초기값으로 이터러블 객체를 전달할 수 있음.

```ts
// Set 생성자로 바로 전달
const mySet = new Set(tree);

// Map을 만들 때 응용
// 예를 들어, 각 노드의 데이터를 key로 사용하는 Map 만들기
const myMap = new Map(
  [...tree].map(node => [node.data, node])
);

console.log(myMap.get(2)); // { data: 2, level: 1 }
```

## Note — toArray() 대체

`toArray()`가 이제 더이상 필요한 경우가 잘 없음..

[toArray를 Array.from()으로 대체 커밋](https://github.com/developer-choi/dsa-playground/commit/0529b2059304f9f87de0cb8a6e100207009fa29e)

### 하지만 필요한 경우가 간혹 있음.

```ts
export abstract class BinaryTree<D> {
  public abstract [Symbol.iterator](): Generator<{data: D, level: number}, void, undefined>;
}
```

이미 이렇게 iterator 패턴을 구현했기 때문에, data / level 데이터는 알아서 필요하면 `Array.from()`을 쓸거고,

```ts
toArray(): D[][] { ... }
```

이렇게 필요한 경우가 있을 수 있기에 구현해놓는 것도 나쁘지는 않음.

### `[...set]` `[...map]`을 일일이 외울 필요가 없음.

`Array.from()` vs Spread Syntax (`...`)

| 기능 | `Array.from()` | `[...iterable]` (Spread Syntax) |
|---|---|---|
| 기본 기능 | 이터러블(iterable) 또는 배열 유사(array-like) 객체를 실제 배열로 변환. | 이터러블 객체를 펼쳐서 새로운 배열을 만듦. |
| 매핑 기능 | **매우 강력함.** 두 번째 인자로 매핑 함수를 받아, 배열을 만들면서 동시에 각 요소를 변환할 수 있음. **한 번의 순회**로 모든 작업이 끝남. | 기능 없음. 일단 배열로 변환한 뒤, 별도로 `.map()`을 호출해야 함. 배열 생성 후 다시 순회하므로 **두 번의 순회**가 필요함. |
| `this` 컨텍스트 | 세 번째 인자로 매핑 함수 안에서 사용할 `this` 값을 지정할 수 있음. (드물게 사용됨) | `this`를 지정하는 기능이 없음. |
| 지원하는 타입 | 이터러블 객체 + 배열 유사 객체 (`length` 속성과 인덱스를 가진 객체)를 지원. | 이터러블 객체만 지원함. (대부분의 경우 큰 차이는 없습니다.) |

`[...map]` 기능에

1. 1번 째 인자 ⇒ `ArrayLike<T>`
2. 2번 째 인자 ⇒ `map()` 기능
3. 3번 째 인자 ⇒ `this` 지정

을 추가하면 `Array.from()` 인데, 99% `Array.from()` 쓰는 경우가 진짜 딱 Array 변환만 하는 경우니까, 그런 경우에는 더 짧은 `[...map]` 문법이 나음.

⇒

1. `Array.from().map()` 하면 바보
2. `[...set]` 이 되네? 아하 `Array.from()`도 되네? 하면 바보. `[...set]` 되면 `Array.from()`도 되는 거임

## Usage

### 외부에는 데이터로 공개하기 & 구현 강제하기

```ts
export abstract class BinaryTree<D> {
  public abstract [Symbol.iterator](): Generator<{data: D, level: number}, void, undefined>;
}
```

내부를 Array로 구현하던, Linked List로 구현하던, 어쨌든 외부에서 `for of`로 쓸 때는 저렇게 쓸 수 있어야 하니까.

### 강제로 구현시킨 예시

```ts
public* [Symbol.iterator](): Generator<{data: D, level: number}, void, undefined> {
  for (const {node, level} of this.traverse()) {
    yield {data: node.data, level};
  }
}
```

### 외부에 공개되면 안되는 별도의 iterator pattern 따로 개발하기

```ts
private* traverse(): Generator<SinglyNode<D>, void, undefined> {
  let pointer = this.head;
  while (pointer) {
    yield pointer;
    pointer = pointer.next;
  }
}
```

SinglyLinkedList에서 노드를 직접 순회한다거나 LinkedListBinaryTree에서 직접 노드를 순회한다거나.

## 막힌 지점 — iterable iterator 이해 (2026-06-07, KA digest 세션)

동기: KA에서 MDN Iteration_protocols를 digest하다가 **iterable iterator**에서 이해가 막혀 중단. 나중에 이 지점부터 이어서 학습. (KA 저장 위치: `knowledge/frontend/javascript/internal/iteration-protocols.md` — 현재 iterable·iterator·next() 4건만 저장, iterable iterator 3건은 이해 못 해 삭제함)

종료 조건: iterable iterator 개념을 이해하고 KA에 다시 저장하면 이 섹션 삭제.

### 내가 막힌 지점 (오해)

1. **용어 구분 자체가 안 됨**: iterable / iterator / `Symbol.iterator` / iterator protocol / iterable iterator가 다 비슷해 보여 뭐가 뭔지 헷갈림. 특히 `Symbol.iterator`(키)와 iterator(객체)를 같은 걸로 착각.
2. **"난 next()를 구현한 적이 없는데?"**: 내 binary tree 코드는 `*[Symbol.iterator]()`(제너레이터)만 짰고 `next()`를 손으로 쓴 적 없어서, "iterator는 next()를 가진 객체"라는 정의와 내 코드가 연결이 안 됨.
3. **잡종(iterable iterator)의 목적이 안 잡힘**: 제너레이터를 예시로 설명하면 이해가 안 됨. 제너레이터는 수단일 텐데 목적이 뭔지.
4. **"분리했다며 왜 다시 합쳐?"**: iterable과 iterator를 목적이 있어 분리했다면서, iterable iterator로 다시 합치는 게 모순으로 느껴짐. "iterator만 손에 쥐는 상황"이 왜 생기는지 납득 안 됨.

### 정리된 설명 (LLM 답변, MDN 검증 필요)

**용어 구분** (이 테이블을 KA explained에도 넣기로 함):

| 용어 | 정체 | 한마디 |
|---|---|---|
| `Symbol.iterator` | **키(이름)** | iterable이 순회 메서드를 달 때 쓰는 well-known symbol 열쇠 이름 |
| iterable | **객체** | `[Symbol.iterator]()` 메서드를 가진 객체 (비유: 책) |
| iterator | **객체** | `next()` 메서드를 가진 객체 (비유: 책갈피) |
| iterator protocol | **규약/인터페이스** | "iterator는 next()로 `{value, done}`을 반환해야 한다"는 약속 |
| iterable iterator | **잡종 객체** | iterable + iterator 둘 다 만족. `[Symbol.iterator]() { return this }` |

**왜 iterable / iterator를 분리했나 (책/책갈피 비유)**:
- iterable = 책(저장된 데이터), iterator = 책갈피(순회 위치를 든 커서).
- 책 자신은 위치를 안 들고, 책갈피가 위치를 든다. `iterable[Symbol.iterator]()`를 호출할 때마다 **새 책갈피(위치 0)**가 발급됨.
- 분리 이유 = **한 컬렉션을 동시에/여러 번 순회**하기 위함. 중첩 루프 `for(a of arr) for(b of arr)`가 되는 건 안팎 루프가 각자 책갈피를 따로 받기 때문. 책과 책갈피가 한 몸이면 위치가 공유돼 깨짐.

**오해 2 해소 (next() 자동 합성)**: 제너레이터 함수(`function*`/`yield`)는 호출되면 자동으로 `next()`를 가진 객체(제너레이터 객체)를 반환. `yield`가 "next() 1회 = `{value: yield값, done:false}`"로 번역됨. 그래서 next()를 손으로 안 짜도 iterator가 만들어진 것.

**오해 3·4 해소 (잡종의 목적 + "왜 iterator만 쥐나")**:
- 목적(MDN 문장): "allows an iterator to be consumed by the various syntaxes expecting iterables — almost all syntaxes and APIs expect iterables, not iterators." 즉 `for...of`·스프레드는 iterable을 요구하므로, **커서(iterator)를 그 문법에 바로 쓰려면** iterable 자격(`[Symbol.iterator]() {return this}`)을 붙여야 함.
- "iterator만 손에 쥐는 상황"이 생기는 이유 = **저장된 컬렉션이 아닌 경우**:
  - 지연 뷰: `map.keys()`·`.values()`·`.entries()`는 새 배열을 만들지 않고 **커서(iterator)를 반환**(복사 낭비 회피). `for (const k of m.keys())`가 되는 건 그 커서가 iterable iterator라서.
  - 스트림/무한수열: 저장된 데이터가 없고 값이 그때그때 생성됨 → 만들어내는 행위가 곧 커서.
- 분리 원칙과 모순 아님: 재사용 가능한 "책"은 여전히 `map` 자신이고, `map.keys()`는 호출마다 새 커서를 발급하는 발급기. 반환된 커서 하나는 일회성(`return this`라 상태 공유)이지만, `.keys()`를 다시 호출하면 새 커서가 나옴. 즉 분리는 "저장된 컬렉션"용, iterable iterator는 "커서·스트림"용 — 서로 다른 상황.
- 대가: `return this` 잡종은 한 번 순회하면 소진(재순회 불가). 그래서 재사용 컬렉션(Array·Set)은 잡종이 아니라 호출마다 새 iterator를 주는 순수 iterable로 설계됨 (`Set.prototype[Symbol.iterator]()`).

### 첫 행동 (재개 시)

KA에서 `/digest ON https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols` 켜고, "iterable iterator" 단락(`It is very easy to make an iterator also iterable...`)부터 위 정리를 참고해 다시 이해 → KA에 재저장. 위 용어 테이블 + 책갈피 비유는 KA explained에 넣기로 약속됨.

## TODO

- iterable iterator 정리(위 "막힌 지점" 섹션) MDN/ECMA-262로 1차 검증 후 KA 재저장
- 위 LLM 답변(Note 섹션) MDN/ECMA-262로 1차 검증
- `Array.from()` vs Spread 비교표 검증 (특히 "두 번의 순회" 주장)
- `[Symbol.iterator]` 구현이 abstract class에서 어떻게 강제되는지 정리
- generator.md와 통합 또는 cross-ref 정리
