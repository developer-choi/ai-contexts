# radix-themes 제거 로드맵

## 목적

`apps/examples`의 `@radix-ui/themes` 전면 제거(→ `radix-ui` primitives / plain + SCSS / DS 컴포넌트)가 종착점이다. themes는 styled라 걷어내면 시각 스타일이 0이 되므로, **먼저 design-system에 대체 컴포넌트를 구축한 뒤 마지막에 themes를 지운다.**

분류 근거: [`../design-system/design-system-components-map.md`](../design-system/design-system-components-map.md) → `packages/design-system/docs/components-map.md`.

## 현황 (2026-06-10)

- themes import 잔존: **16파일** (착수 시 27 → 레이아웃 8파일 per-file SCSS 변환 완료로 감소).
- 잔여 파일을 막는 컴포넌트: **표시 5종**(거의 전부) > **Select**(BoardFilter·BoardForm) > 루트 `Theme`(AppProvider, 맨 마지막 제거).
- 완료된 선행: InputBase 토대 / 폼 5종(Button·TextField·TextArea·RadioGroup·Checkbox) / 모달 Alert·ConfirmDialog / 타이포(typography 클래스) / 레이아웃 변환 가이드 + 8파일 변환.

## 남은 선행작업 (design-system 구축)

### 1. 표시 5종 — 최대 병목

Badge / Card / Callout / Separator / Table — 전부 미구현, **스펙 백지(0건)**. 각 prop·variant 결정(스펙 작성)부터 필요. 잔여 16파일 거의 전부가 이 중 하나 이상에 막혀 있어 themes 제거의 핵심 차단.

- 추가: 한 파일이 themes `Code`를 import(인라인 코드). examples 자체 구현 또는 plain+SCSS로 별도 처리.

### 2. Select

InputBase 파생, trailing 화살표 슬롯. 미구현. BoardFilter·BoardForm 2파일 차단.

### 3. (옵션) Form 모달 — themes 제거 차단 아님

roadmap 초안의 모달 3종 중 하나였으나, examples에 **폼-인-모달 소비처가 없다**(`openAsync` 사용처는 ConfirmDialog·error overlay뿐). themes 제거에 불필요 — DS 완결성 차원에서 나중에 추가할지는 별개 판단.

## 종착 — themes 제거

위 선행(표시 5종 + Select)이 서면 잔여 16파일을 부류별로 치환하고 themes를 걷어낸다.

- 부류별 치환: 폼·표시=DS, 레이아웃=per-file SCSS([`layout-no-component.md`](./layout-no-component.md)), 도메인 래퍼=프리미티브 조합.
- radix 토큰 직접 사용 제거(2파일): `apps/examples/src/shared/components/form/elements.module.scss`(`--space-1`), `apps/examples/src/shared/global.css`(`--space-3`·`--radius-2`) → DS 토큰.
- 루트 `Theme`(AppProvider) 제거 — DS 토큰 CSS가 역할 대체.
- package.json에서 `@radix-ui/themes` 제거. `@radix-ui/react-icons`는 유지.
- 반복 작업이므로 첫 1파일/1컴포넌트 패턴 확정 후 확산.

### 종료조건

- `git -C <MP> grep -l "@radix-ui/themes" -- apps/examples` 0건
- radix 토큰 직접 사용 0건: `git -C <MP> grep -nE "var\(--(gray|accent|color-background|color-panel|space-[1-9]|font-size-[1-9]|radius-[1-6]))" -- apps/examples`
- package.json에서 `@radix-ui/themes` 제거
- examples 빌드·타입체크·lint·stylelint 통과

실행·종료조건 상세: [`examples.md`](./examples.md)
