---
type: note
subtype: design-thinking
audience: 본인 (나중에 다시 읽을 용도)
purpose: 형제 도메인 공유 타입 배치 판단 기준 필기
key_message: 공통 코드 여부는 "변경 축이 같은지"로 판단한다. 이름·스키마 동일성은 공유 근거가 아니다.
length_target: 현재 분량 유지. 함축 금지, 외부 공개용처럼 과하게 풀지 않음.
---

# 형제 도메인 간 공유 타입, 어디에 둘까

## 상황

세 형제 도메인 Article, Notice, FAQ가 있습니다. 셋 다 `{ title, body }` 같은 동일한 스키마의 컨텐츠 타입을 씁니다. 이 타입을 어디에 둘지 고민입니다.

초기 배치를 잘못 하면 나중에 해체 비용이 큽니다. 예를 들어 형제 도메인 중 하나에 타입이 정의되어 있고 나머지가 그걸 직접 import하는 구조를 생각해 봅니다. Article·Notice·FAQ 세 도메인으로 단순화하면 다음과 같습니다.

```ts
// article-types.ts
export interface ArticleContent {
  title: string;
  body: string;
}

// notice-logic.ts (남의 도메인)
import type { ArticleContent } from '../article/article-types';
const noticeData: ArticleContent = { /* ... */ };
```

문제점은 다음과 같습니다.

- Article 파일 수정이 Notice/FAQ에 조용히 영향을 줍니다.
- Article 도메인을 제거하려 하면 형제들이 끌려옵니다.
- 형제 관계인데 Article이 부모처럼 취급됩니다 (의존성 방향 왜곡).
- 읽는 사람이 "왜 Notice가 Article을 import하지?"를 의심합니다.

## 해결 방법 세 가지

### 1. alias로 경로만 세탁

```ts
// notice-types.ts
import type { ArticleContent } from '../article/article-types';
export type NoticeContent = ArticleContent; // 핵심!

// notice-logic.ts
import type { NoticeContent } from './notice-types';
```

얼핏 타당해 보이는 발상입니다. 소비자는 자기 도메인 파일에서 타입을 import하므로 경계가 지켜진 것처럼 보이고, 중복 정의도 피합니다. 그러나 세 가지 이유로 직접 import 방식보다 나쁘다고 봅니다.

**첫째, 커플링은 그대로입니다.** alias는 별명일 뿐 같은 타입입니다. TypeScript의 구조적 타입 체계에서 `NoticeContent`와 `ArticleContent`는 완전히 상호 교환 가능합니다. `ArticleContent`를 받는 함수에 `NoticeContent`가 그대로 들어가고, 그 반대도 성립합니다. "Notice는 Notice 타입만 받아야 한다"는 도메인 경계가 타입 레벨에서 전혀 작동하지 않습니다.

**둘째, 탐지 난이도만 올라갑니다.** Article 타입 파일을 수정할 때 "누가 영향받나"를 알아내려고 `ArticleContent` grep을 돌려도 `notice-logic.ts`는 안 잡힙니다. 소비자가 `NoticeContent`로 참조하고 있기 때문입니다. 결국 `NoticeContent` alias 체인까지 추적해야 실제 의존이 드러납니다. 직접 import는 적어도 의존이 정직하게 노출되지만, alias 방식은 의존을 숨깁니다.

**셋째, 언젠가 반드시 해체해야 합니다.** Notice에 자기만의 필드 하나를 추가하려는 순간 alias가 깨집니다. 예를 들어 Notice에 `publishPeriod`가 생기면 `NoticeContent = ArticleContent & { publishPeriod: ... }` 같은 억지 확장을 만들거나 alias를 interface로 승격해야 합니다. 전자는 Article이 Notice의 기반처럼 취급되는 왜곡을 더 심화시키고, 후자는 "그럴 거면 처음부터 공용 분리나 완전 중복으로 갔어야 한다"로 귀결됩니다. 해체 시점에는 이미 alias를 쓰던 소비자 코드가 쌓여 있어 영향 범위도 더 커져 있습니다.

지금 alias 방식을 선택하는 것은 이 해체 작업을 미래로 미루는 것일 뿐, 비용을 줄이는 것이 아닙니다. **세 가지 이유를 종합하면 alias 방식은 선택지에서 제외하는 것이 합리적이라고 판단합니다.**

### 2. 공용 위치로 분리

어느 형제도 아닌 도메인 중립 위치에 타입을 두고, 셋 다 거기서 import합니다.

```ts
// shared/content-types.ts
export interface ContentBase {
  title: string;
  body: string;
}

// article-types.ts
import type { ContentBase } from '../shared/content-types';
export type ArticleContent = ContentBase;

// notice-types.ts
import type { ContentBase } from '../shared/content-types';
export type NoticeContent = ContentBase;

// faq-types.ts
import type { ContentBase } from '../shared/content-types';
export type FAQContent = ContentBase;
```

### 3. 완전 중복

각자 자기 타입을 독립적으로 소유합니다. 서로 import하지 않습니다.

```ts
// article-types.ts
export interface ArticleContent { title: string; body: string; }

// notice-types.ts
export interface NoticeContent { title: string; body: string; }

// faq-types.ts
export interface FAQContent { title: string; body: string; }
```

## 2번 vs 3번, 무엇으로 가르는가

핵심 정의는 다음과 같습니다.

> **공통 코드 = 미래에 변경 이유가 같은 코드.**

이름이 같음, 스키마가 같음, 지금은 똑같음 — 공유의 근거가 아닙니다. **변경 축이 같은지**가 기준입니다.

### 2번의 함정

타입만 공유하고 convert·validate 같은 조립 로직을 각 도메인에 두면, 스키마 변경 시 결국 세 곳을 건드려야 합니다. 공유의 이득이 생각보다 작을 수 있습니다.

공용 파일 이름은 개념 단위(`content-types.ts`)로 짓습니다. `common.ts` 같은 잡다한 모음은 God module이 됩니다.

### 3번의 비용

같은 버그가 세 곳에 있으면 각자 잡아야 합니다. 일관된 네이밍(`*Content`)이 유일한 방어선입니다.

시간이 지나면 세 타입이 조금씩 달라집니다. 이건 정상입니다. "원래 달랐음"이 드러나는 것이므로 억지로 다시 묶지 않습니다.

> "Duplication is far cheaper than the wrong abstraction." — Sandi Metz
