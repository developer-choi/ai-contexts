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

## snake_case ↔ camelCase 변환은 es-toolkit으로 합니다

서버는 snake_case, 프론트는 camelCase를 사용합니다. 수동 변환 함수 대신 `toCamelCaseKeys`/`toSnakeCaseKeys`로 일괄 변환합니다.

```typescript
import {toCamelCaseKeys, toSnakeCaseKeys} from 'es-toolkit';

// 요청 — camelCase → snake_case
const raw = await api.post('api/lesson', {json: toSnakeCaseKeys(body)}).json<ServerLesson>();

// 응답 — snake_case → camelCase
return toCamelCaseKeys(raw);
```

## Server 타입은 api.ts 하단에 정의합니다

`.json<T>()`의 타입 파라미터로 사용하는 snake_case 인터페이스입니다. `toCamelCaseKeys`가 키 변환은 해주지만, 타입 추론을 위해 Server 타입은 여전히 필요합니다.

```typescript
// api.ts 하단
interface ServerLesson {
  pk: number;
  lesson_title: string;
  lesson_type: string;
  tag_list: string[] | null;
}
```

## API 응답값 변환은 API 레이어에서 합니다

서버와 프론트의 값 표현이 다를 수 있습니다 (예: 서버 `null` → 프론트 `[]`). 이런 변환은 API 함수 안에서 처리합니다. 클라이언트 도메인 스키마(Original)에는 넣지 않습니다.

```typescript
export async function getLessonApi(pk: number) {
  const raw = await api.get(`api/lesson/${pk}`).json<ServerLesson>();
  return validateApiResponse(LessonDetailSchema, {
    ...toCamelCaseKeys(raw),
    tagList: raw.tag_list ?? [],
  });
}
```

흐름: **raw → camelCase 변환 → null 변환 → 스키마 검증**

## 응답 검증은 validateApiResponse로 합니다

변환이 끝난 값을 도메인 스키마로 검증합니다. 검증 실패 시 `ZodError`를 `ValidationError`로 감싸서 throw합니다.

```typescript
// shared/api/parse.ts
import {ZodError} from 'zod';

export function validateApiResponse<T>(schema: {parse: (data: unknown) => T}, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(error);
    }
    throw error;
  }
}
```

## 수정 API 시그니처

pk를 별도 인자가 아닌 body에 포함시킵니다.

```typescript
// ❌
patchLessonApi(lesson.pk, data)

// ✅
patchLessonApi(data)
```

## 쿼리스트링은 query-string 라이브러리로 통일합니다

API 호출과 페이지 이동 모두 객체를 쿼리스트링으로 변환해야 합니다.
`URLSearchParams`로 직접 하면 배열 처리, 빈 문자열 제거, undefined 생략을 매번 수동으로 작성해야 합니다.

```typescript
const qs = queryString.stringify({
  ...data,
  lessonType: isAllTypes ? undefined : data.lessonType,
  category: data.category === 'all' ? undefined : data.category,
}, {skipEmptyString: true});
router.push(qs ? `/lesson?${qs}` : '/lesson');
```

`query-string`은 배열을 `key=a&key=b`로, `undefined`는 자동 생략, `skipEmptyString`으로 빈 문자열도 제거해 줍니다.
