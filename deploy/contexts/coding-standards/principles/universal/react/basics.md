# React 컴포넌트 작성 원칙

## 소비처 없는 기능 금지 (YAGNI)

현재 소비처가 없는 기능은 만들지 않는다. 네이티브 속성으로 가능한 것은 구현 대상이 아니라 `...rest` 통과 대상이다(막지도 않는다 — `Omit`은 컴포넌트가 소유한 prop에만).

```tsx
// ❌ Bad — 쓰는 곳 없는 uncontrolled sugar를 선제 구현
// (defaultValue context 전파 + defaultChecked 계산 + checked·defaultChecked 동시 지정 회피 분기)
const resolvedChecked = checked ?? (group.value !== undefined ? group.value === value : undefined);
const resolvedDefaultChecked =
  resolvedChecked !== undefined
    ? undefined
    : (defaultChecked ?? (group.defaultValue !== undefined ? group.defaultValue === value : undefined));

// ✅ Good — defaultChecked는 우리 코드 0줄, 네이티브 속성으로 ...rest 통과
const resolvedChecked = checked ?? (group.value !== undefined ? group.value === value : undefined);
```

---

## mutationKey는 소비처가 있을 때만 사용

`mutationKey`는 `useIsMutating()`, `useMutationState()` 등으로 해당 mutation의 상태를 외부에서 관찰할 때 필요합니다. 소비처 없이 습관적으로 지정하지 않습니다.

- 참고: https://github.com/TanStack/query/discussions/6093
