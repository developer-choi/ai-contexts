# 트레이드오프 보강 — 세션 프롬프트 키트

`resume-github-blog.md`의 「트레이드오프 보강 대상」을 실제로 처리하기 위한 **세션별 붙여넣기 프롬프트**. 묶음(시리즈/폴더) 하나 = 세션 하나. 각 세션 프롬프트 = **아래 「공통 프리앰블」 + 해당 묶음 블록**을 이어 붙인 것.

순서는 `resume-github-blog.md`의 「보강 순서」를 따른다: MP guides(①②③) → DC(④) → MP 그 외(⑤⑥⑦⑧).

> ⚠️ **병렬 실행 주의**: MP 묶음(①②③⑤⑥⑦⑧)은 같은 레포라, 동시에 돌리려면 **각자 전용 워크트리·브랜치**가 필수다. 한 워크트리를 공유하면 워킹트리·인덱스가 섞여 충돌하고, 같은 브랜치는 두 워크트리에서 동시 체크아웃도 안 된다. 아래 각 묶음에 전용 워크트리 생성 명령을 박아뒀다. ④DC는 MP 묶음과 레포가 달라 무관.

---

## 공통 프리앰블 (모든 묶음 앞에 붙인다)

> ## 배경 — 이 작업이 뭐냐
> 기존 기술 문서·이력서·블로그가 기술 선택의 **장점만** 적고 그 선택에 딸려 치른 **트레이드오프**가 빠져 있다. 빠진 트레이드오프를 채워 "왜 이게 정답인지" 검증 가능한 글로 만든다. 규칙 SSOT는 `ai-contexts/deploy/contexts/writing-guide/tradeoff-guide.md`.
>
> ## 트레이드오프란 (이 작업의 범위)
> "어떤 장점을 얻으려 **그에 딸려 치르는 단점·비용**"(교환)만 적는다.
> - **포함**: A에 딸려오는 단점·비용 + "다른 방법 B를 안 써서 포기한 B의 장점".
> - **제외**: 적용 한계("어떤 상황엔 안 맞음")는 교환이 아니라 제외. 대안 단순 나열(B·C가 있다)도 제외 — "A가 포기한 것"으로 이을 때만 포함.
>
> ## 이 세션에서 할 일
> 아래 "대상 문서"에 트레이드오프를 보강한다. **단, 아래 표의 "채울 트레이드오프" 칸은 옛 넓은 기준으로 적힌 것이다. 위 「범위」 정의로 각 항목을 다시 걸러라 — 교환단점이 아닌 것(적용 한계·단순 나열)은 버린다.** 순서: **write-init → write-refine → 워크트리에 문서별 커밋.** 시리즈면 cross-link 보존하며 묶어서 init.
>
> ## 지켜야 할 원칙
> - **무엇과 무엇을 바꿨는지로.** "X를 얻는 대신 Y를 치렀다/포기했다"가 드러나게 적는다. 단점을 "작다/합리적"이라 정당화하지 않는다.
> - **날조 금지.** 트레이드오프는 저자 고유 판단이다. 코드·맥락에서 근거가 나오면 직접 코드를 열어 확인해 채우고, 없으면 일반론으로 메우지 말고 `[채울 내용]`으로 남긴다.
> - **저자 목소리 보존.** 기존 산문·표·이미지·헤딩은 건드리지 않는다. 새로 추가하는 단점 문단만 손댄다.
>
> ## 경계
> - 작업·커밋은 **지정된 워크트리·브랜치에서만.** master(또는 main) 머지·push·배포는 사용자가 한다.

---

## ① MP error-handling 시리즈

**워크트리** (있음): `C:\Users\forwo\WebstormProjects\main\monorepo-playground-tradeoff` (브랜치 `docs/tradeoff-augment`)
**대상 폴더**: `docs/guides/error-handling/` (step1~7, cross-link 시리즈)

**(strict-B 본보기 — ①은 이미 실행·master 반영 완료. 다른 묶음은 이렇게 거른다.)**

| 파일 | 절 | 채울 트레이드오프 (교환단점만) |
|---|---|---|
| `step3.md` | 영향 범위 | ErrorBoundary로 격리하는 대신, 경계를 잘게 나눌수록 치르는 설계 복잡도 비용 |
| `step6.md` | 해결 전략 | 모달·토스트·인풋 각 피드백을 택하며 맞바꾸는 약점(하나를 얻으면 다른 하나를 포기) |

**드롭(트레이드오프 아님)**: step2 전부(UX '정론' 채택 — 포기한 반대급부 없음), step4 전부(ErrorBoundary 적용 범위 설명 = 교환 아님), step3 「경중 구분」 level 기준(적용 조건), step6 「로딩 팁」 isSuccess(적용 조건).
**손대지 않음**: step1·step5·step7.

---

## ② MP infinite-scroll 시리즈

**워크트리** (전용 생성): `git -C C:/Users/forwo/WebstormProjects/main/monorepo-playground worktree add C:/Users/forwo/WebstormProjects/main/monorepo-playground-tradeoff-infinite -b docs/tradeoff-infinite master` → 거기서 작업·커밋
**대상 폴더**: `docs/guides/infinite-scroll/` (step1~4)

| 파일 | 절 | 채울 트레이드오프 |
|---|---|---|
| `step1.md` | SSR prefetch / Pages 비교 | 스케일링 현실성(서버 부하 한 줄로 일축) / Streaming의 SEO·청크 중간 오류 비용 |
| `step2.md` | next/image / srcset 결정 | 단점을 "next/image도 비슷"으로 희석 → 심각도 명확히 / srcset sizes 수동 관리 비용 |
| `step3.md` | 캐싱(staleTime) / React.memo | 실시간성 필요 데이터엔 부적합·gcTime 30초 trade-off / memo 비교 비용 + **여기선 콜백 없이 `<Link>`라 듣고, board 참조 안정성이 staleTime:Infinity에 의존 = 캐싱↔memo 맞물림** |
| `step4.md` | 무한 재요청 차단 | 명시적 재시도 수단 필요·일시/영구 에러 미구분 |

**참고**: `step3`은 코드 근거로 채운 패키지 초안이 scratchpad에 있음(`...\scratchpad\step3-infinite-scroll.package.md`) — 재활용 가능. **손대지 않음**: `step3`의 「1. 스크롤 끝 감지」절(양호).
**근거 코드**: `apps/examples/src/rendering/infinite-scroll/`의 `queries.ts`·`components/BoardListPage.tsx`·`components/BoardCard.tsx`.

---

## ③ MP testing 시리즈

**워크트리** (전용 생성): `git -C C:/Users/forwo/WebstormProjects/main/monorepo-playground worktree add C:/Users/forwo/WebstormProjects/main/monorepo-playground-tradeoff-testing -b docs/tradeoff-testing master` → 거기서 작업·커밋
**대상**: `docs/guides/testing/`

| 파일 | 절 | 채울 트레이드오프 |
|---|---|---|
| `why-to-test.md` | 유닛 vs E2E (L13 부근) | 비율 문제만 인식하고 끝남 → 구체 기준(피라미드/트로피 등)이나 상황별 가이드 |
| `how-to-test.md` | children 렌더 / 한 단언 | Chromatic 부재 시 대안 / 케이스 폭발 유지보수 비용·예외적 다중 단언 허용 시나리오 |

---

## ④ DC main (이력서/프로필 본체)

**워크트리** (생성): `git worktree add C:\Users\forwo\WebstormProjects\my-else\developer-choi-tradeoff -b docs/tradeoff-augment main` (레포: `my-else/developer-choi`)

| 파일 | 절 | 채울 트레이드오프 |
|---|---|---|
| `docs/communication/pr-commit-guide.md` | 장점 / 결론 / 커밋 단위 | 작은 PR의 적용 한계(소규모·단독)·큰 PR 전략 비교 / Squash 히스토리 소실·Merge·Rebase 비교 |
| `docs/vision/ai-delegation-and-review.md` | 판단 고정 / 비용 사다리 | 스킬 개정 비용·스킬 수 관리 부담 / 각 층 초기 설정 비용·오탐 속도저하·소규모 적용 한계 |
| `README.md` | 베스트 프랙티스 (L11~19) | 성과 수치 나열형. 각 선택의 비용·한계. **대부분 저자 측정값이라 `[채울 내용]` 위주가 될 것** |

---

## ⑤ MP packages/design-system

**워크트리** (전용 생성): `git -C C:/Users/forwo/WebstormProjects/main/monorepo-playground worktree add C:/Users/forwo/WebstormProjects/main/monorepo-playground-tradeoff-ds -b docs/tradeoff-ds master` → 거기서 작업·커밋

| 파일 | 채울 트레이드오프 |
|---|---|
| `packages/design-system/docs/guides/design-system/step1.md` | 직접 구현 비용(접근성·키보드·포커스 전부 직접)·Headless 미채택 근거 |
| `…/design-system/step2.md` | MUI 원본 AI 분석이 놓칠 수 있는 것(설계 의도·묵시적 계약) |
| `…/design-system/step4.md` | 모노레포 단점(미공유 코드 많을수록 손해)·Turborepo 대안(Nx·pnpm workspace 등) 비교 |
| `packages/design-system/docs/patterns/DesignTokens.md` | CSS 변수 단점(컴파일타임 검증 불가·SCSS 대비 최적화 약함) |
| `packages/design-system/README.md` | 요약에 장점만 — 단점은 상세 결정 문서 링크로 유도 (요약 특성 감안) |

(step1·2·4는 cross-link 시리즈로 묶어 init)

---

## ⑥ MP apps/examples

**워크트리** (전용 생성): `git -C C:/Users/forwo/WebstormProjects/main/monorepo-playground worktree add C:/Users/forwo/WebstormProjects/main/monorepo-playground-tradeoff-apps -b docs/tradeoff-apps master` → 거기서 작업·커밋

| 파일 | 채울 트레이드오프 |
|---|---|
| `apps/examples/docs/api-client-design-decisions.md` | abstract class 단점(다중상속 불가·강결합)·request() 제거 후 설계 임시성·외부 catch 방식 단점 |
| `apps/examples/docs/patterns/optimistic-update/OptimisticUpdate.md` | useState 방식의 캐시 desync 위험(타 컴포넌트 refetch 시) |
| `apps/examples/docs/patterns/rendering/SsrPrefetchStreaming.md` | loading.tsx 대비 단점(페이지 파일 길어짐 등) |
| `apps/examples/docs/patterns/rendering/ReactCompilerManualMemoization.md` | React Compiler 도입 단점(컴파일러 버그·디버깅·서드파티 호환) |
| `apps/examples/docs/patterns/overlay/OverlayKitModal.md` | overlay-kit 단점·적용 한계(스택 관리·SSR 주의·cleanup 누락 누수) |
| `apps/examples/docs/patterns/rendering/ErrorHandling.md` | Interceptor 미사용 시 대안(useHandleClientSideError)의 단점(호출처마다 catch 반복·누락 위험) |
| `apps/examples/src/validation/integration/README.md` (Zod 활용기) | zod 비용(번들·런타임 검증 오버헤드·러닝커브)·대안(yup·valibot) 비교 |

---

## ⑦ MP static-checking + formatter

**워크트리** (전용 생성): `git -C C:/Users/forwo/WebstormProjects/main/monorepo-playground worktree add C:/Users/forwo/WebstormProjects/main/monorepo-playground-tradeoff-static -b docs/tradeoff-static master` → 거기서 작업·커밋

| 파일 | 채울 트레이드오프 |
|---|---|
| `docs/static-checking/eslint.md` | no-floating-promises off(그럼 floating promise 누가 잡나)·misused-promises attributes off 비용·max-params 2 수치 근거·네이티브 콜백 API disable 비용 |
| `docs/static-checking/stylelint.md` | 커스텀→공식 플러그인 커버리지 차이 정량화(box-shadow 외 차이) |
| `docs/formatter.md` | Prettier 대안(Biome·dprint) 비교·opinionated 커스터마이즈 불가·printWidth 120 단점(diff·모바일 리뷰) |

---

## ⑧ MP patterns + archives

**워크트리** (전용 생성): `git -C C:/Users/forwo/WebstormProjects/main/monorepo-playground worktree add C:/Users/forwo/WebstormProjects/main/monorepo-playground-tradeoff-patterns -b docs/tradeoff-patterns master` → 거기서 작업·커밋

| 파일 | 채울 트레이드오프 |
|---|---|
| `docs/patterns/setup/ProviderComposition.md` | retry:0 단점(일시 네트워크 오류 직접 재시도) |
| `docs/patterns/setup/TestSetup.md` | globals 미사용 비용(매 파일 import 반복) |
| `docs/patterns/testing/WhatToTest.md` | Integration 우선 비용(느린 실행·실패 추적난·환경 의존) |
| `docs/patterns/component/AtomicPresentationComponent.md` | 컴포넌트 수 폭발·분기 로직 호출처 분산 |
| `docs/patterns/storybook/PropMatrix.md` | 1스토리로 몰 때 실패 조합 추적 난이 |
| `docs/archives/full-screen-overlay/trigger-rect-animation.md` | 표의 clipPath 단점 칸 "없음" → 실제 한계(triggerRect 캡처 타이밍·드래그 폴백 불일치) 반영 |

---

## 완료 처리

각 묶음을 끝내면 **"⟨묶음 번호/이름⟩ 완료"**를 메인 세션(로드맵 담당)에 알린다. 그러면 `resume-github-blog.md`의 「대상 목록」에서 해당 항목을 삭제한다(잔여만 유지).
