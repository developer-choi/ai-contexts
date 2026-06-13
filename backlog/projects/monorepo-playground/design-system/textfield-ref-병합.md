# TextField ref 병합 의사결정

## 배경

InputBase는 원래 `<label>` 요소였다. 네이티브 label↔input 관계 덕에 wrapper의 빈 영역을 클릭해도 input에 자동으로 focus가 들어갔다.

PR #40 리뷰(`InputBase.tsx:45`, `yudeokseo`)에서 **"InputTitle도 label 태그라 한 input에 label이 두 개 붙는다"** 는 지적이 있었고, InputBase를 `<div>`로 전환하기로 했다.

## 제약 — focus 위임이 필요해짐

div로 바꾸자 네이티브 focus 위임이 사라졌다. UX를 유지하려면 InputBase가 wrapper 클릭 시 input에 focus를 수동으로 넣어야 했다:

```tsx
// InputBase.tsx
const handleClick = (e) => {
  if (isInteractiveTarget(e.target)) return;
  inputRef.current?.focus();
};
```

focus를 넣으려면 input DOM을 **명령적으로 잡을 수단**이 필요하다. InputBase는 자기가 감싼 children input을 직접 소유하지 않으므로, **소비자(TextField)가 input DOM을 가리키는 ref를 명시적으로 InputBase에 전달**해야 한다 → `InputBase`의 `inputRef: RefObject<HTMLElement>` prop 도입.

## 왜 병합까지 이어졌는가

TextField는 두 종류의 ref를 **같은 DOM `<input>`에 동시에** 꽂아야 했다:

- **내부 `inputRef`** — InputBase의 focus 위임에 쓰인다. InputBase가 `.current`를 읽어야 하므로 `RefObject` 성격이 필수다.
- **외부 `ref`** — TextField 소비자(RHF `register().ref`, 상위 컴포넌트 등)에게 input DOM을 노출한다. `RefObject`일 수도, `RefCallback`일 수도 있다.

React는 하나의 DOM 요소에 `ref` 속성을 단 하나만 받는다. 따라서 두 ref를 하나의 callback ref로 묶는 도구가 필요했다 → `useMergeRefs` 도입.

```tsx
// TextField.tsx
const inputRef = useRef<HTMLInputElement>(null);
const mergedRef = useMergeRefs(inputRef, ref);
return (
  <InputBase inputRef={inputRef}>
    <input ref={mergedRef} {...inputProps} />
  </InputBase>
);
```

즉 **ref 병합은 label→div 전환의 부산물**이다. label 시절엔 focus 위임이 네이티브로 해결됐기에 내부 `inputRef` 자체가 필요 없었고, 외부 `ref`만 단일 경로로 input에 직결하면 됐다.

## 검토한 대안들

### 외부 `ref`를 InputBase `inputRef`로 그대로 전달

```tsx
export function TextField({ ref, ... }) {
  return (
    <InputBase inputRef={ref}>
      <input ref={ref} ... />
    </InputBase>
  );
}
```

기각 근거:

- **callback ref에서 붕괴** — 소비자가 `<TextField {...register('phone')} />`로 spread하면 `ref`가 `RefCallBack` 타입이 된다. callback ref는 `.current`가 없어 InputBase의 `inputRef.current?.focus()`가 동작하지 않는다.
- **ref 미전달 케이스 붕괴** — 소비자가 ref를 안 넘기면 `ref === undefined`. wrapper 클릭 시 focus는 소비자 의사와 무관한 TextField의 UX 불변식인데, 이 경로에선 보장할 수 없다.

### 외부 `ref` prop 제거, 내부 `useRef`만 사용

```tsx
export function TextField({ ... }) {
  const inputRef = useRef(null);
  return (
    <InputBase inputRef={inputRef}>
      <input ref={inputRef} ... />
    </InputBase>
  );
}
```

기각 근거: 외부 소비자가 input DOM에 접근할 수 없다. RHF `register().ref` 연결 불가 → 폼 라이브러리와 연동 못함. TextField의 유용성 자체가 훼손된다.

### `useImperativeHandle`로 내부 ref를 외부에 주입

```tsx
const inputRef = useRef(null);
useImperativeHandle(ref, () => inputRef.current, []);
return (
  <InputBase inputRef={inputRef}>
    <input ref={inputRef} ... />
  </InputBase>
);
```

기각 근거:

- **타이밍 불일치** — `useImperativeHandle`은 effect 성격이라 실제 DOM mount 직후 한 프레임 동안 외부 ref가 `null`이다. RHF가 그 프레임에 필드를 등록하려 하면 누락된다.
- **React 권고 위반** — `useImperativeHandle`은 커스텀 핸들 객체를 노출하는 용도로 설계됐지, DOM 노드 자체를 유출하는 용도가 아니다.
- **동기화 누락** — 내부 `inputRef.current` 변경은 리렌더를 트리거하지 않으므로 `useImperativeHandle`이 재실행되지 않는다. key 변경 등으로 DOM이 교체되면 외부 ref가 stale해진다.

### InputBase가 children을 `querySelector`로 탐색

```tsx
// InputBase.tsx
const wrapperRef = useRef<HTMLDivElement>(null);
const handleClick = (e) => {
  if (isInteractiveTarget(e.target)) return;
  wrapperRef.current?.querySelector<HTMLElement>(INTERACTIVE_SELECTOR)?.focus();
};
```

→ `inputRef` prop을 제거해 병합 자체를 없앨 수 있다.

기각 근거: InputBase는 범용 wrapper다. "children 중 첫 focusable을 찾는다"는 **암묵 계약**을 강제하면 여러 interactive 요소가 섞이는 consumer(SelectInput trigger 등)에서 의도 외 동작이 나온다. 소비자가 `inputRef`로 focus 대상을 **명시적으로** 지정하는 현재 구조가 더 정확하다.

## 남은 복잡도

병합 도입 후 RHF `register().ref` 같은 callback ref와의 상호작용에서 복잡도가 생겼다 — callback identity churn, cleanup 시 null 전파 등. 이 문제는 `merge-refs` 구현 자체에서 흡수해야 하며, TextField/InputBase 설계를 뒤집을 이유는 아니다.

구현체 변화 — 이 복잡도는 React 18 시절 cleanup 수동 추적을 요구했지만, 이 레포는 React 19 환경이라 ref callback의 cleanup return을 React가 직접 처리한다. 자세한 간소화 근거·step·eslint-disable 설명은 [`merge-refs-r19-simplify.md`](./merge-refs-r19-simplify.md) 참고.

## 출처

- `src/components/InputBase/InputBase.tsx:44`
- `src/components/TextField/TextField.tsx:22-23`
- `src/utils/merge-refs.ts` (구현 근거는 [`merge-refs-r19-simplify.md`](./merge-refs-r19-simplify.md))
- PR https://github.com/langdy/langdy-design-system/pull/40#discussion_r3083412275
