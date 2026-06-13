---
type: decision
subtype: none
audience: langdy-design-system 팀, 미래의 본인
audience_knowledge: 2회차 결정(label 채택) 인지, HTML `<label>`의 첫 labelable descendant 위임 규칙과 React ref 배선 패턴에 익숙
purpose: leading/trailing에 폼 요소(select 등)가 끼는 복합 케이스에서도 `<label>` 방식이 유지되는지 판단
key_message: 복합 케이스에서도 `<label>` + `htmlFor` 채택 — 선언적 쌍 vs 명령적 JS 비대칭이 유지되어 label 쪽이 여전히 덜 번거로움
length_target: 현재 분량 유지 (방법 2개 장단점 + 2차 소비자 섹션 + 결론 단락)
rendering_env: markdown
placeholder_policy: keep
refs:
  related_files:
    - src/components/InputBase/InputBase.tsx
    - src/components/InputBase/InputBase.module.scss
    - src/components/InputBase/InputBase.stories.tsx
    - plan/label-focus-test.html
    - plan/input-decisions-step2.md
  related_pr: https://github.com/langdy/langdy-design-system/pull/40
---

# 방향성 정의 3회차. leading/trailing에 또 다른 폼 요소가 있을 때의 포커스 위임 방식

## 목표

2회차에서는 InputBase 안에 단일 input만 있는 기본 케이스를 다뤘습니다.

이번 회차는 `leading` 또는 `trailing`에 **또 다른 폼 요소**가 끼는 복합 케이스를 다룹니다. 대표 예시는 PhoneNumberField — leading에 국가 코드 `<select>`, content에 번호 `<input type="tel">`이 들어가는 구조입니다.

이때 목표는 여전히 같습니다.

- padding 영역 클릭 → 메인 input으로 포커스
- leading/trailing의 폼 요소 직접 클릭 → 그 요소로 포커스

이 회차의 질문은 하나입니다: **2회차에서 선택한 `<label>` 방식이 복합 케이스에서도 유지되는가?**

leading에 select가 들어가는 순간 label의 "첫 labelable descendant" 규칙이 작동하여 padding 클릭이 의도와 다른 요소로 위임됩니다. 이 문제를 깔끔하게 해결할 수 없다면 2회차 결론을 뒤집고 div + handleClick 방식으로 돌아가야 합니다.

## 검증 — 각 방식이 실제 어떻게 동작하는가

테스트 파일: `plan/label-focus-test.html`, 스토리북 `InputBase > Pattern / PhoneNumberField`.

| 케이스 | 구조                                                        | padding 클릭               | select 직접 클릭 | input 직접 클릭 |
| ------ | ----------------------------------------------------------- | -------------------------- | ---------------- | --------------- |
| 1      | `<label for="inputId"><select><input id="inputId"></label>` | input으로 위임 (의도대로)  | select 포커스    | input 포커스    |
| 2      | `<div><select><input></div>` + `handleClick`                | input 포커스 (handleClick) | select 포커스    | input 포커스    |

케이스 1(label + `for`/`htmlFor`)은 위임 대상을 명시하면 padding 클릭이 의도대로 메인 input으로 간다는 것을 보여줍니다. 케이스 2(div + handleClick)도 같은 결과를 내지만 필요한 장치가 다릅니다 — 다음 섹션에서 비교합니다.

## 요지 미리 보기

이 회차의 핵심은 **두 방식 다 같은 결과를 낼 수 있다**는 점입니다. 복합 케이스에서 특정 요소로 포커스를 보내야 할 때, label 방식도 div + handleClick 방식도 각자 해결법이 있습니다. 차이는 **어느 쪽이 덜 번거로운가**입니다.

- `<label>` 방식: 포커스 보내고 싶은 요소를 `htmlFor` + `id`로 선언적으로 연결. 추가 JS 없음.
- `<div>` + `handleClick` 방식: 포커스 보내고 싶은 요소의 `ref`를 붙잡고, 그 요소에 `.focus()`를 호출하는 JS를 작성.

## 구현 방법

### 방법 1. `<label>` 유지 + `htmlFor`로 타겟 명시

```tsx
function PhoneNumberField() {
  const id = useId();
  return (
    <InputBase htmlFor={id} leading={<CountrySelect />}>
      <input id={id} type="tel" />
    </InputBase>
  );
}
```

포커스 타겟을 바꾸려면 바꿀 대상의 `id`와 label의 `htmlFor` 한 쌍만 맞추면 됩니다. 브라우저가 네이티브로 위임해주므로 JS 코드는 한 줄도 추가되지 않습니다.

**장점:**

- **2회차의 label 기반 구조를 그대로 유지.** 복합 케이스 때문에 상위 태그를 `<div>`로 바꿀 필요가 없고, 2회차에서 얻은 "JS 0줄" 이점이 그대로 이어집니다.
- **브라우저 네이티브 위임 활용 — 포커스 이동 JS 0줄.** `htmlFor`와 `id`만 맞으면 포커스 호출 코드를 InputBase와 1차 소비자 어느 쪽에도 쓰지 않습니다.
- **타겟 지정이 선언적 — `htmlFor` + `id` 한 쌍만 맞추면 끝.** 어떤 요소에 포커스를 보낼지는 속성 값 한 쌍으로 결정되고, 포커스 호출 로직이 JSX 바깥으로 새지 않습니다.
- **`<InputBase>` 공개 API에 새 prop이 필요 없음.** `<label>`의 `htmlFor`는 InputBase가 이미 `...rest`로 받고 있으므로, 복합 케이스를 위해 새 prop을 추가할 필요가 없습니다.

**단점:**

- **1차 소비자가 3단계 배선.** `useId`로 id를 만들고, InputBase에 `htmlFor`로 전달하고, 내부 input에 `id`로 연결하는 3단계가 복합 필드마다 필요합니다. 단, 이 부담은 단순 TextField에는 없고 PhoneNumberField처럼 leading/trailing에 폼 요소가 있는 필드에만 생깁니다.

### 방법 2. `<div>` + `handleClick` + `inputRef` 전달

```tsx
function PhoneNumberField() {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <InputBase inputRef={inputRef} leading={<CountrySelect />}>
      <input ref={inputRef} type="tel" />
    </InputBase>
  );
}
```

포커스 타겟을 바꾸려면 바꿀 대상의 `ref`를 InputBase까지 배선하고, `handleClick`이 그 ref로 `.focus()`를 호출하도록 직접 JS를 작성해야 합니다.

**장점:**

- **포커스 타겟을 소비자가 자유롭게 지정 가능.** `inputRef`가 가리키는 대상이 DOM의 어느 위치에 있든 포커스가 그쪽으로 갑니다. 다만 이 유연성은 방법 1도 `htmlFor` + `id`로 동등하게 얻을 수 있고, 배선이 더 간단한 쪽은 label입니다.

**단점:**

- **타겟 지정이 명령적 — `useRef` 생성 + `inputRef` prop 배선 + `.focus()` 호출 JS가 모두 필요.** 같은 일을 하는데 label 쪽은 속성 한 쌍이면 끝나는 반면, div 쪽은 세 단계 모두를 JS 코드로 작성해야 합니다.
- **2회차 단점이 그대로 유지.** `handleClick` 함수 선언, `inputRef` prop 전달, forwardRef 조합 시 ref 병합이 복합 케이스에서도 똑같이 필요합니다. 복합 케이스를 푼다고 해서 2회차의 부담이 줄어들지는 않습니다.
- **이벤트 전파 제어까지 추가.** leading/trailing에 자체 `onClick` 핸들러가 있는 요소가 들어오면, `handleClick`이 엉뚱한 타이밍에 발동하지 않도록 `stopPropagation` 같은 제어가 추가로 필요합니다.

## 2차 소비자 관점 — `<TextField leading={...} />`로 슬롯을 바꾸는 경우

1차 소비자(TextField 등)가 `leading` / `trailing`을 다시 외부로 뚫어주면, 2차 소비자(랭디 어드민·학습자 화면)가 슬롯에 임의의 요소를 넣을 수 있습니다. 이때 2차 소비자가 "내가 넣은 요소로 포커스가 갔으면 좋겠다"고 하면, 두 방식 모두 **1차 소비자가 InputBase를 `<label>`로 감싸는지 `<div>`로 감싸는지를 알아야** 배선 방식을 결정할 수 있습니다. label 기반이면 `htmlFor`/`id` 한 쌍을 맞추고, div 기반이면 `ref`를 배선하는 식으로 내부 구조에 맞춰 배선해야 하기 때문입니다. 이 "내부를 봐야 한다"는 인지 부담은 두 방식에 공통입니다.

차이가 나는 건 그 다음부터입니다.

- **label 기반 TextField**: 2차 소비자가 자기 요소에 `id`를 주고, TextField가 외부로 뚫어둔 `htmlFor`에 그 id를 넘기면 끝. 여전히 선언적.
- **div + handleClick 기반 TextField**: 2차 소비자가 자기 요소에 `ref`를 달고, TextField가 외부로 뚫어둔 `inputRef` prop에 그 ref를 넘겨야 함. 포커스 호출은 여전히 TextField 내부 `handleClick`이 그 ref로 `.focus()`를 부르는 JS.

두 방식 모두 "외부에서 타겟을 바꿀 수 있게 뚫어주는" 일을 1차 소비자가 해야 하지만, label 쪽은 `htmlFor` prop 하나만 pass-through하면 되는 반면 div 쪽은 ref 배선과 focus 호출 책임까지 함께 따라옵니다.

## 결론

**복합 케이스에서도 2회차와 동일하게 방법 1(`<label>` + `htmlFor`)이 더 적합하다고 판단합니다.**

핵심 비대칭은 **선언적 쌍 vs 명령적 JS**입니다. label 방식은 `htmlFor`와 `id` 속성 한 쌍만으로 타겟 지정이 끝나는 반면, div 방식은 `useRef` 생성, `inputRef` prop 배선, `.focus()` 호출을 JS로 작성해야 합니다.

게다가 label에서 감수하는 비용(`useId` + 3단계 배선)은 복합 필드에만 국한되지만, div 비용은 TextField 같은 단순 필드에도 기본값으로 따라옵니다. 복합 케이스를 근거로 div 방식으로 돌아갈 이유가 보이지 않는다고 봅니다.
