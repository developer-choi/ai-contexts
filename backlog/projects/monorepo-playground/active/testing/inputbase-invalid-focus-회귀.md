---
target:
  - monorepo-playground/packages/design-system/src/components/inputs/InputBase.stories.tsx
  - monorepo-playground/packages/design-system/src/components/inputs/InputBase.module.scss
---

# InputBase invalid+focus 회귀 — 자동 검증 테스트

> MP = `~/WebstormProjects/main/monorepo-playground`
> 발생·확인: 2026-07-02 세션. 버그 자체는 같은 세션에 SCSS 수정으로 해결, **회귀 방지 테스트만 남음**.

## 동기

에러(invalid) 상태에서 input에 포커스하면 회색 focus box-shadow가 에러 링을 덮는 버그가 있었다. SCSS 우선순위 문제라 코드 수정으로 고쳤지만, 이 계열 버그를 자동으로 잡는 그물이 하나도 없다 — 다시 깨져도 CI가 침묵한다.

## [ready] invalid+focus 시 에러 링 유지 회귀 테스트

### 기대상황 (필수)

- invalid 상태의 InputBase에 내부 input이 포커스됐을 때, 루트 `<label>`의 `box-shadow`가 `--shadow-ring-invalid`(에러 링)로 계산되는지 **자동으로** 검증하는 테스트가 CI에 붙어 있다. focus box-shadow(`--shadow-focus`)가 에러 링을 덮으면 실패한다.

### 현재상태 (필수)

- **그물 0**: 현행 jsdom 기반 Vitest 유닛 테스트로는 이 버그를 못 잡는다. 실증(2026-07-02): invalid+focus 상태를 렌더해 `getComputedStyle(label).boxShadow`를 찍으면 항상 빈 문자열(`""`)이다. jsdom은 `.scss` 스타일시트의 캐스케이드를 계산하지 않고 `:has()`/`:focus` 셀렉터도 해석하지 않는다. CSS Module 클래스명(`_invalid_...`)은 DOM에 붙지만 box-shadow 값 자체가 비어 있어 정상/버그를 구분 불가.
- **버그 원인(수정 완료)**: `InputBase.module.scss`에서 focus 규칙 `…:not(:has(…disabled)):has(.content :focus)`(specificity 0,5,1)가 invalid 규칙 `…:not(:has(…disabled)).invalid`(0,4,1)를 specificity·소스순서 둘 다로 이겨 덮었다. 같은 세션에 focus 규칙을 invalid 아닐 때로 한정해 수정.
- **스토리도 없음(이 태스크에 포함)**: 2026-07-02 세션에서 `InputBase.stories.tsx`에 `InvalidFocused` 스토리(로드 시 `play`로 input에 강제 포커스, `toHaveFocus` 확인)를 만들었으나 fix 커밋에서 의도적으로 제외해 레포에 반영하지 않았다. 따라서 이 회귀 테스트 태스크는 **① invalid+focus를 고정하는 스토리(예: `InvalidFocused`, play 강제 포커스) 작성**과 **② 그 상태의 box-shadow를 검증하는 그물(Chromatic 스냅샷 or browser-mode 단언) 추가**를 함께 포함한다. 스토리만으론 box-shadow를 단언하지 않아 회귀 검출이 안 되므로 둘 다 필요하다.

### 현재 생각중인 방법 (필수)

작성 세션 의견 — 실행자는 기대상황 기준으로 재판단할 것:

- **후보 A — Chromatic 시각 회귀**: `@chromatic-com/storybook`이 이미 devDependency로 설치돼 있음. `InvalidFocused` 스토리(play로 focus 상태 고정)를 스냅샷 대상으로 삼으면 회색 링이 찍혀 diff로 잡힌다. 셋업 부담 최소, 단 Chromatic 프로젝트 토큰·CI 연동 필요.
- **후보 B — Vitest browser mode**: 실브라우저(headless chromium)에서 렌더 후 `getComputedStyle(label).boxShadow`가 `--shadow-ring-invalid` 실측값과 일치하는지 assert. jsdom과 달리 실제 캐스케이드가 계산됨. 프로그램적 단언이라 값 기준이 명확하지만 browser mode 설정 추가 필요.
- 트레이드오프: A는 스냅샷(사람이 diff 승인), B는 값 단언(CI가 자동 판정). 이 컴포넌트 하나면 B가 명확, 디자인시스템 전반의 시각 회귀까지 노리면 A.

### 첫 행동

- 후보 A/B 중 택1 결정. 어느 쪽이든 먼저 `InputBase.stories.tsx`에 아래 `InvalidFocused` 스토리를 (다시) 작성해 invalid+focus 상태를 고정한다. 그다음 B면 `vitest.config.ts`의 `test`에 browser mode 블록 추가, A면 Chromatic 토큰·CI 스텝 확인.

작성 세션(2026-07-02)에 실제로 통과시켰던 스토리:

```tsx
// 상단 import에 추가
import {expect, userEvent, within} from 'storybook/test';

export const InvalidFocused: Story = {
  args: {isInvalid: true},
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('입력하세요');
    await userEvent.click(input);
    await expect(input).toHaveFocus();
  },
};
```

### 종료 조건

- invalid+focus에서 에러 링이 덮이는 회귀를 자동으로 실패시키는 테스트가 CI에 붙으면 이 항목 삭제.

## 관련 1차 소스

- 대상 컴포넌트·스토리: `MP/packages/design-system/src/components/inputs/InputBase.{tsx,stories.tsx,module.scss}`
- jsdom 한계 실증 로그: 2026-07-02 세션(`computed box-shadow = ""`, `active element is input = true`)
- 관련 백로그: 같은 폴더 `className-병합-검증-딜레마.md`(그물 0 검증·Chromatic 미검출 동일 맥락)
