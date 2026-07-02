---
target:
  - monorepo-playground/packages/design-system/src/components/TextField
  - monorepo-playground/packages/design-system/src/components/Caption
---

# FormField 공통 래퍼 컴포넌트

> 출처: MP 테스트 추가 워크플로우(design-system 유닛테스트 프로젝트)의 PR4로 잡혀 있던 항목.
> 2026-06-25, PR3(표시·데이터 컴포넌트 테스트) 마무리 시 "PR3를 마지막 PR로" 정하며 backlog로 이관.

## 동기

PR2에서 TextField·TextArea·Select가 **각각** Label + InputBase + Caption을 직접 조합하는 구조라,
caption/error 토글 로직(`error ? <Caption isInvalid> : caption ? <Caption> : null`) 테스트가 3개 파일에
동일하게 반복됐다. PR2 step-6 사용자 리뷰에서 이 중복을 발견해 테스트를 삭제 → **현재 이 로직을 검증하는
테스트가 0건**인 상태.

근본 원인: FormField 성격의 공통 래퍼 없이 각 컴포넌트가 Label + input + Caption을 직접 조합 → 테스트 중복 불가피.

## 목표 (종료 조건)

- `FormField` 공통 래퍼 컴포넌트 구현: Label + input slot + Caption을 감싼다.
- TextField/TextArea/Select가 FormField를 사용하도록 리팩토링.
- `FormField.test.tsx`에서 caption/error 우선순위 로직을 **한 번만** 검증 → 3중 중복 해소.
- **PR3에서 이관된 검증**: Caption `isInvalid → role=alert` 전환을 여기(FormField integration)서 다룬다.
  PR3는 Caption 테스트를 className 병합만 남겼다(중복 회피 + integration 우선). 이관 위치가 이 항목.

## 참고 구조 (구현 방향은 PLAN에서 결정 — 아래 둘 사이 어딘가)

**Radix Form** (headless — 시각 스타일 없는 순수 연결):
- `simplify/simplified-radix-ui-primitives/packages/react/form/src/form.tsx`
- `FormField`: `<div>` 래퍼 + Context(id, name) Provider
- `FormLabel`: FormField Context에서 `htmlFor` 자동 연결
- `FormControl`: `<input>` 래퍼, id/name 자동 + validity 추적 + `aria-describedby` 자동
- `FormMessage`: 마운트 시 id를 AriaDescriptionContext에 등록 → FormControl `aria-describedby` 자동 갱신.
  `match` 없으면 항상 렌더(helper text), 있으면 조건부(error)

**MUI** (시각 상태를 Context로 공유):
- `simplify/simplified-material-ui/packages/`
- FormControl이 focused/filled/error 상태를 Context로 하위에 뿌림
- TextField는 FormControl 안에 Label + Input + FormHelperText를 조립하는 편의 컴포넌트
- caption(HelperText) 동작 테스트는 FormControl에서만, TextField는 조합 결과만 검증

**현재 MP 구조와 차이**: MP는 all-in-one(TextField가 Label+InputBase+Caption 포함). Radix는 headless primitive 조합.
구현 방향은 두 방식 사이 어딘가 — PLAN에서 결정.

## 첫 행동

`packages/design-system/src/components/TextField`(·TextArea·Select)의 현재 Label+InputBase+Caption 조합 코드를
읽어 caption/error 토글 로직의 공통부를 식별 → FormField 시그니처(슬롯 구조 + Context 여부) 초안.

## 관련 백로그

- `testing/className-병합-검증-딜레마.md` — PR2 InputBase/Checkbox className 재방문(role·텍스트 없는 래퍼 루트) 잔여.
  FormField 리팩토링 시 InputBase 바깥 래퍼 구조가 바뀌면 그 잔여와 맞물린다.
- `validation/폼-유효성검증-중복코드-해결.md` — RHF register options 중복(로직 레이어). 본 항목은 조합 래퍼(프레젠테이션
  레이어)라 결이 다르나, 같은 form 입력 컴포넌트를 건드린다.
