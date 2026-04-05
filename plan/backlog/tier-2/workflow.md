---
target: deploy/skills/workflow/
---

# Workflow

workflow 스킬의 각 Step에서 발견된 개선점들을 모아둔 백로그.


## [not-ready] 베스트프랙티스맵

workflow 스킬이 마크업/구현 시 참조할 코딩 베스트프랙티스가 흩어져 있거나 암묵적임. MP(monorepo-playground)에 베스트프랙티스맵을 구축하여 구현 품질을 일관되게 하고 규칙 추가/수정을 한 곳에서 관리한다.

### 현황

MP `docs/`에 뼈대와 첫 번째 패턴이 구축되어 있음:

- `docs/best-practices-map.md` — 인덱스. 엔트리 1건 (폼 핸들링: react-hook-form + tanstack query)
- `docs/patterns/form/SomeForm.tsx` — `[ai-only]` 주석 포함 폼 패턴 예제 (99줄)
- `docs/static-checking.md` — ESLint/tsconfig 정적 분석 가이드

workflow step-4에서 `docs/best-practices-map.md`를 이미 참조 중.

### 잔여 작업

#### AC coding-standards → MP 이관

AC의 `deploy/contexts/coding-standards/`에 있는 항목 중 coding standards가 아닌 것들이 섞여 있음. 베스트프랙티스맵 구축 시 AC 컨벤션 대다수를 MP로 옮기고, AC에는 순수 코딩 컨벤션만 남긴다.

##### 분류 기준

- **Coding standard (AC 잔류):** 네이밍, 포맷팅, 린트, 문법 선호 — "일관되게 쓰는 법"
- **Best practice (MP 이관):** 구현 패턴, 아키텍처, 라이브러리 활용 전략 — "문제를 잘 푸는 법"

##### AC 잔류 (5개)

- `rules/personal/naming.md` — 네이밍 컨벤션
- `rules/personal/react/react-hook-form.md` — `useFormWatch()` API 표면 컨벤션
- `rules/personal/typescript/basic.md` — interface vs type, enum 금지 등 문법 선호
- `rules/universal/general.md` — eslint-disable 금지, 주석 보존
- `rules/universal/markup/style.md` — SCSS 모듈, `@use`, classnames

##### MP 이관 (16개)

- `rules/personal/next/basics.md` — App Router layout.tsx 패턴
- `rules/personal/react/api.md` — ky 인스턴스, API 도메인 객체 구조
- `rules/personal/react/tanstack-query.md` — mutateAsync+try-catch, Query Factory, useSuspenseQuery
- `rules/personal/testing/queries.md` — RTL 쿼리 우선순위, 사용자 행동 기반 테스트
- `rules/personal/zod.md` — 스키마 설계 전략, 도메인 타입 파생, 파일 구조
- `rules/universal/react/button.md` — 버튼 loading 상태 전략
- `principles/personal/general.md` — 도메인 스코프 코드 배치, 불필요한 래퍼 금지
- `principles/personal/quality/co-location.md` — co-location 원칙
- `principles/personal/react/basics.md` — Skeleton 컴포넌트 구현 전략
- `principles/personal/react/error-handling.md` — Error Boundary, try-catch 계층 전략
- `principles/universal/quality/maintainability.md` — 응집도/결합도 피드백 기준
- `principles/universal/quality/readability.md` — 인지 부하 최소화, top-down scan, early return
- `principles/universal/quality/testability.md` — 순수함수, DI, 관심사 분리
- `principles/universal/quality/examples/product-list.md` — 리팩토링 worked example
- `principles/universal/react/basics.md` — props 기본값, mutationKey 전략, 이벤트 리스너 타이밍
- `principles/universal/typescript/advanced.md` — satisfies vs as, 타입 단언 리뷰 프로세스

##### 분리 필요 (6개) — 잔류 부분 / 이관 부분

- `rules/personal/general.md` — 주석 금지·import alias·중괄호 잔류 / API 함수 `response.data` 반환 패턴 이관
- `rules/personal/react/basics.md` — 파일 내 코드 순서·named import 잔류 / `<button>` 금지→공유 `<Button>` 사용 이관
- `rules/personal/testing/convention.md` — 파일명·describe 구조·리터럴 규칙 잔류 / 행동 기반 테스트·커버리지 전략 이관
- `rules/universal/markup/html.md` — 디자인 토큰·인라인 스타일 금지·SCSS 잔류 / 시맨틱 마크업(a/Link, form 요소 선택) 이관
- `rules/universal/react/basics.md` — PropsWithChildren·useRef 네이밍 잔류 / React Compiler(memo 금지)·overlay-kit 모달 이관
- `principles/personal/typescript/advanced.md` — 템플릿 리터럴 타입·빈 문자열 유니온 잔류 / nullable 필드 주석 요구 이관

#### DC - MP 이관

DC의 `docs/`에 개발 베스트프랙티스 성격의 문서들이 흩어져 있음. 엔지니어링 가이드, 에러 핸들링, UI 패턴 구현 등 구현 품질에 직접 관련된 문서를 찾아 MP 베스트프랙티스맵으로 이관한다. 커뮤니케이션·비전 등 구현과 무관한 문서는 DC에 잔류.

### 구조

#### 파일 배치

- 최상위 `map.md`가 인덱스 역할
- 각 디렉토리의 `README.md`가 해당 위치의 베스트프랙티스 상세 문서
- 프로젝트 전체 범위 베스트프랙티스는 `docs/`에 배치

#### map.md 엔트리 양식

주제 + 기술스택 조합이 하나의 엔트리. 같은 주제라도 스택 조합에 따라 별도 엔트리로 분기한다.

- 상황: 이 패턴이 필요한 조건 한 줄 — AI가 현재 구현과 매칭 판단하는 용도
- 코드: 별도 스니펫 파일(`.ts`/`.tsx`) 경로 — AI가 README 전체를 분석하지 않고 빠르게 패턴만 참조할 수 있도록
- 상세: 해당 README.md 경로 (있는 경우에만)

```
## 폼 핸들링 패턴

### react-hook-form + zod
- 상황: 폼·URL 등 여러 시점에서 같은 필드를 검증해야 할 때
- 코드: (스니펫 파일 경로)
- 상세: apps/examples/src/validation/integration/README.md

### react-hook-form 단독
- 상황: 단순 폼에서 zod 없이 검증할 때
- 코드: (스니펫 파일 경로)
```


## [not-ready] spec-review / recruitment-review 체크리스트 공유 구조

두 스킬은 입력(피그마 vs 과제요구사항)과 산출물이 다르지만, 봐야 하는 점검 관점(엣지케이스, 플로우, 라우팅, 데이터 등)은 동일하다. 현재 spec-review에만 체계적 체크리스트가 있고, recruitment-review는 SKILL.md에 인라인으로 나열.

### 현황

- spec-review: `checklist/`에 범용 점검(edge-cases, flow, data, routing, features, cross-page)과 디자인 전용(design/)이 한 폴더에 섞여 있음
- recruitment-review: 체크리스트 없이 SKILL.md에 인라인 점검 항목 나열

### 방향

- 범용 체크리스트(edge-cases, flow, data, routing, features, cross-page)를 공유 위치로 분리
- spec-review `checklist/`에는 디자인 전용(design/)만 남김
- recruitment-review도 공유 체크리스트를 참조


## [not-ready] README.md에 팀 에이전트 + Evaluator-optimizer 패턴 소개 추가

workflow 스킬의 README.md에 팀 에이전트(구현자·리뷰어 분리) 구조가 Anthropic 공식 블로그의 Evaluator-optimizer workflows 패턴에 해당한다는 점을 명시한다.

### 근거 (원문 인용)

> "The key insight is that generation and evaluation are different cognitive tasks. Separating them lets each agent specialize—the generator focuses on producing content, the evaluator focuses on applying consistent quality criteria."

When to use:
> - "You have clear, measurable quality criteria that an AI evaluator can apply consistently"
> - "code generation with specific requirements (security standards, performance benchmarks, style guidelines)"

### 해당 조건 매칭

- 구현자(generator) ↔ 리뷰어(evaluator) 분리 → "generation and evaluation are different cognitive tasks"
- coding-standards, conventions를 기준으로 리뷰 → "clear, measurable quality criteria"
- 코드 생성 + 스타일 가이드라인 적용 → "code generation with specific requirements (style guidelines)"

### 참고

- https://claude.com/blog/common-workflow-patterns-for-ai-agents-and-when-to-use-them (Evaluator-optimizer workflows 섹션)

## [not-ready] Step 6 리뷰 산출물에 컨벤션 출처 명시

Step 6 리뷰어가 지적사항을 작성할 때, 해당 지적의 근거가 되는 컨벤션 파일 경로를 함께 명시한다.

예: `rules/personal/naming.md — camelCase 규칙 위반`

사용자가 리뷰 결과를 받았을 때 근거를 바로 확인할 수 있고, 오판 여부를 판단하기 쉬워진다.
