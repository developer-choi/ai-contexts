# API 함수 작성 패턴

## HTTP 클라이언트 — ky 사용

HTTP 요청은 `fetch` 대신 `ky`를 사용합니다. 공유 인스턴스를 생성하고 `prefixUrl`은 환경변수로 관리합니다.

```typescript
// shared/api/client.ts
import ky from 'ky';

export const api = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});
```

## API 함수 분리

도메인별 `api.ts`에서 `{domain}Api` 객체로 그룹핑합니다.

```typescript
// ✅ Good — api.ts
import { api } from '@/shared/api/client';

export const productApi = {
  getProducts: (params: GetProductsParams) =>
    api.get('api/products', { searchParams: params }).json<PaginatedResponse<Product>>(),
};
```

```typescript
// ❌ Bad — fetch 직접 사용
fetch('/api/products').then(res => res.json())
```
