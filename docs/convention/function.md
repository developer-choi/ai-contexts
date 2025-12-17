# 함수 작성 패턴

## 함수 선언 방식

**일반 함수 표현식 (선호)**
```typescript
// ✅ Good - Named export function
export function getUserData(id: string) {
  // ...
}

// ❌ Bad - export 함수에 화살표 함수 사용
// 최상위 export 함수는 function 키워드를 사용하고,
// 화살표 함수는 콜백/짧은 유틸에 한정한다.
export const getUserDataArrow = (id: string) => {
  // ...
};

export function calculateTotal(items: Item[]) {
  // ...
}

// ✅ Good - Default export
export default function bubbleSort({order, value}: SortParam): SortResult {
  // ...
}
```

**화살표 함수**
- 콜백 함수
- 이벤트 핸들러 (useCallback 내부)
- 짧은 유틸리티 함수

```typescript
// ✅ Good - 콜백
const onClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
  // ...
}, [loading]);

// ✅ Good - 짧은 유틸리티
const double = (n: number) => n * 2;
```

## 함수 파라미터

**구조 분해 활용**
```typescript
// ✅ Good
function Input({label, error, ...rest}: InputProps) {
  // ...
}
```

**인터페이스로 타입 정의**
```typescript
interface SortParam {
  value: number[];
  order: 'asc' | 'desc';
}

/**
 * 매개변수 개수가 3개 이상으로 늘어나는 경우에는
 * 개별 인자를 나열하기보다는, 의미 있는 하나의 객체 파라미터로 묶고
 * 별도의 인터페이스/타입으로 정의하는 것을 선호한다.
 */
function sort(param: SortParam) { }
```

## 반환 타입

**명시적 반환 타입 지정 (선호)**
```typescript
// ✅ Good
function bruteForceTwoSum(array: number[], target: number): boolean {
  // ...
  return false;
}

function calculateSum(numbers: number[]): number {
  return numbers.reduce((sum, num) => sum + num, 0);
}
```

## 비동기 함수

**async/await 일관되게 사용**
```typescript
// ✅ Good
export async function postBoardApi(board: PostBoardApiRequest) {
  const response = await fetchFromClient('/api/board', {
    method: 'POST',
    body: board
  });
  return response;
}

// ❌ Bad - Promise 체이닝 피함
export function postBoardApi(board: PostBoardApiRequest) {
  return fetchFromClient('/api/board', {
    method: 'POST',
    body: board
  }).then(response => response);
}
```