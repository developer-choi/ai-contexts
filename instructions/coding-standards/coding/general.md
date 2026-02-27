# General Coding Conventions

## eslint-disable 금지

`eslint-disable` 주석으로 린트 경고를 무시하지 않습니다. 린트 에러는 올바르게 해결하세요.

---

## 주석 작성 스타일

### JSDoc 활용
함수나 클래스의 동작, 특히 **예외 상황**을 명시할 때 JSDoc을 적극 활용합니다.

```typescript
/**
 * @throws {RangeError} Stack overflow if capacity is exceeded.
 */
abstract push(data: D): void;

/**
 * @throws {RangeError} Stack underflow if empty.
 */
abstract pop(): D;
```

### 기존 코드 수정 시 주석 보존
기존 코드 라인이 지워진게 아니라면, 해당 라인과 연관된 상단의 주석도 **절대 지우지 마세요**. 

코드가 유지된다면 설명도 유지되어야 합니다.

---

## 라이브러리 사용 패턴

### Tanstack Query (useMutation)
- `mutate` (콜백 방식) 대신 **`mutateAsync` + `try-catch`** (Promise 방식)을 선호합니다.
- 비동기 흐름 제어가 더 명확하고 에러 핸들링이 직관적입니다.

**❌ Bad (Callback pattern)**
```typescript
const { mutate } = useMutation(mutationFn, {
  onSuccess: () => { /* ... */ },
  onError: () => { /* ... */ },
});
mutate(variables);
```

**✅ Good (Async/Await pattern)**
```typescript
const { mutateAsync } = useMutation(mutationFn);

try {
  await mutateAsync(variables);
  // 성공 로직
} catch (error) {
  // 에러 핸들링
}
```

## API 함수 구현 패턴

### Response.data 반환 원칙
API 호출 함수 내부에서 응답 객체(Response)를 그대로 반환하지 않고, 반드시 **데이터(JSON 등)를 추출하여 반환**합니다.
- `React Query` 사용 시, `status`나 `headers` 같은 불필요한 메타 데이터가 상태에 저장되는 실수를 방지하기 위함입니다.

**❌ Bad (Response 객체 전체 반환)**
```typescript
export function getUserApi() {
  // fetch Response 객체가 그대로 반환됨 (실수 유발 가능)
  return fetch('/api/users/me');
}
```

**✅ Good (Data 추출 후 반환)**
```typescript
export async function getUserApi() {
  const response = await fetch('/api/users/me');
  const data: UserResponse = await response.json();
  return data;
}
```