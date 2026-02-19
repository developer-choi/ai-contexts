# Zod 스키마 컨벤션

## 스키마 정의

### 원본 스키마는 모든 필드를 required, non-nullable로 정의합니다

깨끗한 단일 원천을 유지하고, 파생 스키마에서만 `.pick()`과 `.extend()`로 제약을 변경합니다.

```typescript
const LessonOriginalSchema = z.object({
  pk: z.number().int().positive(),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(5000),
  lessonType: z.enum(['online', 'offline']),
  capacity: z.number().int().min(0),
});
```

### 원본 스키마는 export하지 않습니다

위에서 만든 `LessonOriginalSchema`는 파생용 단일 원천일 뿐, 상세 API 응답 타입과 일치하지 않을 수 있습니다.
외부에서 직접 사용하면 실제 API 형태와 다른 타입을 참조하게 됩니다.

### 런타임 검증에 안 쓰이는 파생 스키마도 export하지 않습니다

1. **런타임 검증에도 쓰이는 스키마** (safeParse, zodResolver 등) → export합니다.
2. **타입만 파생하기 위한 스키마** → TypeScript 문법만으로는 원본의 제약을 유지한 채 파생할 수 없어서 만드는 것이므로, 스키마 자체는 export하지 않고 `export type`만 내보냅니다.

```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LessonRowSchema = LessonOriginalSchema.pick({
  pk: true, title: true, lessonType: true, capacity: true,
});
export type LessonRow = z.infer<typeof LessonRowSchema>;

export const CreateLessonSchema = LessonOriginalSchema.pick({
  title: true, lessonType: true, capacity: true,
});
```

### `.partial()` 금지

어떤 필드가 optional인지 스키마 정의만 보고 알 수 있어야 합니다.

```typescript
// ❌
const UpdateLessonSchema = CreateLessonSchema.partial().extend({
  pk: z.number().int().positive(),
});

// ✅
const UpdateLessonSchema = CreateLessonSchema.extend({
  pk: z.number().int().positive(),
});
```

### 중첩 스키마는 변수로 분리합니다

`z.array(z.string().max(...)).max(...)`처럼 스키마 안에 스키마가 들어가면, 체이닝 흐름이 끊기고 안쪽/바깥쪽 제약이 헷갈립니다.
안쪽 스키마를 변수로 꺼내면 각각이 체이닝으로 읽힙니다.

```typescript
// ❌ 안쪽 .max()가 문자열 제한인지 배열 제한인지 한눈에 안 보임
tagList: z.array(
  z.string().max(20, '태그는 20자 이내로 입력하세요')
).max(10, '태그는 최대 10개까지 가능합니다'),

// ✅ 안쪽 스키마를 변수로 분리
const tagSchema = z.string()
  .max(20, '태그는 20자 이내로 입력하세요');

tagList: z.array(tagSchema)
  .max(10, '태그는 최대 10개까지 가능합니다'),
```

`z.enum()`이나 `z.union()` 등도 동일합니다. 원본 스키마 위에 변수로 분리합니다.

```typescript
const boardTypeEnum = z.enum(BOARD_TYPES.values);

const BoardOriginalSchema = z.object({
  boardType: boardTypeEnum,
});
```

### 에러 메시지 반드시 지정

`z.enum()`, `z.string()`, `.min()`, `.max()` 등에 사용자 & 개발자가 볼 메시지를 명시합니다.

```typescript
// ❌
z.enum(['online', 'offline'])
z.string().min(1).max(100)

// ✅
z.enum(['online', 'offline'], {
  errorMap: () => ({ message: '수업 유형을 선택해주세요' }),
})
z.string()
  .min(1, '제목을 입력해주세요')
  .max(100, '제목은 100자 이내로 입력해주세요')
```

---

## 스키마 파생

### .pick() 위주로 파생하고, .omit()은 지양합니다

`.pick()`은 포함할 필드를 명시하므로 결과 타입을 바로 알 수 있습니다.
반면 `.omit()`은 제외할 필드를 보고 나머지를 머릿속으로 계산해야 합니다.

TypeScript에서도 `Omit`과 `Pick`을 중첩하면 읽기 어려운 것과 같은 이유입니다.

특히 아래처럼 omit 대상을 변수로 분리하면, 스키마 정의만 보고는 어떤 필드가 남는지 파악하기 더 어려워집니다.

```typescript
// ❌
const serverGeneratedFields = {pk: true, createdAt: true, updatedAt: true, viewCount: true} as const;
export const CreateLessonSchema = LessonOriginalSchema.omit(serverGeneratedFields);

// ✅
export const CreateLessonSchema = LessonOriginalSchema.pick({
  title: true, lessonType: true, capacity: true,
});
```

---

## API

### snake_case ↔ camelCase 변환은 es-toolkit으로 합니다

서버는 snake_case, 프론트는 camelCase를 사용합니다. 수동 변환 함수 대신 `toCamelCaseKeys`/`toSnakeCaseKeys`로 일괄 변환합니다.

```typescript
import {toCamelCaseKeys, toSnakeCaseKeys} from 'es-toolkit';

// 요청 — camelCase → snake_case
const raw = await api.post('api/lesson', {json: toSnakeCaseKeys(body)}).json<ServerLesson>();

// 응답 — snake_case → camelCase
return toCamelCaseKeys(raw);
```

### Server 타입은 api.ts 하단에 정의합니다

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

### API 응답값 변환은 API 레이어에서 합니다

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

### 응답 검증은 validateApiResponse로 합니다

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

### 수정 API 시그니처

pk를 별도 인자가 아닌 body에 포함시킵니다.

```typescript
// ❌
patchLessonApi(lesson.pk, data)

// ✅
patchLessonApi(data)
```

### 쿼리스트링은 query-string 라이브러리로 통일합니다

API 호출과 페이지 이동 모두 객체를 쿼리스트링으로 변환해야 합니다.
`URLSearchParams`로 직접 하면 배열 처리, 빈 문자열 제거, undefined 생략을 매번 **수동으로** 작성해야 합니다.

```typescript
const qs = queryString.stringify({
  ...data,
  lessonType: isAllTypes ? undefined : data.lessonType,
  category: data.category === 'all' ? undefined : data.category,
}, {skipEmptyString: true});
router.push(qs ? `/lesson?${qs}` : '/lesson');
```

`query-string`은 배열을 `key=a&key=b`로, `undefined`는 자동 생략, `skipEmptyString`으로 빈 문자열도 제거해 줍니다.

---

## 파일 배치

### 도메인 스키마 — schema.ts에 모아둔다

한 도메인의 스키마(목록, 상세, 생성, 수정, 필터 등)는 전부 `schema.ts`에 둡니다.

당장은 `z.infer`로 타입만 추출하고 런타임 검증에는 안 쓰이는 스키마도 있습니다.
사용처 파일로 옮기고 싶을 수 있지만, `schema.ts`에 두는 게 낫습니다.

- 나중에 런타임 검증이 필요해지면 다시 옮겨야 하고, import 경로도 전부 바꿔야 합니다.
- 원본 스키마에서 `.pick()`으로 파생하고 있으므로, 같은 파일에 있어야 자연스럽습니다.

### UI 전용 타입 — 사용처 컴포넌트에 둔다

`LessonListFilterForm`(필터 폼에서 `'all'`을 추가한 타입)처럼, **특정 컴포넌트에서만 쓰이는 타입**은 해당 컴포넌트 파일에 선언합니다.

```typescript
interface LessonListFilterForm extends Omit<LessonListFilter, 'category'> {
  category: LessonListFilter['category'] | 'all';
}
```

> 기준: **도메인 데이터의 형태**면 schema.ts, **특정 UI에서만 쓰이는 파생 타입**이면 사용처.

---

## 미정리

- DTO 때문에 타입을 이중으로 선언해야 하는 경우가 생깁니다. 그러면 폴더와 파일 위치를 어떻게 구성할 것인지 고민이 필요합니다.
- 응집도와 결합도 관점에서, 각 파일에 얼마만큼의 코드가 작성되어야 할까요? 스키마 파일 하나에 CRUD + 폼 + 필터폼을 전부 작성하기는 어렵습니다.
