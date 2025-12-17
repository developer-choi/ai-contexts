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

---

## Git
### add 명령어 주의사항
git add -A 절대 금지 (untracked 파일 포함 위험)

git add [특정파일] 만 사용

### 작업 단위
임의의 소스코드 추가 & 수정작업을 다 한 경우, 커밋을 꼭 남겨야합니다.
