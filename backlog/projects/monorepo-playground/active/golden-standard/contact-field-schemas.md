# Contact Field Schemas 공유화

dada 프로젝트 적용 과정에서 발견된, 골든 스탠다드에 추가를 검토할 패턴.

## 문제: `z.union([z.literal(""), z.format()])` 패턴의 반복

HTML form의 optional 필드는 비어 있을 때 `undefined`가 아니라 **빈 문자열 `""`**을 반환한다.
그래서 "비어 있으면 OK, 값이 있으면 format 검증" 패턴이 필요하고, 이게 프로젝트 전체에서 반복된다.

dada에서의 실제 사용 현황:

| 위치                     | 스키마                | 사용 횟수                       |
| ------------------------ | --------------------- | ------------------------------- |
| `student/schema.ts`      | `optionalEmailSchema` | 2곳 (student profile, guardian) |
| `student/schema.ts`      | `optionalPhoneSchema` | 2곳 (student profile, guardian) |
| `organization/schema.ts` | `websiteSchema`       | 1곳 (organization)              |

총 5회 사용, 3개 스키마가 동일 패턴 `z.union([z.literal(""), z.format()])`.

**현재 문제:**

- `optionalEmailSchema`와 `optionalPhoneSchema`는 `student/schema.ts`에 정의되어 있어서, 다른 도메인(예: teacher, staff)에서 동일 패턴이 필요하면 중복 정의하거나 student에서 import해야 함
- `websiteSchema`는 `organization/schema.ts`에 별도로 동일 패턴을 다시 작성
- 에러 메시지 스타일이 미묘하게 달라질 위험 (도메인별로 각자 작성하므로)

## 제안 A: 구체 스키마를 shared로 이동

```typescript
// shared/schema/contacts.ts
export const optionalEmailSchema = z.union([z.literal(''), z.email('유효한 이메일을 입력해주세요')]).optional();

export const optionalPhoneSchema = z
  .union([z.literal(''), z.string().regex(/^[\d-]+$/, '유효한 전화번호를 입력해주세요')])
  .optional();

export const optionalUrlSchema = z.union([z.literal(''), z.url('유효한 URL을 입력해주세요')]).optional();
```

## 제안 B: 유틸리티 함수로 추상화

```typescript
// shared/utils/zod.ts
function emptyOr<T extends z.ZodType>(schema: T) {
  return z.union([z.literal(''), schema]);
}

// 사용: 에러 메시지를 도메인별로 커스터마이징 가능
const emailField = emptyOr(z.email('유효한 이메일을 입력해주세요')).optional();
const urlField = emptyOr(z.url('유효한 URL을 입력해주세요'));
```

## 장단점

**제안 A (구체 스키마 공유):**

- 장점: import 한 줄로 끝, 에러 메시지 프로젝트 전체 통일
- 단점: 에러 메시지를 도메인별로 다르게 하고 싶을 때 유연성 없음

**제안 B (유틸리티 함수):**

- 장점: 패턴만 공유하고 에러 메시지는 자유, 새로운 format(phone regex 등)에도 대응 가능
- 단점: 결국 각 도메인에서 매번 스키마를 조합해야 하므로 코드 절약이 크지 않음

**안 하는 경우의 단점:**

- 현재 5회 사용으로 심각한 수준은 아님. 새 도메인이 추가될 때마다 동일 패턴을 복붙하게 되고, 에러 메시지 통일이 점점 어려워짐

## 판단

현재 규모(5회)에서는 급하지 않음.
새 도메인(teacher 등)이 추가되는 시점에 제안 A로 추출하는 것이 적절.
`emptyOr` 유틸리티는 패턴이 3종류(email, phone, url) 이상으로 늘어날 때 검토.
