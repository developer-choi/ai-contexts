# Convention

## 주석 작성 스타일

### 예외 상황 문서화
```typescript
/**
 * @throws {RangeError} Stack overflow
 */
abstract push(data: D): void;

/**
 * @throws {RangeError} Stack underflow
 */
abstract pop(): D;
```

### 기존 코드 수정 시
기존 코드 라인이 지워진게 아니라면, 그 기존 코드 라인 위에있는 주석도 제발 지우지 말아주세요

---

## Tanstack Query useMutation() 작성방식
- `mutate` 대신 `mutateAsync` 와 `try-catch` 구문을 사용하는 것을 선호합니다.

### 사용하지 않는 방식

```typescript
const { mutate } = useMutation(mutationFn, {
  onSuccess: () => {
    // 성공 시 로직
  },
  onError: () => {
    // 에러 시 로직
  },
});

mutate(variables);
```

### 선호하는 방식

```typescript
const { mutateAsync } = useMutation(mutationFn);

try {
  await mutateAsync(variables);
  // 성공 시 로직
} catch (error) {
  // 에러 시 로직
}
```
