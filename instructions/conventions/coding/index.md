# General Coding Conventions

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