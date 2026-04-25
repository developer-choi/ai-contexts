# React 컴포넌트 작성 원칙

## mutationKey는 소비처가 있을 때만 사용

`mutationKey`는 `useIsMutating()`, `useMutationState()` 등으로 해당 mutation의 상태를 외부에서 관찰할 때 필요합니다. 소비처 없이 습관적으로 지정하지 않습니다.

- 참고: https://github.com/TanStack/query/discussions/6093
