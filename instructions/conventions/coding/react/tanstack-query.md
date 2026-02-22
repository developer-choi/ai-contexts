# TanStack Query 작성 패턴

## Query Factory 패턴

도메인별 `queries.ts` 파일에 `queryOptions` 팩토리를 객체로 그룹핑합니다.

- **네이밍**: `{domain}Queries` (예: `productQueries`, `organizationQueries`)
- **메서드**: `list`, `detail` 등 용도별로 구분
- **`listKey`**: list 계열 쿼리의 key prefix를 별도 메서드로 노출하여, invalidation 시 필터 조합과 무관하게 한 번에 무효화

```typescript
// ✅ Good — src/organization/queries.ts
import { queryOptions } from "@tanstack/react-query";
import { organizationApi } from "./api";

export const organizationQueries = {
  listKey: (tenantId: string) => ["organizations", tenantId] as const,
  list: (tenantId: string, filters?: OrganizationListFilters) => {
    const resolved = { page: 1, search: "", ...filters };
    return queryOptions({
      queryKey: [...organizationQueries.listKey(tenantId), resolved],
      queryFn: () =>
        organizationApi.getOrganizations({ tenantId, ...resolved }),
    });
  },
  detail: (organizationId: string) =>
    queryOptions({
      queryKey: ["organization", organizationId],
      queryFn: () => organizationApi.getOrganization(organizationId),
    }),
};
```

---

## API 함수 분리

`queryFn`에 인라인 fetch를 넣지 않고, 별도 `api.ts`의 함수를 호출합니다.

```typescript
// ✅ Good — api.ts에서 fetch 로직 담당
// api.ts
export const productApi = {
  getProducts: (params: GetProductsParams) =>
    fetch(`/api/products?${new URLSearchParams(...)}`).then(res => res.json()),
};

// queries.ts — queryFn은 api 함수를 호출만
queryFn: () => productApi.getProducts({ page }),
```

```typescript
// ❌ Bad — queryFn 안에 fetch 로직 직접 작성
queryFn: () =>
  fetch(`/api/products?page=${page}`).then(res => res.json()),
```

---

## 필터 기본값 resolve

list 쿼리에 필터가 있으면, 기본값을 spread로 resolve한 뒤 queryKey에 포함합니다.

```typescript
// ✅ Good — 기본값이 명시적, queryKey에 resolve된 값 포함
list: (tenantId: string, filters?: ListFilters) => {
  const resolved = { page: 1, search: "", ...filters };
  return queryOptions({
    queryKey: [...queries.listKey(tenantId), resolved],
    queryFn: () => api.getList({ tenantId, ...resolved }),
  });
},
```

```typescript
// ❌ Bad — filters를 그대로 queryKey에 넣으면 undefined 포함 시 캐시 불일치
queryKey: ["items", tenantId, filters], // filters가 undefined면 캐시 miss
```
