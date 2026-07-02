# 이력서·깃허브·블로그 최신화 로드맵

이력서·깃허브·기술블로그를 최신화하는 상위 로드맵. 두서없이 모은 재료를 영역별로 정리한다.

## 동기·핵심 결함

문서·이력서마다 **기술적 의사결정에 trade-off가 없다**. 채택한 방법(A)의 장점만 적혀 있고, A를 택해 치른 것 — 딸려오는 단점·비용, 또는 다른 방법을 버려 포기한 것 — 이 빠져 있다. 이력서·깃헙·블로그 문서 전부 이 **교환단점**을 보강해야 한다. (적용 한계·대안 단순 나열은 트레이드오프가 아니라 대상 아님 — 정의는 `tradeoff-guide.md`.)

> 이 트레이드오프를 **앞으로 쓰는 문서에 자동으로 강제하는 규칙**은 `deploy/contexts/writing-guide/tradeoff-guide.md`(SSOT)에 구현됐다 — decision-guide의 장단점 요구를 blog-post·이력서·기술문서로 확장하고, write-init `[가드4]`·write-refine 누락 점검으로 연결된다. 본 로드맵은 그 규칙으로 **기존 문서를 보강하는 실행** 쪽이다.

궁극 목적: AI 활용 구조를 갖춰 **공부시간을 더 확보**한다.

## 우선순위·운영

- 깃헙 블로깅은 **이전 글 보완이 우선**. 신규 글보다 기존 글 보완을 먼저 한다.
- 기존 블로깅 TODO들은 그대로 **킵**(삭제하지 않음).
- **캘린더 우선순위는 따로 정의**한다 (이 로드맵과 별개로 일정·우선순위 체계를 잡는다). → 다음 액션
- 글 양식: **AC 기술블로그 커밋 로그에 글 양식이 있음** → 작성 시 참고한다.

## 이력서·채용문서

대상: DC를 비롯한 각종 채용문서(이력서 등) 전부.

- "가치 언급 1순위" 류 문구 **전부 삭제** — 어필이 안 된다.
- UX는 맨 끝에 **살짝만** 언급.
- 이력서 기술성과 보강 + 의사결정 **tradeoff 보강**.

## 깃헙·블로그 문서

- 잔여 깃헙·블로그 문서 정리.
- 관련 깃헙·블로그 문서 **tradeoff 보강** (위 「핵심 결함」 적용 대상).

### 정적분석 블로그 글 완성 (WIP)

- blog 레포 `feature/hand-off` 브랜치에 정적분석 글 작성 중
- 인수인계 내용도 포함됨 — 브랜치 내용 확인 후 완성 필요

### AC 최상위 README 테스트 링크 → MP 이관

- AC 최상위 README의 테스트 링크를, MP에 테스트를 작성한 뒤 **그 링크로 갈아끼운다**.
- 주의: AC README 수정은 일반 작업에서 직접 하지 않고 `refresh-projects` 스킬 절차를 경유한다(AC 룰).

## best-practice 내용 MP 이관 (완료) — BP 레포는 보존

`my-else/best-practice`(BP)의 핵심 문서 `docs/performance.md`("App Router Streaming으로 TTFB 39% 개선")가 MP `infinite-scroll/step1`과 주제가 겹쳤다. step1은 "무한스크롤을 위한 렌더링 결정", BP는 "Streaming 자체의 성능(TTFB)"이라, BP를 step1에 흡수하지 않고 **별도 MP 가이드로 이관**했다. (원래 「트레이드오프 보강 대상」 ④였으나 보강 대신 이관으로 전환.)

성과 수치(TTFB 39%·번들 48%)는 이전 회사 프로덕션 실측치이고 BP·MP 모두 그 기법을 예제로 재현한 것이라, "회사 달성 → 예제 재현" 프레이밍을 유지해 MP 문서에 실었다.

- **MP (완료·머지·푸시)**: step1 축소(90→41줄) + 신규 가이드 `docs/guides/streaming-ttfb/index.md` 신설(§2 CSR→SSR Prefetch→Streaming 3단계, 원문 문구 보존, 이미지 로컬화). step1 ↔ 가이드 양방향 링크. master `c7d431ff`.
- **라이브 창구 repoint (완료, 미머지)**: DC `README.md`·`docs/vision/ai-delegation-and-review.md`, blog `src/app/about/page.tsx`의 `best-practice/pull/2` → MP streaming-ttfb 가이드 URL. 브랜치 `docs/repoint-bp-link`. 라이브 프로필은 유지보수되는 MP 가이드를 가리키게 한다.
- **BP 레포는 보존(삭제 안 함)** — 이미 제출된 PDF 이력서가 BP `pull/2`를 참조하므로. 라이브 창구만 MP 가이드로 옮기고, 제출본과 BP는 그대로 둔다. 새로 만들 PDF 이력서는 MP 가이드 URL을 쓴다.
- step1 축소 + streaming-ttfb 신설로, 아래 「트레이드오프 보강 대상」의 infinite-scroll step1 중 streaming 항목은 streaming-ttfb 가이드로 이동했다.

## 트레이드오프 보강 대상 — ✅ 완료 (2026-06)

전 프로젝트 식별 약 50군데를 strict-B(교환단점만) 기준으로 보강해 **master 반영 완료**. 규칙 SSOT `tradeoff-guide.md`(교환관계 정의) 확정·머지됨. 세션 키트는 `resume-github-blog-session-prompts.md`. 아래는 식별·방식 기록(잔여 없음).

### 보강 방식

- **init은 시리즈(묶음) 단위로 한 세션에서.** 한 시리즈(예: error-handling 전체)는 step들이 cross-link로 이어지므로 write-init 한 세션에서 묶어 처리한다(write-init의 'N개 skeleton 동시 생성' 활용). refine·커밋은 그 묶음 안에서 진행.
- **보강은 전부 사용자가 새 세션에서.** `write-init`(트레이드오프 내용 채움) → 새 세션 `write-refine`(톤) → 워크트리 커밋까지 사용자가 수행한다. 작업 세션의 누적 컨텍스트가 톤 격리를 깨므로 AI는 보강 작업 자체에 관여하지 않는다.
- **AI 역할 = 로드맵 갱신만.** 사용자가 파일 완료를 알리면 AI가 「대상 목록」에서 그 항목을 삭제하고 진행 상황을 최신화한다(잔여만 유지).
- **적용 한계부터.** 단점을 "작다/합리적"이라 정당화하지 않고 "어떤 경우엔 안 맞는지"부터 적는다 (write-init `[가드4]`·tradeoff-guide).
- **저자 판단·측정값은 날조하지 않는다.** 근거 없으면 `[채울 내용]`으로 남겨 사용자가 채운다.

### 보강 순서 (레포 하나씩, 한 파일씩, 매번 사용자 검사)

채용 동선(이력서에서 링크되는 문서 먼저) + 단점을 실제로 서술할 수 있는 기술 문서 우선, 성과 나열형(`[채울 내용]` 위주)은 뒤로.

1. **MP `docs/guides/`** — 이력서 직접 링크 시리즈. 에러처리(step2→3→4→6) → 무한스크롤(step1→2→4) → 테스트(why→how).
2. **DC `main`** — 이력서/프로필 본체. pr-commit-guide → ai-delegation-and-review → README(성과 나열, [채울 내용] 위주).
3. **MP 그 외** — 비링크 심화. packages/design-system → apps/examples → patterns → static-checking → formatter → archives.

### 대상 목록

**MP `docs/guides/` (17)**
- error-handling: step2(해결방법·성과), step3(경중구분·영향범위), step4(ErrorBoundary 유일 단정), step6(피드백 선택기준·isSuccess 한계)
- infinite-scroll: step1(SSR prefetch·Streaming SEO), step2(next/image·srcset), step3(캐싱·React.memo), step4(재시도 수단·에러 구분)
- testing: why-to-test(유닛/E2E 비율), how-to-test(children 렌더·한 단언)

**MP 그 외 (26)**
- static-checking: eslint(no-floating-promises·misused-promises·max-params), stylelint(공식 플러그인 커버리지)
- formatter(Prettier 대안·printWidth 120)
- patterns: ProviderComposition(retry:0), TestSetup(globals 미사용), WhatToTest(Integration 비용), AtomicPresentationComponent, PropMatrix(1스토리 추적난이)
- archives: trigger-rect-animation(clipPath 단점 칸 "없음")
- packages/design-system: guides step1(직접구현 비용)·step2(AI분석 누락 위험)·step4(모노레포·Turborepo 대안비교), patterns/DesignTokens(CSS변수 단점), README(요약에 단점 없음)
- apps/examples: api-client-design-decisions(abstract class·request 제거·외부 catch), optimistic-update, SsrPrefetchStreaming, ReactCompilerManualMemoization, OverlayKitModal, ErrorHandling
- src/validation/integration/README(Zod 단점·대안 비교)

**DC `main` (6)**
- pr-commit-guide(작은 PR·Squash 적용한계/대안), ai-delegation-and-review(판단고정·비용사다리), README(성과 나열형, 비용·한계 전무)

### 제외 (재스캔 불필요)

- DC `feature/monorepo` — main에 미머지·2개월 방치된 죽은 브랜치. design-system은 MP로 이관된 구버전 중복.
- KA(knowledge-archive) — 학습 노트, placement상 비대상.
- Sentry PR#12 — 문서 아님(PR 본문).
- MP `Introduction.mdx`(요약 문서), `src/rendering/search-result/README`(트레이드오프 이미 충실).
- design-system 정본은 MP `packages/design-system/docs/` 하나로 정리됨.

## AI 활용법 (블로그 주제)

AI 활용법을 **주제별로 나눠서** 글을 작성한다.

### 컨텍스트 엔지니어링

- 공부해서 best practice 컨텍스트를 만들어 둔다.
- 그 컨텍스트를 AI가 **적절한 시점에** 가져가고, 한 번에 **너무 많은 컨텍스트를 들고 있지 않도록** 스킬 / 훅 / 에이전트로 분리해 둔다.
- 결과적으로 공부시간을 더 확보하는 구조로 수렴.

## 다음 액션

- [전체] 캘린더 우선순위 체계 정의 (일정·우선순위를 이 로드맵과 별개로 수립)
- [전체] AI 활용법 글 주제 분할 목록 확정 (컨텍스트 엔지니어링 외 추가 주제)
