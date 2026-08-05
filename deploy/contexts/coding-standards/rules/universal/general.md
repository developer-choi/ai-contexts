# General Coding Conventions

## eslint-disable 금지

`eslint-disable` 주석으로 린트 경고를 무시하지 않습니다. 린트 에러는 올바르게 해결하세요.

**예외**: 타입 추론 전용 변수(`z.infer` 등)에 한해 `@typescript-eslint/no-unused-vars` disable을 허용합니다. 그 외 예외가 필요하다고 판단되면 사용자에게 명시적으로 설득하여 승인을 받습니다.

```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LessonRowSchema = LessonOriginalSchema.pick({ ... });
export type LessonRow = z.infer<typeof LessonRowSchema>;
```

## 레이어 의존 방향 (저수준은 상위를 import 금지)

저수준 레이어(타입 정의 `types/` 등)는 상위 레이어(`features/`, `libs/`, `components/`, `hooks/` 등)를 import하지 않습니다. 의존은 항상 **상위 → 저수준 한 방향**입니다.

타입 파일이 구현 모듈에서 import하면 **역의존**입니다. 그 타입을 쓰는 모든 곳이 구현 모듈까지 끌고 들어오고, 순환 import·"그 기능을 떼어낼 수 없게 묶임"을 유발합니다.

**기계적 체크**: `types/` 폴더 파일의 import 경로에 `features/`·`libs/`·`components/`·`hooks/` 등 상위 레이어가 있으면 위반.

```typescript
// ❌ bad: types/ 가 features/ 를 import (방향이 거꾸로)
// types/card.ts
import { SortMode } from '@/features/board/sortCards';
export interface Card<T extends SortMode> { ... }

// ✅ good: 경계가 되는 타입은 types/ 에 두고, 기능 구현이 그걸 가져다 쓴다
// types/card.ts
export type SortMode = 'BY_DATE' | 'BY_PRIORITY';
// features/board/sortCards.ts
import { SortMode } from '@/types/card';   // 의존 방향: features → types
```

> 비고: 이런 아키텍처 결함은 "types가 최하위 레이어"라는 규칙을 알아야 보인다. 코드만 보면 평범한 import로 보이므로, 리뷰·인계 문서에서 지적할 때는 위배된 규칙(의존 방향)을 함께 명시한다. (복붙·캐스팅 같은 코드-로컬 버그는 코드만으로 드러나므로 규칙 명시 불필요.)

## 라이브러리에 맡긴 검증을 손으로 다시 하지 않는다

라이브러리를 감싸는 래퍼에서, 그 라이브러리가 이미 강제하는 제약을 호출 전에 손으로 또 검사하지 않습니다. 라이브러리를 쓰는 이유가 그 디테일을 떠맡기는 것인데, 손으로 복제한 검사는 아무 일도 하지 않거나 조건이 미묘하게 어긋나 오히려 동작을 갈라놓습니다.

그래도 남길 이유가 있으면(더 이른 시점에 걸러야 한다, 라이브러리보다 나은 메시지를 준다) 그 차이를 테스트로 고정합니다. 테스트로 고정되지 않는 중복 검증은 지웁니다.

```typescript
// ❌ bad: ky가 이미 검사하는 제약을 호출 전에 한 번 더 검사
async get<T>(url: string) {
  assertRelativePath(url);
  return this.client.get(url).json<T>();
}

// ✅ good: 제약은 라이브러리가 소유한다
async get<T>(url: string) {
  return this.client.get(url).json<T>();
}
```

> 사례: 위 `assertRelativePath`는 `prefixUrl`이 빈 문자열일 때만 실제로 발동했다. 그런데 ky는 같은 조건에서 그 경로를 통과시키므로, 이 검사는 다른 경우엔 아무 일도 안 하면서 그 한 경우에만 라이브러리·다른 구현체와 동작을 갈라놓고 있었다. 지워도 깨지는 테스트가 없다는 사실이 그 증거였다.
