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

**반환 타입 명시 기준**
기본적으로 **TypeScript의 Type Inference(타입 추론)** 기능을 최대한 활용합니다. 명시적인 반환 타입은 아래 두 가지 경우에만 작성합니다.

1. **Type Inference가 불가능하거나 의도대로 작동하지 않는 경우**: 복잡한 제네릭 연산이나 조건부 타입이 얽혀 있어 반환값이 무엇인지 코드를 보는 것만으로는 알 수 없을 때.
2. **함수 본문이 100줄 이상인 경우**: 함수가 너무 길어 `return` 구문을 찾기 힘들고, 함수의 최종 결과물을 상단에서 미리 확인해야 할 필요가 있을 때.

그 외의 경우, 특히 호출하는 내부 메서드에 이미 Generic을 전달하여 타입이 결정되는 구조라면 반환 타입을 생략합니다.

**❌ Bad (불필요한 중복 명시)**
```typescript
// apiClient.request<LoginResponse>에서 이미 반환 타입이 결정되므로, 중복해서 작성할 필요가 없습니다.
export function postLoginApi(data: LoginRequest): Promise<LoginResponse> {
  return apiClient.request<LoginResponse>("POST", "/auth/login", data);
}
```

**✅ Good (Type Inference 활용)**
```typescript
export function postLoginApi(data: LoginRequest) {
  return apiClient.request<LoginResponse>("POST", "/auth/login", data);
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