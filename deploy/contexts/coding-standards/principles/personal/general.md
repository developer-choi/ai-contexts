# General Coding Principles

## 도메인 종속 코드 배치

특정 도메인(product, user 등)에서만 사용하는 훅/유틸/컴포넌트는 `shared/`가 아닌 **해당 도메인 폴더**에 위치해야 합니다.

- **❌ Bad**: product에서만 쓰는 `useColumnCount`를 `shared/hooks/`에 생성
- **✅ Good**: `features/product/hooks/useColumnCount.ts`에 생성

`shared/`에는 2개 이상의 도메인에서 공통으로 사용하는 코드만 둡니다.

---

## 아무것도 안 하는 래핑 함수/훅 금지

한 줄짜리 래핑을 위해 별도 함수나 훅을 만들지 않습니다. 로직이 추가될 때 분리합니다.

```typescript
// ❌ 래핑만 하는 훅
export default function useCategories() {
  return useSuspenseQuery(contestQueries.categories.options());
}

// ❌ 래핑만 하는 함수
function getUser() {
  return fetchUser();
}
```

---

## 코드 suppression 사용 금지

`eslint-disable`, `@ts-ignore`, `@ts-expect-error` 등 코드 suppression은 사용하지 않습니다. 사용이 필요하다고 판단되면 사용자에게 명시적으로 설득하여 승인을 받아야 합니다.
