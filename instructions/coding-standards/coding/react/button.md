# 버튼 API 호출 시 로딩 처리

버튼 클릭으로 API를 호출하는 경우, 버튼의 loading 관련 props에 적절한 상태를 전달합니다.

## 기본: `isPending`

API 호출 후 같은 화면에 머무는 경우, `isPending`만 전달합니다.

```tsx
// ✅ Good
const { mutateAsync, isPending } = useMutation(/* ... */);

const handleClick = async () => {
  try {
    await mutateAsync();
    // 성공처리 (페이지이동 등)
  } catch (error) {
    // 에러처리
  }
};

<Button loading={isPending} onClick={handleClick}>
  저장
</Button>
```

## 성공 후 언마운트되는 경우: `isPending || isSuccess`

API 성공 후 페이지 이동, 모달 닫힘 등 컴포넌트가 언마운트되는 경우, `isSuccess`를 함께 전달합니다.
그렇지 않으면 API 성공 시점에 로딩이 풀리고, 실제 언마운트까지의 짧은 간격 동안 버튼이 다시 활성화됩니다.

```tsx
const { mutateAsync, isPending, isSuccess } = useMutation(/* ... */);

const handleSubmit = async () => {
  try {
    await mutateAsync();
    router.push('/complete');
  } catch (error) {
    // 에러처리
  }
};

<Button loading={isPending || isSuccess} onClick={handleSubmit}>
  제출
</Button>
```

## loading props가 없는 경우

버튼 컴포넌트에 `loading`, `isLoading` 등 로딩 관련 props가 보이지 않으면, 사용자에게 문의합니다.
