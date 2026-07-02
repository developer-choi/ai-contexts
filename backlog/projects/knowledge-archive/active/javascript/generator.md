---
priority: 1
---

# Generator (`function*`) / Iterable Protocol

## 학습 동기

JS의 `function*` 문법과 Iterable 프로토콜. 본인 dsa-playground 코드에서 `[Symbol.iterator]` + Generator로 커스텀 자료구조를 `for...of`로 순회 가능하게 만들었지만, 문법·이론 정식 학습은 아직.

## References

- [MDN: function*](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/function*) (URL 끝에 `*`가 꼭 있어야 함)
- [MDN: Iteration_protocols](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Iteration_protocols)
- 본인 [traverse() 대신 Iterator 패턴 도입 커밋 (dsa-playground)](https://github.com/developer-choi/dsa-playground/commit/6c0eaed6980b5017e90153005b9e6231ad54a9d6)

## 학습 노트 — 사용 시나리오 4가지

### Usage 1. 순회할 수 있는 자료구조로 만들기

`[Symbol.iterator]`를 Generator로 구현하여 클래스 인스턴스를 `for...of`로 순회 가능하게.

본 예제 코드는 [toArray를 Array.from()으로 대체 커밋 (dsa-playground)](https://github.com/developer-choi/dsa-playground/commit/0529b205#diff-b3b160e500f1175acd0a9d5abc42c7a3b50db70869542c5b6df2cdc9c5fbdbf8) 기준.

```ts
export default class SinglyLinkedList<D> {
  private head: SinglyNode<D> | undefined;

  private* traverse(): Generator<SinglyNode<D>, void, undefined> {
    let pointer = this.head;
    while (pointer) {
      yield pointer;
      pointer = pointer.next;
    }
  }

  public* [Symbol.iterator]() {
    for (const node of this.traverse()) {
      yield node.data;
    }
  }
}
```

사용:

```ts
const list = new SinglyLinkedList<number>();

for (const data of list) {
  console.log(data);
}
```

`Array` 같은 다른 자료구조 처럼 쓸 수 있게 된다.

### Usage 2. 순회할 수 있는 함수로 만들기

함수 자체를 generator로 만들면 함수 호출 결과물을 `for...of`로 순회 가능.

```ts
function* traverseBreadthFirst<D>(
  root: BinaryTreeNode<D>
): Generator<TraversalContext<D>, void, undefined> {
  // 탐색해야하는 노드들
  const nextSearchQueue: InternalIterationItem<D>[] = [{node: root, parent: undefined}];
  // ...
}
```

사용:

```ts
const root = new BinaryTreeNode(10);

for (const {node: {data}} of traverseBreadthFirst(root)) {
  console.log(data);
}
```

### Usage 3. 구조분해 할당 가능한 함수·자료구조로 만들기

Generator 결과물은 배열처럼 구조분해 할당의 source가 될 수 있음.

```ts
const root = new BinaryTreeNode(10);
root.right = new BinaryTreeNode(20);

const [a, b] = traverseAllNodes(root, 'inorder');
console.log(a.node.data, b.node.data);

const list = new SinglyLinkedList<number>();
list.push(1);
list.push(2);
```

### Usage 4. 매개변수로 순회할 값 넘기기

Generator 결과를 다른 함수의 `Iterable<T>` 인자로 넘김. 다 순회하지 않고 한 항목씩 처리 (사용 시점에 명확한 이해는 부족).

```ts
export function setArrayTwoSum(array: number[], target: number): boolean {
  return internalSet(array, target, item => item);
}

function internalSet<T>(
  iterable: Iterable<T>,
  target: number,
  dataToNumber: (item: T) => number
) {
  const set = new Set<number>();

  for (const item of iterable) {
    const data = dataToNumber(item);
    // ...
  }
}
```

BST에서의 사용:

```ts
export function setBSTTwoSum(root: BinaryTreeNode<number> | undefined, target: number) {
  return internalSet(traverseAllNodes(root, 'inorder'), target, item => /* ... */);
}
```

타입 추론:

- 넘겨지는 값(generator 호출 결과): `Generator<Data>`
- 받는 값(파라미터 시그니처): `Iterable<Data>`
- 같은 느낌인듯

## LLM이 정리한 설명 (검증 전 참고용)

원본 구글 문서에 LLM이 추가한 설명. 1차 소스(MDN, ECMA-262) 보강 후 학습 시 검증 필요.

### Iterable Protocol (Usage 1 관련)

Generator를 사용해 `SinglyLinkedList` 같은 커스텀 자료구조를 `Array`처럼 `for...of`로 순회 가능하게 만들 수 있다는 점이 핵심. `[Symbol.iterator]`를 구현하는 것이 결정적.

### Lazy Evaluation (지연 평가, Usage 4 관련)

"Parameter로 넘기는 값을 다 순회하지 않고, for문에서 한번씩 순회할 수 있음" 이 부분이 Generator의 가장 중요한 특징 중 하나인 **지연 평가(Lazy Evaluation)**.

- `traverseAllNodes`와 같은 Generator 함수는 호출 즉시 모든 노드를 순회해서 배열로 만드는 것이 아니다.
- `for...of` 루프가 다음 값을 요청할 때마다 `yield` 문까지만 코드를 실행하고 값을 반환한 뒤 실행을 '일시정지'한다.
- Tree나 Linked List처럼 큰 자료구조를 다룰 때 모든 데이터를 미리 메모리에 올리지 않아도 되므로 **메모리 효율성**을 크게 높여준다.

### Type Compatibility (Generator & Iterable, Usage 4 관련)

"넘겨지는 값은 `Generator<Data>`, 받는 값은 `Iterable<Data>`"라는 추론은 TypeScript 관점에서 정확한 분석.

- Generator 객체는 Iterator이자 Iterable 프로토콜을 모두 만족한다.

## TODO

- 문법(`function*`, `yield`, `yield*`, `next()`, `return()`, `throw()`) 정식 학습
- Iterable vs Iterator 프로토콜 차이 정리
- async generator (`async function*`, `for await...of`)
- 위 LLM 설명 3건을 MDN·ECMA-262 1차 소스로 검증
