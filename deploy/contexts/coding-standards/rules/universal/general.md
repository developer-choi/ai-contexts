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
