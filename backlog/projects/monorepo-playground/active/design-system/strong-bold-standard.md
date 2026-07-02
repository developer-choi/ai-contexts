---
target:
  - monorepo-playground/packages/design-system/src/styles/
  - monorepo-playground/apps/examples/src/app/form/handle-submit/page.module.scss
---

# strong/b 태그 볼드 렌더 표준화

## 동기

design-system을 쓰는 모든 앱에서 시맨틱 `<strong>`·`<b>`가 굵게 안 나온다. 강조 표준을 정해 DS 차원으로 반영해야 한다.

## 현재상태 (왜 필요한가)

- `packages/design-system/src/styles/reset.css`가 Meyer 리셋으로 `strong`·`b`를 리셋 셀렉터 목록(약 42·47행)에 포함 → `font: inherit`로 기본 굵기 제거. `<strong>`이 부모 문단 굵기(normal 400)를 상속.
- `packages/design-system/src/styles/typography.module.scss`는 굵기를 opt-in으로만 켠다: `_apply` 믹스인 안 `&.bold { font-weight: bold; }` (43~45행). 즉 `.body2` 같은 타이포 클래스에 `.bold`를 **함께** 걸어야 굵어진다. 아무것도 `<strong>`을 굵게 만들지 않음.
- 결과: `<strong>`을 쓴 모든 페이지(예: `apps/examples`의 폼 예제 섹션들)에서 강조가 시각적으로 안 먹음.
- **임시 조치(제거 예정)**: `apps/examples/src/app/form/handle-submit/page.module.scss`에 `.page strong { font-weight: bold; }` 로컬 복원 (MP 커밋 `76d861be` = "handle-submit 페이지 strong 볼드 렌더 복원"). 이 페이지 한정. 표준 결정되면 제거.

## 조사할 것

1차 소스로 확인 후 결정한다 (시장 통념·서브에이전트 요약만으로 종결 금지):

- **reset 관행**: modern-normalize / Tailwind preflight / 기타 널리 쓰는 reset이 `strong`·`b`를 어떻게 두는가. (예: Tailwind preflight는 `b, strong { font-weight: bolder }`로 브라우저 기본을 보존하는 것으로 알려져 있으나 1차 확인 필요) → Meyer 리셋이 굵기를 지우는 게 오히려 예외인지.
- **컴포넌트 라이브러리**: radix-themes / MUI 등이 시맨틱 `<strong>`을 전역 복원하는지, 아니면 `<Text weight="bold">` 같은 prop/클래스만 제공하는지.
- 위를 근거로 세 방안 중 택1:
  - **(1) DS 전역 복원**: `packages/design-system/src/styles/global.css`에 `strong, b { font-weight: bold; }` 추가. 시맨틱 태그가 어디서나 굵게. 한 줄, 전 앱 이득.
  - **(2) `.bold` 모디파이어 표준화**: 강조를 `<span className={clsx(typography.body2, typography.bold)}>`로 쓰도록 컨벤션화. `<strong>` 대신 클래스. 마크업이 장황해짐.
  - **(3) CSS-only 페이지별**: 현재 로컬 복원 방식을 표준으로. DS는 안 건드림. 페이지마다 반복.

## 결정 후 조치

- 택한 방안을 design-system(또는 컨벤션 문서)에 반영.
- `apps/examples/.../handle-submit/page.module.scss`의 `.page strong` 로컬 복원을 (1)·(2) 채택 시 제거하고 표준 방식으로 교체. (3) 채택 시 유지.
- `.stylelintrc`·`docs/static-checking/stylelint.md` 등 관련 문서 영향 점검.

## 종료 조건

강조 표준이 design-system 코드(또는 컨벤션 문서)에 반영되고, handle-submit 페이지의 임시 로컬 복원이 표준에 맞게 정리되면 이 항목 삭제.

## 첫 행동

`packages/design-system/src/styles/reset.css`의 strong·b 리셋 선언과 `typography.module.scss`의 `.bold` 믹스인을 열어 현재 정책을 확인한 뒤, Tailwind preflight·modern-normalize의 `strong`·`b` 처리를 1차 소스로 대조한다.
