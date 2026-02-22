# TanStack Query 작성 패턴

## useSuspenseQuery 우선 사용

데이터 fetching에는 `useQuery` 대신 `useSuspenseQuery`를 사용합니다.

- **로딩 처리**: Suspense boundary의 fallback으로 위임 (스켈레톤 등)
- **에러 처리**: Error Boundary로 위임
- **컴포넌트**: 성공 케이스만 다루면 되므로 `data`가 항상 정의됨

```tsx
// ✅ Good — 컴포넌트는 성공 케이스만 담당
function ProductList() {
  const { data } = useSuspenseQuery(productQueries.list());
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
  const { data, isLoading, isError } = useQuery(productQueries.list());
  if (isLoading) return <Skeleton />;
  if (isError) return <Error />;
  return data.items.map(/* ... */);
}
```

---

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
  listKey: (tenantId: string) => ["organizations", tenantId],
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

### HTTP 클라이언트

`ky` 라이브러리로 공유 인스턴스를 생성합니다. `prefixUrl`은 환경변수로 관리합니다.

```typescript
// shared/api/client.ts
import ky from 'ky';

export const api = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});
```

### API 함수

`queryFn`에 인라인 호출을 넣지 않고, 별도 `api.ts`에서 `{domain}Api` 객체로 그룹핑합니다.

```typescript
// ✅ Good
// api.ts
import { api } from '@/shared/api/client';

export const productApi = {
  getProducts: (params: GetProductsParams) =>
    api.get('api/products', { searchParams: params }).json<PaginatedResponse<Product>>(),
};

// queries.ts — queryFn은 api 함수를 호출만
queryFn: () => productApi.getProducts({ page }),
```

```typescript
// ❌ Bad — queryFn 안에 fetch 로직 직접 작성
queryFn: () =>
  fetch('/api/products').then(res => res.json()),
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
