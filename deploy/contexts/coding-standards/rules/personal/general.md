---
tags: [file-folder-structure]
---

# General Coding Conventions

## 주석 전면 금지

아래 허용 목록 외 모든 주석 금지.

- **JSDoc `@throws`**: 함수의 예외 상황 명시
- **네이밍·타입으로 전달 안 되는 why**: 의도적 선택의 이유가 코드에 보이지 않을 때
- **eslint-disable**: universal/general.md의 예외 조건에 한함

허용 주석은 `/* */` 블록 주석을 사용합니다.

---

## 반환값·Props는 관심사별로 그룹핑

함수(훅, 유틸)의 반환값이나 컴포넌트 Props가 2개 이상의 관심사를 포함할 때, 플랫하게 나열하지 않고 관심사별 객체로 그룹핑한다.

```tsx
// ❌ Bad — 관심사가 섞여서 소비처에서 구분이 안 됨
function useProductFilter() {
  return { sortBy, gender, brandIds, isActive, handleSortChange, handleGenderToggle, handleReset };
}

// ✅ Good — 현재값(sortBy, filter)과 핸들러가 분리
function useProductFilter() {
  return {
    sortBy,
    filter: { gender, brandIds, isActive },
    handlers: { handleSortChange, handleGenderToggle, handleFilterReset },
  };
}
```
