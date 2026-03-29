---
tags: [file-folder-structure]
---

# 테스트 코드 작성 컨벤션

## 1. 파일 및 폴더 구조
- **파일명**: 대상 파일명 뒤에 `.test`를 붙입니다. (예: `button.tsx` -> `button.test.tsx`)
- **위치**: 대상 파일과 **동일한 폴더**에 위치시킵니다. (불가피한 경우 바로 상위 폴더)

## 2. describe/it 설명 언어
`describe`와 `it` 설명은 한국어로 작성합니다.

## 3. 알고리즘 테스트
- 알고리즘 구현 테스트의 경우, 다양한 Edge Case 와 Boundary Case를 포함해야 합니다.
- 가능하다면 `describe.each` 패턴을 활용하여 여러 케이스를 깔끔하게 관리합니다.
- 알고리즘 구현체의 함수 상단에 시간/공간 복잡도 주석이 포함되었는지, 정확한지 검증합니다.

## 4. 테스트 구조

**describe/it 블록**
```typescript
describe('findKthElement()', () => {
  describe('일반 케이스', () => {
    it('k 번째로 큰 값을 잘 찾아야 한다.', () => {
      expect(findKthElement([1, 2, 3], 3, 'largest')).toBe(1);
    });
  });

  describe('경계값 케이스', () => {
    it('배열의 길이가 1개인 경우에는 항상 그 요소가 반환되야한다.', () => {
      expect(findKthElement([1], 1, 'largest')).toBe(1);
    });
  });

  describe('엣지 케이스', () => {
    it('배열의 길이보다 k값이 더 큰 경우 에러가 던져져야 한다.', () => {
      expect(() => findKthElement([100], 2, 'largest')).toThrow(TypeError);
    });
  });
});
```

## 5. describe.each 패턴

**여러 구현체 동시 테스트**
```typescript
const algorithms = [
  {name: 'Bubble Sort', fn: bubbleSort},
  {name: 'Selection Sort', fn: selectionSort},
  {name: 'Quick Sort', fn: quickSort},
];

describe.each(algorithms)('정렬 알고리즘 > $name', ({fn}) => {
  it('배열을 오름차순으로 정렬해야 한다', () => {
    const {output} = fn({value: [3, 1, 2], order: 'asc'});
    expect(output).toEqual([1, 2, 3]);
  });
});
```

## 6. 값 리터럴 직접 전달 선호

```typescript
// ✅ Good
expect(anagramUsingHashmap('listen', 'lists')).toBe(false);

// ❌ Bad
const s1 = "listen";
const s2 = "lists";
expect(anagramUsingHashmap(s1, s2)).toBe(false);
```
