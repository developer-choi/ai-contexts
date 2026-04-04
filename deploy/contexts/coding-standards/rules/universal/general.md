# General Coding Conventions

## eslint-disable 금지

`eslint-disable` 주석으로 린트 경고를 무시하지 않습니다. 린트 에러는 올바르게 해결하세요.

**예외**: 타입 추론 전용 변수(`z.infer` 등)에 한해 `@typescript-eslint/no-unused-vars` disable을 허용합니다.

```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LessonRowSchema = LessonOriginalSchema.pick({ ... });
export type LessonRow = z.infer<typeof LessonRowSchema>;
```

---

## JS 상수와 CSS 하드코딩 값 동기화

JS 상수(duration, easing 등)를 변경할 때, 같은 의미의 값이 CSS에 하드코딩되어 있는지 grep으로 확인한다. 반대로 CSS 값을 변경할 때도 JS 상수를 확인한다.

---

## 주석 작성 스타일

### 기존 코드 수정 시 주석 보존
기존 코드 라인이 지워진게 아니라면, 해당 라인과 연관된 상단의 주석도 **절대 지우지 마세요**. 

코드가 유지된다면 설명도 유지되어야 합니다.
