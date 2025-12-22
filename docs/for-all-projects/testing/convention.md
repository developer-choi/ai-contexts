# 테스트 코드 코딩 컨벤션

### 테스트 파일 상단 실행 명령어

테스트 파일 상단에는 항상 `// yarn test [파일 경로]` 형식의 주석이 존재해야 합니다.

**검증 규칙**
- 리뷰하는 **실제 테스트 파일의 전체 경로**와 주석에 명시된 **[파일 경로]**가 **반드시 일치**해야 합니다.
- **예시:** `substring.test.ts` 파일을 리뷰하는 경우, 주석은 `// yarn test src/data-structure/string/substring.test.ts` 이어야 합니다.
- 만약 `pangram.test.ts` 등 다른 파일명으로 되어 있다면, 이는 **오류**이므로 반드시 지적해야 합니다.

```typescript
// yarn test src/algorithm/sort/sort.test.ts
// yarn test src/data-structure/stack/index.test.ts

describe('Sorting Algorithm', () => {
  // ...
});
```