# Typescript

## TODO

### Utility Type이 Union에 분배되지 않는 문제

본인 미해결. 학습 필요.

**출처**:

- 본인 [타입에러 예제2 (test-playground)](https://github.com/developer-choi/test-playground/commit/0a18485941ed871d28b6c038eed0cd7aebf56c31)

**증상**:

`Omit<T, K> & Required<Pick<T, K>>` 같은 유틸리티 합성을 유니온 타입에 직접 적용하면 타입 추론이 의도대로 안 됨.

```ts
export type RequiredSpecific<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
```

**의도한 타입 vs 실패 케이스**:

유니온을 외부에서 펼치면 자동완성·타입에러가 정상 동작:

```ts
// 랭디어드민 메인챕터 컨텐츠 생각하며 만듦
interface VideoContent {
  id?: number; // API로부터 받은 컨텐츠는 id가 있고, 사용자가 직접 만든 컨텐츠는 아직 id가 없음
  type: 'VIDEO';
  videoUrl: string;
}

interface SpeechContent {
  id?: number;
  type: 'SPEECH';
  answer: string;
}

const data: RequiredSpecific<VideoContent, 'id'> | RequiredSpecific<SpeechContent, 'id'> = {
  id: 1,
  type: 'VIDEO',
  // videoUrl 자동완성 잡힘
};
```

유니온을 먼저 합쳐서 유틸리티에 넣으면 추론 실패 (타입에러 안 남):

```ts
type Content = VideoContent | SpeechContent;

const data: RequiredSpecific<Content, 'id'> = {
  id: 1,
  type: 'VIDEO',
  // 문제 1. 타입에러 안 남
};
```

**학습 포인트**:

- TypeScript의 Distributive Conditional Types 동작 원리
- Conditional type(`T extends U ? X : Y`)이 naked type parameter에 대해서만 유니온에 분배된다는 규칙
- `Omit`·`Pick`·`Required` 같은 매핑 타입이 유니온에 분배되는지 (또는 안 되는지) 1차 소스(TS Handbook) 확인
- 분배가 필요한 경우 `T extends any ? Util<T> : never` 패턴이 표준 해법인지 검증
