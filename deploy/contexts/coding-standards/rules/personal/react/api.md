# API 함수 작성 패턴

## 수정 API 시그니처

pk를 별도 인자가 아닌 body에 포함시킵니다.

```typescript
// ❌
patchLessonApi(lesson.pk, data)

// ✅
patchLessonApi(data)
```

