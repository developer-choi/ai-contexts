# 테스트 코드 작성 컨벤션

## 1. 파일 및 폴더 구조
- **파일명**: 대상 파일명 뒤에 `.test`를 붙입니다. (예: `button.tsx` -> `button.test.tsx`)
- **위치**: 대상 파일과 **동일한 폴더**에 위치시킵니다. (불가피한 경우 바로 상위 폴더)

## 2. 테스트 파일 상단 실행 명령어 (필수)
모든 테스트 파일의 최상단에는 해당 테스트를 단독 실행할 수 있는 명령어를 주석으로 명시해야 합니다.

```typescript
// yarn test src/data-structure/stack/index.test.ts
```

**검증 규칙**
- 주석에 적힌 경로가 **현재 파일의 실제 경로**와 100% 일치해야 합니다.
- 파일명이 변경되거나 이동될 때, 이 주석도 반드시 업데이트해야 합니다.

## 3. 영문 변환 가이드
테스트 코드 작성 후, 한글로 된 `describe`와 `it` 설명을 영어로 변환할 때 다음 규칙을 따릅니다.
- 문법적으로 정확하고 자연스러운 영어 문장으로 다듬어서 변환합니다.
- 단순 번역기 투보다는 개발 문맥에 맞는 표현을 사용합니다.

## 4. 알고리즘 테스트
- 알고리즘 구현 테스트의 경우, 다양한 Edge Case 와 Boundary Case를 포함해야 합니다.
- 가능하다면 `describe.each` 패턴을 활용하여 여러 케이스를 깔끔하게 관리합니다.
- 알고리즘 구현체의 함수 상단에 시간/공간 복잡도 주석이 포함되었는지, 정확한지 검증합니다.

## 5. 테스트 구조

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

## 6. describe.each 패턴

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

## 7. 값 리터럴 직접 전달 선호

```typescript
// ✅ Good
expect(anagramUsingHashmap('listen', 'lists')).toBe(false);

// ❌ Bad
const s1 = "listen";
const s2 = "lists";
expect(anagramUsingHashmap(s1, s2)).toBe(false);
```
