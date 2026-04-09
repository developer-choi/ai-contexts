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

### 도메인 타입은 항상 Zod 스키마에서 추론합니다

도메인 데이터의 타입은 `z.infer`로 추론합니다. 스키마 없이 `type`이나 `interface`로 직접 선언하지 않습니다.

- 폼 입력 (`zodResolver`), API 응답 (`validateApiResponse`), URL 쿼리스트링 (`safeParse`) 등 외부 입력은 런타임 검증이 필요합니다.
- 당장 런타임 검증에 안 쓰이는 파생 타입(예: `LessonRow`)도 Zod 스키마로 유지합니다.
  - TypeScript 문법만으로는 원본의 제약(min, max 등)을 유지한 채 파생할 수 없기 때문에,
  - `.pick()`으로 파생해야 나중에 런타임 검증이 필요해져도 제약이 보존됩니다.

export 규칙은 스키마를 런타임에 쓰는지에 따라 결정합니다.

```typescript
// 런타임 검증에 쓰이는 스키마 — 스키마와 타입 모두 export
export const CreateLessonSchema = LessonOriginalSchema.pick({ ... });
export type CreateLessonRequest = z.infer<typeof CreateLessonSchema>;

// 타입 추론만을 위한 스키마 — 타입만 export
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LessonRowSchema = LessonOriginalSchema.pick({ ... });
export type LessonRow = z.infer<typeof LessonRowSchema>;
```

도메인 데이터가 아닌 타입(컴포넌트 Props, Server 타입, UI 전용 파생 타입, 유틸리티 타입 등)은 `type`이나 `interface`로 직접 선언합니다.

```typescript
interface LessonTableProps { ... }           // 컴포넌트 Props
interface ServerLesson { ... }               // Server 타입 (.json<T>() 용)
export interface LessonListApiResponse { ... } // API 응답 래퍼
interface LessonListFilterForm { ... }       // UI 전용 파생 타입
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

### 중첩 스키마는 안쪽/바깥쪽 양쪽에 메서드가 있을 때 변수로 분리합니다

`z.array(z.string().max(20)).max(10)` — 안쪽 `.max()`가 문자열 제한인지 배열 제한인지 눈으로 구분하기 어렵습니다. 안쪽 스키마를 변수로 꺼내면 각 메서드가 어느 레벨에 걸리는지 명확해집니다.

```typescript
// ❌ .max()가 어느 레벨 제한인지 헷갈림
tagList: z.array(
  z.string().max(20, '태그는 20자 이내로 입력하세요')
).max(10, '태그는 최대 10개까지 가능합니다'),

// ✅ 안쪽 스키마를 변수로 분리
const tagSchema = z.string()
  .max(20, '태그는 20자 이내로 입력하세요');

tagList: z.array(tagSchema)
  .max(10, '태그는 최대 10개까지 가능합니다'),
```

안쪽에 메서드가 없으면 분리할 필요 없습니다.

```typescript
// 분리 불필요 — 헷갈릴 게 없음
z.array(z.string())
z.array(z.string()).max(10)
```

### 독립된 스키마 조합은 감싸기, 속성 추가는 체이닝을 사용합니다

Zod에는 같은 동작을 감싸기(wrapper)와 체이닝 두 가지로 쓸 수 있는 메서드가 있습니다.

| 감싸기 | 체이닝 |
|--------|--------|
| `z.union([a, b])` | `a.or(b)` |
| `z.intersection(a, b)` | `a.and(b)` |

**독립된 스키마를 조합**할 때는 감싸기를 사용합니다. "둘 중 하나" / "둘 다"라는 구조가 먼저 보입니다.

```typescript
// ❌ .or()가 체인 끝에 묻혀서 놓치기 쉬움
z.string().email('이메일 형식이 아닙니다').or(z.literal(''))

// ✅ 처음부터 "둘 중 하나" 구조가 보임
z.union([z.literal(''), z.string().email('이메일 형식이 아닙니다')])
```

**하나의 스키마에 속성을 추가**할 때는 체이닝을 사용합니다. `.optional()`, `.nullable()`, `.default()` 등이 해당합니다.

```typescript
z.string().email('이메일 형식이 아닙니다').optional()
z.number().int().nullable()
```

### `z.string()`은 자유 텍스트 전용입니다

형식이 정해진 문자열에 `z.string()`만 쓰면 아무 문자열이나 통과합니다. 대응하는 Zod 메서드가 있으면 반드시 사용합니다.

string format 검증은 `z.string().email()` 같은 체이닝이 아닌 **top-level API**를 사용합니다.

```typescript
// ❌ 형식 검증 없음 — 아무 문자열이나 통과
createdAt: z.string()
email: z.string()

// ❌ 체이닝 — 사용하지 않음
email: z.string().email()
createdAt: z.string().datetime()

// ✅ top-level API 사용
email: z.email()
createdAt: z.iso.datetime()
startDate: z.iso.date()
profileUrl: z.url()
userId: z.uuid()
```

`z.string()`에 `.min()/.max()`만 붙이는 것은 `postTitle`, `postContent`처럼 형식 제약이 없는 자유 텍스트에만 사용합니다.

### 에러 메시지 반드시 지정

`z.enum()`, `z.string()`, `.min()`, `.max()` 등에 사용자 & 개발자가 볼 메시지를 명시합니다.

```typescript
// ❌
z.enum(['online', 'offline'])
z.string().min(1).max(100)

// ✅
z.enum(['online', 'offline'], {
  error: '수업 유형을 선택해주세요',
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


