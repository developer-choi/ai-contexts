# TanStack Query 작성 패턴

## useSuspenseQuery 우선 사용

데이터 fetching에는 `useQuery` 대신 `useSuspenseQuery`를 사용합니다.

- **로딩 처리**: Suspense boundary의 fallback으로 위임 (스켈레톤 등)
- **에러 처리**: Error Boundary로 위임
- **컴포넌트**: 성공 케이스만 다루면 되므로 `data`가 항상 정의됨

```tsx
// ✅ Good — 컴포넌트는 성공 케이스만 담당
function ProductList() {
  const { data } = useSuspenseQuery(productQueries.list.options());
  return data.items.map(/* ... */);
}

// 부모에서 Suspense + ErrorBoundary로 감싸기
<ErrorBoundary fallback={<ProductListError />}>
  <Suspense fallback={<ProductListSkeleton />}>
    <ProductList />
  </Suspense>
</ErrorBoundary>
```

```tsx
// ❌ Bad — 컴포넌트 안에서 로딩/에러 분기
function ProductList() {
  const { data, isLoading, isError } = useQuery(productQueries.list.options());
  if (isLoading) return <Skeleton />;
  if (isError) return <Error />;
  return data.items.map(/* ... */);
}
```

---

## Query Factory 패턴

도메인별 `queries.ts` 파일에 `queryOptions` 팩토리를 객체로 그룹핑합니다.

- **네이밍**: `{domain}Queries` (예: `productQueries`, `organizationQueries`)
- **구조**: `list`, `detail` 등 용도별로 구분하고, 각 항목은 `key`와 `options`를 가진 객체
- **`key`**: queryKey를 반환하는 함수. invalidation 시 `key()`만 참조하여 필터 조합과 무관하게 무효화 가능

```typescript
// ✅ Good — src/organization/queries.ts
import { queryOptions } from "@tanstack/react-query";
import { organizationApi } from "./api";

export const organizationQueries = {
  list: {
    key: (tenantId: string) => ["organizations", tenantId],
    options: (tenantId: string, filters?: OrganizationListFilters) => {
      const resolved = { page: 1, search: "", ...filters };
      return queryOptions({
        queryKey: [...organizationQueries.list.key(tenantId), resolved],
        queryFn: () =>
          organizationApi.getOrganizations({ tenantId, ...resolved }),
      });
    },
  },
  detail: {
    key: (organizationId: string) => ["organization", organizationId],
    options: (organizationId: string) =>
      queryOptions({
        queryKey: organizationQueries.detail.key(organizationId),
        queryFn: () => organizationApi.getOrganization(organizationId),
      }),
  },
};

// invalidation — key()로 필터 무관하게 무효화
queryClient.invalidateQueries({ queryKey: organizationQueries.list.key(tenantId) });
```

---

## queryFn에서 API 함수 호출

`queryFn`에 fetch/ky 등 HTTP 호출을 직접 작성하지 않고, `api.ts`에 정의된 API 함수를 호출합니다.

```typescript
// ✅ Good — queryFn은 api 함수를 호출만
queryFn: () => productApi.getProducts({ page }),
```

```typescript
// ❌ Bad — queryFn 안에 HTTP 호출 직접 작성
queryFn: () => fetch('/api/products').then(res => res.json()),
```

---

## 필터 기본값 resolve

list 쿼리에 필터가 있으면, 기본값을 spread로 resolve한 뒤 queryKey에 포함합니다.

```typescript
// ✅ Good — 기본값이 명시적, queryKey에 resolve된 값 포함
list: {
  key: (tenantId: string) => ["items", tenantId],
  options: (tenantId: string, filters?: ListFilters) => {
    const resolved = { page: 1, search: "", ...filters };
    return queryOptions({
      queryKey: [...queries.list.key(tenantId), resolved],
      queryFn: () => api.getList({ tenantId, ...resolved }),
    });
  },
},
```

```typescript
// ❌ Bad — filters를 그대로 queryKey에 넣으면 undefined 포함 시 캐시 불일치
queryKey: ["items", tenantId, filters], // filters가 undefined면 캐시 miss
```
