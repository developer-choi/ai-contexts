# General Coding Conventions

## 주석 전면 금지

주석은 코드에서 도출 불가능한 외부 사실(브라우저 버그 우회, 표준 스펙 근거, 전역 스타일과의 경합 등)에만 단다. 코드 구조·의도를 풀어 쓰는 설명 주석과 prop 이름·타입으로 자명한 JSDoc은 금지.

아래 허용 목록 외 모든 주석 금지.

- **JSDoc `@throws`**: 함수의 예외 상황 명시
- **네이밍·타입으로 전달 안 되는 why**: 의도적 선택의 이유가 코드에 보이지 않을 때 (위의 "외부 사실"이 대표 케이스)
- **eslint-disable**: universal/general.md의 예외 조건에 한함

허용 주석은 `/* */` 블록 주석을 사용합니다.

```scss
// ❌ Bad — 코드 구조를 풀어 쓰는 설명 주석 (코드만 봐도 도출 가능)
.content > input {
  // input은 맨몸으로 — 높이·보더·패딩·배경은 InputBase(박스)가 갖고, input은 텍스트만 채운다.
  // (리셋 없으면 브라우저 기본/주변 전역 input 스타일이 먹어 박스보다 커진다.)
  border: none;
  padding: 0;
}

// ✅ Good — 주석 없이 코드만
.content > input {
  border: none;
  padding: 0;
}
```

```scss
/* ✅ Good — 코드에서 도출 불가능한 외부 사실(브라우저 동작)은 유지 */
/* 자동완성 시 브라우저 기본 배경을 덮어 흰 배경을 유지 (input 높이만큼 inset fill). https://stackoverflow.com/a/14205976 */
--shadow-autofill: inset 0 0 0 var(--spacing-2xl) var(--color-bg-primary);
```

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
