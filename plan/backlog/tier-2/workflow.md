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


## [ready] Step 4 — coding-standards 참조 누락 및 프로젝트 유형 미구분 방지

### 발생한 문제

2026-04-06 langdy-design-system InputBase PR 1 계획 중 두 번 연��� 실수:

1. **Step 4 산출��에 coding-standards 참조를 아예 빠뜨림** — Step 4의 "구현 컨텍스트 수집" 절차에서 `coding-standards/map.md`를 읽었지만, 파생 산출물(interface.md, markup.md 등)의 컨벤션 참조 섹션에 경로를 넣지 않음
2. **뒤늦게 추가하면서 회사 프로젝트에 personal/ 경로를 넣음** — `map.md`의 로드 규���("회사 프로젝트: universal/ 만, 개인 프로젝트: universal/ + personal/")을 재확인하지 않고 personal/ 경로를 포함

### 근본 원인

- `map.md`를 "읽��� 것"과 "산출물에 반영하는 것" 사이에 명시적 체크포인트가 없음
- 프로젝트 유형(회사/개인)에 따른 필터링이 절차에 포함되어 있지 않음

### 수정 대상

`deploy/skills/workflow/steps/step-4.md` — "2. 구현 컨텍스트 수집" 섹션

### 수정 내용

#### A. 예방 — 수집 절차에 체크포인트 추가

"코딩 스탠다드 · 베스트프랙티스" 하위에 다음 단계를 명시적으로 추가:

```
1. `coding-standards/map.md` 읽기
2. 프로젝트 유형 판별 (회사 → universal/ 만, 개인 → universal/ + personal/)
3. 해당하는 파일 중 현재 구현에 관련된 것을 선별
4. 선별된 경로를 각 파생 산출물의 "컨벤션 참조" 섹션에 명시
```

#### B. 검출 — 산출물 리뷰 체크리스트에 항목 추가

Step 4의 "5. 산출물 리뷰" 단계에서 리뷰어가 확인할 항목에 추가:

```
- [ ] ��생 산출물에 coding-standards 참조가 포함되었는가
- [ ] 프로젝트 유형(회사/개인)에 맞는 경로만 포함되었는가
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

## [not-ready] 피그마 MCP 원본을 대조용 디자인 값 문서로 캐싱

### 동기

/workflow step 4, 5(마크업 대조/리뷰)에서 피그마 디자인 값과 구현 코드를 1:1 대조할 때, 매번 피그마 MCP를 새로 호출하면:
- MCP 호출 비용(토큰, 시간) 발생
- 세션마다 MCP 변환 결과가 미묘하게 달라질 수 있어 대조 기준이 일관되지 않음
- 같은 노드를 여러 세션에서 반복 읽게 됨

### MCP 출력의 특성

피그마 MCP `get_design_context`는 피그마 레이어 트리를 React+Tailwind 코드로 **자동 변환**하여 반환한다. 피그마 원본 레이어 트리를 직접 주는 것이 아님.

변환된 코드의 className 안에 디자인 토큰명/폴백값/수치가 포함되어 있음:
- `gap-[var(--semantic/gap/sm,8px)]`
- `h-[48px]`
- `text-[color:var(--semantic/color/text/primary,#353535)]`
- `border border-[var(--semantic/color/state/error/foreground,#ff3b30)]`

이 정보로 **신뢰도 높게 대조 가능한 것**: 간격, 패딩, 높이, 색상, 보더, 모서리, 타이포그래피, 토큰 사용 여부, 하드코딩 여부.

**대조 불가한 것**: div 중첩 깊이, HTML 요소 선택(div vs section 등). MCP 변환 레이어가 임의로 변환하므로.

### 하고 싶은 것

피그마 노드를 MCP로 읽은 뒤, 원본 React+Tailwind 코드에서 대조에 필요한 값만 추출하여 구조화된 md 문서로 변환하고 캐싱한다.

#### 변환 규칙

- `data-name` 기준으로 컴포넌트별 섹션 분리 (_Input, _Leading, _InputText, InputCaption 등)
- 각 섹션에 CSS 속성 나열: background, height, padding, gap, border, border-radius, color, font, overflow 등
- 값은 `var(--토큰명, 폴백값)` 또는 고정값 형태 그대로 유지
- 상태별(default, focused, invalid, disabled) 차이만 별도 표기

#### 변환 예시

MCP 원본:
```
className="bg-[var(--semantic\/color\/surface\/elevated,#f2f2f2)] content-stretch flex
gap-[var(--semantic\/gap\/sm,8px)] h-[48px] items-center
px-[var(--semantic\/padding\/md,12px)] rounded-[var(--semantic\/border-radius\/md,16px)]"
data-name="_Input"
```

변환 결과:
```md
### _Input
- background: var(--semantic/color/surface/elevated, #f2f2f2)
- height: 48px
- padding-x: var(--semantic/padding/md, 12px)
- border-radius: var(--semantic/border-radius/md, 16px)
- gap: var(--semantic/gap/sm, 8px)
- layout: flex, items-center
```

#### 검증

변환 후 MCP 원본과 오류 0건까지 대조한다. 누락된 속성이나 잘못된 값이 없는지 확인.

#### 저장 위치

프로젝트의 `plan/background/figma/` 하위에 `*-design-values.md` 형태.

#### 적용 범위

/workflow에서 피그마 URL을 받아 스펙을 정리하는 모든 컴포넌트에 적용.

## [not-ready] Step 6 리뷰 산출물에 컨벤션 출처 명시

Step 6 리뷰어가 지적사항을 작성할 때, 해당 지적의 근거가 되는 컨벤션 파일 경로를 함께 명시한다.

예: `rules/personal/naming.md — camelCase 규칙 위반`

사용자가 리뷰 결과를 받았을 때 근거를 바로 확인할 수 있고, 오판 여부를 판단하기 쉬워진다.
