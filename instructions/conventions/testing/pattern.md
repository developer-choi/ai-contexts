## 10. 테스트 작성 패턴

### 테스트 구조

**describe/it 블록**
```typescript
describe('findKthElement()', () => {
  describe('General cases', () => {
    it('k 번째로 큰 값을 잘 찾아야 한다.', () => {
      expect(findKthElement([1, 2, 3], 3, 'largest')).toBe(1);
    });
  });

  describe('Boundary cases', () => {
    it('배열의 길이가 1개인 경우에는 항상 그 요소가 반환되야한다.', () => {
      expect(findKthElement([1], 1, 'largest')).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('배열의 길이보다 k값이 더 큰 경우 에러가 던져져야 한다.', () => {
      expect(() => findKthElement([100], 2, 'largest')).toThrow(TypeError);
    });
  });
});
```

### describe.each 패턴

**여러 구현체 동시 테스트**
```typescript
const algorithms = [
  {name: 'Bubble Sort', fn: bubbleSort},
  {name: 'Selection Sort', fn: selectionSort},
  {name: 'Quick Sort', fn: quickSort},
];

describe.each(algorithms)('Sorting Algorithm > $name', ({fn}) => {
  it('should sort array in ascending order', () => {
    const {output} = fn({value: [3, 1, 2], order: 'asc'});
    expect(output).toEqual([1, 2, 3]);
  });
});
```

### 값 리터럴 직접 전달 선호

```typescript
// ✅ Good
expect(anagramUsingHashmap('listen', 'lists')).toBe(false);

// ❌ Bad
const s1 = "listen";
const s2 = "lists";
expect(anagramUsingHashmap(s1, s2)).toBe(false);
```