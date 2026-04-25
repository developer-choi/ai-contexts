# General Coding Conventions

## eslint-disable 금지

`eslint-disable` 주석으로 린트 경고를 무시하지 않습니다. 린트 에러는 올바르게 해결하세요.

**예외**: 타입 추론 전용 변수(`z.infer` 등)에 한해 `@typescript-eslint/no-unused-vars` disable을 허용합니다. 그 외 예외가 필요하다고 판단되면 사용자에게 명시적으로 설득하여 승인을 받습니다.

```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LessonRowSchema = LessonOriginalSchema.pick({ ... });
export type LessonRow = z.infer<typeof LessonRowSchema>;
```
