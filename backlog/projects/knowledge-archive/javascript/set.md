# Set — 본인 학습 자료

본인 학습 중. 본인 메모 + 영어 인용 + LLM 답변 캡처 + 본인 결론 통합. 1차 소스(MDN, ECMA-262) 보강 후 학습 시 검증 필요.

## References

- [GFG: Set Theory](https://www.geeksforgeeks.org/maths/set-theory/)

## What's the Set?

> The Set object lets you store unique values of any type, whether [primitive values](https://developer.mozilla.org/en-US/docs/Glossary/Primitive) or object references.

> A set is a data structure that stores a collection of **unique elements**, with **no duplicates** allowed. Sets can be implemented using a variety of data structures, including arrays, linked lists, binary search trees, and hash tables.

Set의 Time Complexity는 구현 방법에 따라 다름.
- Hash Table로 구현한다면, 삽입 / 삭제 / 탐색 셋 다 **평균적으로** O(1)임. 해시충돌 안 난단 가정 하에.
- Array로 구현한다면, 탐색에서 O(n)이 걸림.
- BST로 구현한다면, 삽입 삭제 탐색 셋 다 O(log n)이 걸림.

> In particular, it is, on average, faster than the [Array.prototype.includes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes) method when an array has a length equal to a set's size.

### JS는 그럼 내부적으로 Set을 뭘로 구현함?

단, JS는 Hash Table 기반이라고 함. (출처는 gfg)

이게 멍청한 질문인 거 같음.

**LLM 답변 캡처 (검증 전 참고용)**:

> 말씀하신 대로 JavaScript는 특정 단체(정확히는 **Ecma International**의 **TC39 위원회**)에서 명세(ECMAScript Specification)를 정하고, 이 명세를 바탕으로 각 브라우저 벤더(Google의 Chrome, Mozilla의 Firefox, Apple의 Safari 등)나 Node.js 같은 런타임이 JavaScript 엔진을 통해 이를 구현하는 구조입니다. Java처럼 특정 회사(Oracle)가 버전을 배포하는 방식과는 다릅니다.
>
> 그래서 핵심은 다음과 같습니다.
>
> 1. **ECMAScript 명세의 역할**: 명세는 `Map` 객체가 **어떻게 동작해야 하는지(무엇을 해야 하는지)** 정의합니다. 예를 들어, "키는 고유해야 하고", "삽입 순서를 유지해야 하며", "평균적으로 접근 시간이 sublinear여야 한다"와 같은 동작 규칙을 정의합니다.
> 2. **브라우저/런타임 엔진의 역할**: 각 브라우저나 런타임(예: V8 엔진, SpiderMonkey, JavaScriptCore)은 이 명세가 요구하는 동작을 만족시키기 위해 **어떤 방식으로 내부적으로 구현할지(어떻게 할 것인지)** 결정하고 최적화합니다.
>
> 따라서 MDN 문서에서 "it could be represented internally as a hash table (with O(1) lookup), a search tree (with O(log(N)) lookup), or any other data structure, as long as the complexity is better than O(N)."라고 언급하는 것은, **맵의 내부 구현은 브라우저/런타임 엔진마다 다를 수 있으며, 명세에서 요구하는 '평균적인 sublinear 접근 시간'을 충족하기만 하면 된다**는 의미입니다.
>
> 일부 엔진은 특정 시나리오에서 해시 테이블을 사용할 수 있고, 다른 엔진은 성능상의 이유로 균형 이진 탐색 트리와 같은 다른 데이터 구조를 선택할 수도 있습니다. 심지어 동일한 엔진 내에서도 맵의 크기나 사용 패턴에 따라 내부 데이터 구조를 동적으로 전환하는 최적화 전략을 사용할 수도 있습니다.

## How to implements

### Hash Table

[https://www.geeksforgeeks.org/dsa/introduction-to-set-data-structure/](https://www.geeksforgeeks.org/dsa/introduction-to-set-data-structure/)

> In the case of implementation of Set using [Hash table](https://www.geeksforgeeks.org/hash-table-data-structure/) (as happens in Python) the implementation happens in the following way:

부터 나오는 내용이, "a 집어넣기 전에 a가 있는지 체크한다" 임.

똑같은 근거로 Array로도 Set을 구현할 수 있지만, HashTable 대비 단점이, 넣을 때 O(n)임. a 집어넣기 전에 a가 있는지를 선형탐색 해야하니까.

반대로, Hash Table의 장점은, O(1)임. a가 있는지 바로 알아낼 수 있으니까.

## Applications of Set Data Structure

핵심은 2개임

1. 중복 제거
2. 존재하는지 여부 체크를 빠르게 가능

> Sets are abstract data types that can be used to store unique elements in a collection. Here are some common applications of sets:

### 기본적인거

`add()` `delete()` `has()`

Array의 길이가 아주 크다면 `includes`보다 Set의 `has`가 나을지도. 아니? 애초에 처음부터 Array에 저장을 안 할지도.

### Relation to arrays

```js
const myArray = ["value1", "value2", "value3"];

// Use the regular Set constructor to transform an Array into a Set
const mySet = new Set(myArray);

mySet.has("value1"); // returns true

// Use the spread syntax to transform a set into an Array.
console.log([...mySet]); // Will show you exactly the same Array as myArray
```

이제 `Array.from` 안 해도 되겠구나 더 짧은 문법이 있네.

### Relation to strings

```js
// Case sensitive (set will contain "F" and "f")
new Set("Firefox"); // Set(7) [ "F", "i", "r", "e", "f", "o", "x" ]

// Duplicate omission ("f" occurs twice in the string but set will contain only one)
new Set("firefox"); // Set(6) [ "f", "i", "r", "e", "o", "x" ]
```

1개씩 다 찢어져서 저장되는 것도 놀라운데 그와중에 중복제거도 놀랍네.

### Membership testing

> Sets provide efficient operations for checking if an element is a member of the set, which is useful in various algorithms and data structures.

자료구조에 존재하는지 찾는 걸 멤버십 테스트라고 하나…?

### [Set operations](https://www.geeksforgeeks.org/set-operations/)

> Sets can be used to perform operations such as union, intersection, and difference, which are useful in mathematical set theory and computer science.

A와 B의 여집합 차집합 교집합 합집합 다 구할 수 있음. 꼭 B가 Set이 아니어도 되고, [set-like](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#set-like_objects)이기만 해도 됨.

### Graph algorithms

> Sets can be used to represent vertices and edges in graph algorithms, allowing for efficient operations such as finding connected components, detecting cycles, and computing minimum spanning trees.

### Cache replacement

> Sets can be used to implement cache replacement policies, where the oldest or least recently used elements are removed when the cache is full.

### Database indexing

> Sets can be used to implement indexes in databases, allowing for fast searching and retrieval of data based on specific keys or attributes.

## Disadvantages of Set Data Structure

> Elements in a set can only be accessed with pointers, there is no indexing in a set like arrays.

> Sets can only store elements of a specific data type. (언어마다, 구현방법 마다 다름.)

**LLM 답변 캡처 — 공통된 제약 조건 (검증 전 참고용)**:

- **해시 가능해야 함 (Hashable)**: 해시 테이블 기반 Set의 경우, 저장하려는 요소는 **해시 가능(hashable)**해야 합니다. 즉, 고유한 해시 값을 생성할 수 있어야 합니다. 변경 가능한(mutable) 객체(예: 리스트, 딕셔너리)는 일반적으로 해시 가능하지 않아서 Set에 직접 저장할 수 없습니다. (Python의 Set은 `list`나 `dict`를 직접 저장할 수 없는 이유가 여기에 있습니다.)
- **비교 가능해야 함 (Comparable)**: 트리 기반 Set의 경우, 요소들은 서로 크기를 비교할 수 있어야 합니다. (어떤 것이 더 큰지/작은지 판단하여 트리에 올바르게 위치시킬 수 있어야 합니다.)

> Sets can use more memory than other data structures, such as arrays or lists because they store each element in a separate location.

**LLM 답변 캡처 — 배열 vs Set 오버헤드 (검증 전 참고용)**:

- **배열(Array)의 효율성**: 배열은 요소들을 메모리상에 **연속적으로(contiguous)** 저장합니다. 예를 들어, 정수 배열은 `[정수1][정수2][정수3]` 이런 식으로 데이터만 쭉 붙여서 저장할 수 있습니다. 이 때문에 매우 효율적으로 메모리를 사용합니다.
- **Set의 오버헤드**:
  - **해시 테이블 기반 Set**:
    - **포인터/링크**: 해시 충돌을 해결하기 위해 연결 리스트(체이닝)를 사용하는 경우, 각 요소는 자신의 데이터 외에 다음 요소를 가리키는 **포인터(링크)**를 저장해야 합니다. 이 포인터가 추가적인 메모리 오버헤드입니다.
    - **빈 슬롯**: 해시 테이블은 충돌을 줄이고 빠른 성능을 유지하기 위해 일정 비율의 **빈 슬롯(empty slots)**을 가집니다. 이 빈 슬롯들도 메모리를 차지하지만 실제 데이터는 없습니다.
    - **리사이징 오버헤드**: 크기를 늘릴 때 기존 데이터를 새 공간으로 복사하는 과정에서 일시적으로 더 많은 메모리가 필요할 수 있습니다.
  - **균형 이진 탐색 트리 기반 Set**:
    - 각 노드는 자신의 데이터 외에 **왼쪽 자식 포인터, 오른쪽 자식 포인터**, 그리고 때로는 **부모 포인터**나 트리의 균형 유지를 위한 **추가 메타데이터(예: 레드-블랙 트리의 색깔 정보)**를 저장해야 합니다. 이 포인터와 메타데이터가 요소 하나당 추가적인 메모리 소비를 발생시킵니다.
- **결론**: 배열이나 단순히 링크만 가진 리스트에 비해, Set은 '중복 없는 고유성'과 '빠른 검색/삽입/삭제'라는 특성을 유지하기 위해 내부적으로 더 복잡한 구조를 가지며, 이 구조를 유지하기 위한 포인터나 메타데이터 등으로 인해 **요소당 더 많은 추가 메모리(overhead)**를 사용하게 됩니다.

## Types of Set

### Unordered Set

> using a hash table where keys are **hashed** into indices of a hash table so that the insertion is always randomized.

> All operations on the unordered set take constant time O(1) on an average which can go up to linear time O(n) in the worst case which depends on the internally used hash function, but practically they perform very well and generally provide a constant time lookup operation.

JS의 Set은 Hash Table로 만들었다는 언급이 MDN에는 없지만 gfg에는 있었음. 그치만 MDN에서는 Set이 "You can iterate through the elements of a set in insertion order."이라고 언급했음.

### Ordered Set

> It is generally implemented using balanced **BST**s and it supports O(log n) lookups, insertions and deletion operations.

## 순회 중 삭제하기

```js
const set = new Set(['a', 'b', 'c', 'd', 'e']);

for (const item of set) {
  set.delete(item);
}
```

이 코드가 Set은 잘 됨. Array는 안 됨. 그치만 MDN 공식문서 출처에는 언급이 없더라.

## TODO

- LLM 답변 3건 (JS 엔진 구현 자율성 / Hashable·Comparable 제약 / Set 오버헤드) MDN·ECMA-262 1차 검증
- "순회 중 삭제" 동작이 MDN/스펙에 명시되어 있는지 ECMA-262 §24.2 확인
- Map과 Set 노트 중복 영역 정리 (insertion order 보장, hash/BST 구현 자율성 등)
- knowledge로 승격 검토 (Set은 면접 단골, Q&A 양식 큐레이션 필요)
