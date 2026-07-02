# apps/examples radix-themes 걷어내기

## 동기

채용 워크플로우 UI 선호를 `@radix-ui/themes` → `radix-ui`(primitives)로 전환(2026-06, AC prefer-packages 정정). MP에서 themes를 쓰던 `packages/recruitment`는 삭제 완료했으나, `apps/examples` 앱은 여전히 themes 전면 사용 → 정합성 위해 마이그레이션 검토.

## 현황 (2026-06-10)

- `apps/examples/package.json` 의존: `@radix-ui/themes ^3.2.1` (`@radix-ui/react-icons`는 유지 대상 — 아이콘은 primitives와 무관)
- `@radix-ui/themes` import 소스 파일 **16개** (착수 시 27 → 타이포·모달·레이아웃 8파일·ExampleHeader 변환 완료로 감소) — form 데모(auto-focus/error-feedback/trim), validation/integration(Board*), rendering/search-result, sandbox/zod, 공용(AppProvider=Theme 루트, LinkCardGrid, form/Input·elements)
- 잔여 차단 컴포넌트: 표시 5종(Badge/Card/Callout/Separator/Table)+Code 거의 전부, Select(BoardFilter/BoardForm), 루트 Theme(AppProvider)
- radix 토큰 직접 사용 잔존 2파일: `src/shared/components/form/elements.module.scss`(`--space-1`), `src/shared/global.css`(`--space-3`·`--radius-2`)
- examples는 `@monorepo-playground/design-system`을 의존(`*`)하며 폼·타이포·모달·레이아웃 토큰을 실제 사용 중

## 목표

`apps/examples`를 `@radix-ui/themes` 없이 동작하게 한다 (package.json에서 제거, import 0건).

## 결정된 방안 — 혼합 (가+나)

컴포넌트 부류별 판정은 `packages/design-system/docs/components-map.md`에 정리. 요약:

- **(가) design-system 신규/보완**: 폼 6종(Button/TextField·Input/TextArea/RadioGroup/Select/Checkbox), 표시 5종(Badge/Card/Callout/Separator/Table), 모달류(Alert/Confirm=ConfirmDialog/Form, DS Modal 위에 얹음).
- **(나) 컴포넌트 없음**: 타이포(Heading/Text/Link) → DS typography.module.scss + plain 태그 / 레이아웃(Box/Flex/Grid/Container) → per-file `*.module.scss` + `var(--spacing-*)`.
- **examples 유지**: 인라인 Code(자체 구현), 프리미티브를 조합한 도메인 래퍼(LinkCardGrid/Board*/demos/search/ExampleHeader 등).
- **범위 밖**: 코드블록(Shiki `codeToHtml`, 이미 자체 구현 — themes 무관).
- Theme(루트)는 대체 없이 제거(DS 토큰 CSS가 역할).

## radix 토큰(CSS 변수)도 전부 찾아 제거

themes는 컴포넌트뿐 아니라 CSS 커스텀 프로퍼티(토큰)도 주입한다. 컴포넌트 import를 0으로 만들어도 CSS Module·인라인 스타일에 radix 토큰을 직접 박아두면 themes 의존이 남는다. 이 토큰들도 다 찾아 design-system 토큰으로 치환한다.

- **radix 토큰(제거 대상)**: 숫자 스케일 + gray/accent 계열 — `--gray-1..12`, `--gray-a1..12`(alpha), `--color-background`, `--color-panel*`, `--accent-*`, `--space-1..9`, `--font-size-1..9`, `--radius-1..6` 등. `@radix-ui/themes/styles.css`(Theme)가 주입.
- **DS 토큰(치환처, `packages/design-system/dist/design-system.css`가 정의)**: 텍스트 `--color-fg-primary|secondary|muted|subtle|accent`, 배경 `--color-bg-primary|secondary|tertiary|accent|destructive`·`--color-on-accent`, 간격 `--spacing-xs|sm|md|lg|xl|page-x|grid-gap`, 폰트 `--font-size-2xs|xs|sm|md|base|lg|xl|2xl`, 라운드 `--radius-xs|sm|md|full`, 기타 `--shadow-focus`·`--header-height`·`--max-width`.
- **실사례(함정)**: `apps/examples/src/shared/components/ExampleHeader.tsx` 인라인 스타일이 `var(--color-background)`·`var(--gray-a5)`(radix) 사용 중. 로고 색을 `--gray-12`(radix)로 잘못 넣었다가 `--color-fg-primary`(DS)로 교정함(MP feature 브랜치 `47561118`) — radix 토큰을 무심코 끌어쓰기 쉬워 이 항목을 남긴다.
- **주의**: radix 컴포넌트 prop(`px`/`py`/`gap`/`size` 등)도 내부적으로 radix `--space-*`/`--font-size-*`를 참조한다. 컴포넌트를 plain+SCSS로 치환하면 자연히 사라지므로, 별도 스윕 대상은 CSS Module·인라인 스타일에 손으로 박은 `var(--radix토큰)`이다.

## 규모

themes는 styled 컴포넌트라 unstyled로 바꾸면 시각 스타일이 0 → 전부 재작성. 잔여 16파일(착수 시 27), 큰 작업 → 별도 프로젝트로.

## 첫 행동

이 문서는 **종착점**(themes 실제 제거)이다. 선행 DS 구축 순서는 [`roadmap.md`](./roadmap.md)를 따른다 — 선행(표시 5종 + Select)이 다 선 뒤 잔여 16파일을 부류별로 치환(폼·표시=DS, 타이포=typography, 레이아웃=per-file SCSS, 도메인 래퍼=프리미티브 조합)하고 themes를 걷어낸다. Form 모달은 examples 소비처가 없어 차단 항목 아님.

## 종료 조건

`git -C <MP> grep -l "@radix-ui/themes" -- apps/examples` 0건 + package.json에서 `@radix-ui/themes` 제거 + examples 빌드·타입체크 통과.

추가(토큰): radix CSS 토큰 직접 사용도 0건 — `git -C <MP> grep -nE "var\(--(gray|accent|color-background|color-panel|space-[1-9]|font-size-[1-9]|radius-[1-6]))" -- apps/examples` 결과 0건(전부 DS 토큰으로 치환). 패턴 주의: DS는 `--spacing-*`·`--font-size-{명명}`·`--radius-{명명}`이라 위 숫자 스케일 패턴과 안 겹친다.

## 참조

- MP = `~/WebstormProjects/main/monorepo-playground`
- 선행 완료: AC prefer-packages UI=`radix-ui`(primitives) / MP Provider Composition·best-practices-map themes 제거(MP `5e1e73a1`) / `packages/recruitment` 삭제(MP `ce7e41f1`·`791da093`)
- TP(test-playground)에 `radix-ui` primitives 설치·동작 검증 완료(Switch 스모크 테스트 + 커스텀 스타일 데모)
