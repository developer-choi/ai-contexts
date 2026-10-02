---
tags: [file-folder-structure]
---

# General Coding Conventions

## 주석 전면 금지

아래 허용 목록 외 모든 주석 금지.

- **JSDoc `@throws`**: 함수의 예외 상황 명시
- **지우면 깨지는 코드의 이유**: 판정은 「이 주석이 없으면 누군가 이 코드를 지우거나 더 단순해 보이는 형태로 바꿨다가 깨뜨리는가」다. 그렇다면 깨지는 이유를 적는다. 예: 도구·브라우저·명세·외부 API의 동작 때문에 이 코드가 이 모양이어야 하는 경우, 같은 코드베이스의 다른 기능이 이 코드에 기대는 경우
- **빈 값 타입의 설명**: [advanced.md 「빈 값(Optional, Null)에 대한 주석 규칙」](../../principles/personal/typescript/advanced.md#빈-값optional-null에-대한-주석-규칙)
- **eslint-disable**: [universal/general.md 「eslint-disable 금지」](../universal/general.md#eslint-disable-금지)의 예외 조건에 한함

아래는 이유를 설명하더라도 주석으로 달지 않는다. 배경·방침 주석이 위 「지우면 깨지는 코드의 이유」에도 해당하면 그쪽을 따른다.

- 여러 방법 중 이 방법을 고른 배경·대안 비교 → PR 본문이나 결정문에 적는다
- 앞으로 고칠 사람에게 주는 방침 → 파일 위치·이름·타입·린트로 드러내고, 드러낼 수 없으면 달지 않는다
- 호출하는 라이브러리·API가 무엇을 하는지의 설명 → 공식 문서가 출처다. 그 호출을 지우면 깨지더라도 「지우면 깨지는 코드의 이유」로 허용하지 않는다

```ts
/* ❌ 방법을 고른 배경 — 주석이 없어도 아무도 이 style을 지우지 않는다 */
/* SCSS는 TS 값을 import할 수 없어서, shared 색을 body 인라인 style로 넣어 디자인 시스템 토큰을 덮어쓴다 */
export const themeStyle: CSSProperties = { … };

/* ❌ 고칠 사람에게 주는 방침 — packages/shared라는 위치가 이미 말한다 */
/* 웹과 앱이 같은 값을 쓰도록 색 값은 이 파일에만 적는다 */
export const colors = { … } as const;

/* ✅ 지우면 빌드가 깨지는데 코드만 봐서는 빈 선언이 왜 있는지 안 보인다 */
/* TS 6부터 켜진 noUncheckedSideEffectImports가 CSS 부수효과 import를 막아 선언해 둔다 */
declare module '*.css' {}
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
