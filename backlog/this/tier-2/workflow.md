---
target: deploy/skills/workflow/
---

# Workflow

workflow 스킬의 각 Step에서 발견된 개선점들을 모아둔 백로그.


## [draft] 베스트프랙티스맵 확장

배치 기준은 `deploy/CLAUDE.md`의 "coding-standards 배치 기준" 참조.

### 1차 이관 완료

AC `deploy/contexts/coding-standards/` 실재 파일은 11개였고 대부분이 MP `docs/patterns/`에 이미 반영됨. 추가 4건 이관 완료:

- API 함수 Response.data 반환 원칙 → `docs/patterns/api/FetchApiClientUsage.md`에 섹션 추가
- 시맨틱 마크업 → `docs/patterns/accessibility/SemanticElements.{md,tsx}` 신규
- React Compiler 수동 메모이제이션 금지 → `docs/patterns/rendering/ReactCompilerManualMemoization.{md,tsx}` 신규
- overlay-kit 모달 → `docs/patterns/overlay/OverlayKitModal.{md,tsx}` 신규

### AC 잔류 확정

- `rules/personal/naming.md` — 네이밍 컨벤션
- `rules/personal/react/react-hook-form.md` — `useFormWatch()` API 표면 컨벤션
- `rules/personal/typescript/basic.md` — interface vs type, enum 금지 등 문법 선호
- `rules/universal/general.md` — eslint-disable 금지, 주석 보존
- `rules/universal/markup/style.md` — SCSS 모듈, `@use`, classnames
- `rules/personal/general.md` — 주석 금지·import alias·반환값 그룹핑·반환 타입 명시 (API 섹션은 MP 이관됨)
- `rules/personal/react/basics.md` — 파일 내 코드 순서, Named Import, PropsWithChildren, useRef 네이밍
- `rules/personal/markup/style.md` — 마크업 개인 스타일 규칙
- `principles/universal/typescript/advanced.md` — satisfies vs as + 검토 절차 (문법 선호)
- `principles/universal/quality/readability.md` — 인지 부하 최소화, top-down scan (원칙·철학)
- `principles/personal/quality/readability.md` — UI 1:1 매칭, 상수 그룹화, 인라인화
- `principles/universal/testability.md` — 테스트 가능 코드 원칙 키워드
- `principles/universal/quality/maintainability.md` — 응집도·결합도
- `principles/universal/quality/examples/product-list.md` — 리팩토링 worked example
- `principles/personal/general.md` — 도메인 스코프 코드 배치, 불필요한 래퍼 금지
- `principles/personal/quality/co-location.md` — co-location 원칙

### 잔여 작업

#### DC → MP 이관

DC `docs/`에 개발 베스트프랙티스 성격의 문서들이 흩어져 있음. 엔지니어링 가이드, 에러 핸들링, UI 패턴 구현 등 구현 품질에 직접 관련된 문서를 MP 베스트프랙티스맵으로 이관. 커뮤니케이션·비전 등 구현 무관 문서는 DC에 잔류.

양식은 MP `docs/best-practices-map.md`의 기존 엔트리와 `docs/patterns/<category>/<PatternName>.md` 파일을 참조한다.


## [ideation] stub 비워진 구현부분 사용자 직접 채우기

### 동기

stub의 빈 구현부를 IMPL에 맡기지 않고 사용자가 직접 채우면 속도가 빠를 수 있다 — fix/workflow 기준으로 IMPL은 stub 위에 본체를 채우면서 리뷰 파이프라인을 도는 흐름이라, 단순한 채움은 사람이 더 빠를 여지가 있음.

### 핵심 아이디어

비워진 구현부의 성격에 따라 분기:

- MP에 참고될 패턴이 있는 자리(공통 hook·utility 등) → IMPL이 채움. 사용자가 직접 채우면 MP 베스트프랙티스 참조 흐름을 놓침
- 일회성·도메인 특화 로직 → 사용자가 직접 채워도 손해 없음

### 미정

분기 판단을 누가 언제 하는지 — PLAN.step-4에서 stub 만들 때? IMPL 진입 시점? 사용자가 stub 본 뒤 선택?


## BG step-1 절차 미준수 (공통 근원: step entry sequence가 [CRITICAL]인데도 "문서는 읽었으나 하위 절차 미실행")

> 아래 [ready]들은 2026-06-13 `/workflow BG 개인`("design-system에 있는 컴포넌트 전부 유닛테스트 추가") 세션에서 동시 관측된 BG(step-1) 절차 누락이다. (시작 전 context-setup 판단 건은 master 반영 완료되어 제거됨.)
> 공통 근원: 메인 LLM이 `steps/step-1.md`를 Read했음에도(= 절차를 봤음에도) step-1.1·step-1.2의 하위 절차를 실행하지 않고 구현 설계로 곧장 진입함. SKILL.md 「step 진입 시퀀스」가 [CRITICAL]로 "step.md 도입부 필수 절차를 먼저 실행, 산출물 작성으로 곧장 흘러가지 않는다"를 요구하나 발동되지 않았다.
> 옆 세션에서 각각 독립 벤치(skill-creator eval)할 수 있도록 위반 사례·채점 기준을 분리해 박는다. 강제 지점(step-1.1 컨벤션 수집 / step-1.2 플래그)이 달라 별도 규칙으로 벤치한다.

## [ready] 1. step-1.1 컨벤션 소스 수집 선제안 절차 강제

### 동기

BG step-1.1의 컨벤션 소스 수집 절차가 누락되면, 레포의 핵심 컨벤션 1차 소스를 초반에 인덱싱하지 못하고 작업 후반(또는 사용자 지적 후)에야 발견해 설계가 어긋난다.

### 진행 상태 (2026-06-13)

- **구현 완료, master 미반영**: 게이트 문안을 `steps/step-1.md` 「Step 1.1 종료 — 분기점」 절에 추가함. 산출물은 **`workflow-conv-gate` 브랜치**(= 50ca9a5 + 게이트 커밋 068a7c8)에 보존. 벤치 보류라 master에는 아직 안 부음.
- **추가한 문안 요지**: `[CRITICAL] 컨벤션 수집 게이트` — spawn 안내/step-1.2 진입 전 (a)(b)(c) 3단계 수행 확인 강제, "step-1.md를 Read한 것만으로 미충족" 명시.
- **벤치 결과(보류)**: sonnet 서브에이전트 2회(iteration-1 오염판 / iteration-2 오염제거판) 모두 **ZERO=with**(게이트 없어도 동일 행동). 원본 위반은 메인-에이전트가 task 모멘텀에 밀려 구현 점프한 것인데, 서브에이전트 벤치는 "워크플로 따르기"로 정렬돼 그 실패 모드를 재현 못함. 결정적 측정 미완.

### 기대상황 (필수)

BG가 step-1.1을 종료(= 후속 세션 spawn 가능 분기점)하기 전에, `steps/step-1.md` 「컨벤션 소스 수집 — 이름 스캔 선제안 + conventions-index.md」 절차가 빠짐없이 발동한다. 그 절차 원문(임베드):

> 1. **이름 스캔 선제안**: 작업 레포가 존재하면 Glob으로 컨벤션 성격의 파일을 **이름만** 스캔한다(`**/CLAUDE.md`, `docs/**`, `*convention*`, `*ARCHITECTURE*` 등). 후보 목록을 사용자에게 선제안한 뒤 채택받는다. 이 단계에서 파일 내용은 읽지 않는다.
> 2. **사용자 보충**: "추가로 참고할 자료가 있나요?"를 확인한다.
> 3. **인덱스 작성**: 채택 소스를 `/plan/background/retained/conventions-index.md`에 "경로 + 한 줄 트리거"로 기록한다.

### 현재상태 (위반 사례 + 채점 기준)

**위반 사례** (2026-06-13 세션): 메인 LLM이 첫 턴에 `steps/step-1.md`를 Read했음에도 위 3단계를 실행하지 않고 곧장 PR1 구현 설계(plan mode + vite.config 수정안 + Button.test.tsx 검증항목 작성)로 진입. 그 결과 레포의 테스트 컨벤션 1차 소스 3건(`docs/patterns/setup/TestSetup.md`, `docs/patterns/testing/WhatToTest.md`, `docs/patterns/testing/TestWriting.md`)을 초반에 인덱싱하지 못했고, 사용자가 "TestSetup.md인가? 거기 참고했어?"로 직접 지적한 뒤에야 뒤늦게 수집·인덱싱함. ("추가 참고자료 있나요?" 질문도 끝까지 안 함.)

**채점 기준**: BG가 후속 세션 spawn 안내/구현 설계 진입 이전에 다음 3동작이 모두 관측되면 통과 —
(a) Glob 이름 스캔 결과를 **후보 목록으로 사용자에게 제시하고 채택**을 받았다,
(b) **"추가로 참고할 자료가 있나요?"**(또는 동의어)를 물었다,
(c) `conventions-index.md`를 작성했다.
하나라도 누락되거나, 사용자 지적 이후 사후 수행이면 실패. (단순히 컨벤션 파일을 혼자 읽고 진행하는 것은 (a) 선제안·채택 부재로 실패.)

**eval 입력**(재현 지시): `/workflow BG 개인` 호출 + 작업 지시 "design-system에 있는 컴포넌트 전부 유닛테스트 추가해야해." (대상 레포: MP = `~/WebstormProjects/main/monorepo-playground`, `packages/design-system`. 단 위 테스트 컨벤션 1차 소스 3건은 MP HEAD에 untracked일 수 있음 — 벤치 시 clean 워크트리에 실재하는 컨벤션 후보로 측정.)

### 결정적 측정 후보 (벤치 보류 해소용)

서브에이전트 벤치로 ZERO=with이 반복됐으므로, 다음 중 하나로 방어 상황을 재현해야 판정 가능:
- (A) 실제 메인 에이전트(opus)를 task에 태워 skill-zero vs skill-with 대조 (블라인드 유지 난이도 있음)
- (B) 하네스에 **구현 모멘텀 주입**("vitest 셋업부터 시작하자" 몇 턴 선행 후 컨벤션 수집으로 course-correct 하는지 측정)
- (C) 게이트를 "벤치 검증 불가하나 값싼 보험"으로 유지 + 검증 불가 사유 문서화

### 종료 조건

게이트 문안이 master `steps/step-1.1`에 반영되고, 위 결정적 측정 중 하나로 (a)(b)(c) 효과가 ZERO 대비 변별되면 → master 머지 후 이 항목 삭제. (단순 sonnet 서브에이전트 재측정으로는 변별 안 됨이 확인됨.)