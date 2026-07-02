# 부록: Radix Tooltip primitive로 click 트리거 흉내내기 가능성 분석

> `decisions.md` 결정 6 "D 후보(Radix Tooltip 단독) 제외" 근거의 상세 분석.
> decisions.md 본문에서는 한 문단으로 축약하고, 1차 소스 인용과 실측 결과는 이 부록으로 분리.

## 결론

**불가능.** `@radix-ui/react-tooltip` primitive는 hover/focus 전용으로 설계되었고, controlled `open` + onClick 우회로도 깨끗한 click 트리거가 성립하지 않는다. 회피 시도마다 다음 우회 비용이 누적되며, 가장 결정적으로는 `onPointerLeave`까지 막을 길이 없어 **클릭으로 띄워도 마우스가 trigger를 벗어나는 순간 자동 close** 된다 (sandbox 실측 확인).

---

## 1차 소스 4가지

### (a) 공식 문서 정의에 click 부재

[radix-ui/website data/primitives/docs/components/tooltip.mdx](https://github.com/radix-ui/website/blob/main/data/primitives/docs/components/tooltip.mdx):

> "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it."

Trigger의 공개 prop은 `asChild`만 노출. click 트리거는 정의·prop 어디에도 포함되지 않는다.

### (b) Trigger 내부 핸들러가 click·pointerdown·pointerleave를 강제 바인딩

[radix-ui/primitives packages/react/tooltip/src/tooltip.tsx L292-317](https://github.com/radix-ui/primitives/blob/main/packages/react/tooltip/src/tooltip.tsx#L292-L317) (사용자 로컬 클론본 동일 라인):

```tsx
onPointerMove={composeEventHandlers(props.onPointerMove, (event) => {
  if (event.pointerType === 'touch') return;
  if (!hasPointerMoveOpenedRef.current && !providerContext.isPointerInTransitRef.current) {
    context.onTriggerEnter();           // ← Tooltip 열기
    hasPointerMoveOpenedRef.current = true;
  }
})}
onPointerLeave={composeEventHandlers(props.onPointerLeave, () => {
  context.onTriggerLeave();             // ← Tooltip 닫기
  hasPointerMoveOpenedRef.current = false;
})}
onPointerDown={composeEventHandlers(props.onPointerDown, () => {
  if (context.open) {
    context.onClose();                  // ← 열려있으면 닫음
  }
  isPointerDownRef.current = true;
  document.addEventListener('pointerup', handlePointerUp, { once: true });
})}
onFocus={composeEventHandlers(props.onFocus, () => {
  if (!isPointerDownRef.current) context.onOpen();
})}
onBlur={composeEventHandlers(props.onBlur, context.onClose)}
onClick={composeEventHandlers(props.onClick, context.onClose)}
```

핵심 동작:

| 이벤트                   | 내부 강제 동작             | click 모드 관점 영향                           |
| ------------------------ | -------------------------- | ---------------------------------------------- |
| `onPointerMove` (마우스) | `onTriggerEnter()` → open  | 클릭하지 않아도 hover로 떠 버림                |
| `onPointerLeave`         | `onTriggerLeave()` → close | **클릭으로 띄워도 마우스가 떠나면 자동 close** |
| `onPointerDown`          | open이면 `onClose()`       | 클릭의 전반부에서 토글 망가뜨림                |
| `onClick`                | `onClose()`                | 클릭의 후반부에서 한 번 더 닫음                |
| `onFocus`/`onBlur`       | open/close                 | 키보드 Tab에 의도치 않게 토글됨                |

`composeEventHandlers`의 동작 규칙: 소비자 핸들러를 먼저 실행하고, `event.defaultPrevented`가 false인 경우에만 내부 핸들러를 실행한다. 즉, 내부 동작을 막으려면 소비자가 핸들러 안에서 `event.preventDefault()`를 호출해야 한다.

### (c) 메인테이너 공식 입장 — click 모드 공식 지원 없음

[radix-ui/primitives Issue #2029](https://github.com/radix-ui/primitives/issues/2029) (CLOSED), benoitgrelard:

> "Tooltips generally should close on activation (be it pointer or keyboard) so we use `onClick` for that. ... It would be great to have more control over this ... but unfortunately it doesn't exist."

같은 이슈 2025-04-30, PR #3380 머지 이후 `onPointerDown`에까지 close가 추가되어 기존 `onClick` preventDefault 우회법이 추가로 깨졌다. 2025-09 kruzliak-juraj 보고: 우회법이 Slider 드래그를 깨뜨려 결국 `open` 상태를 외부에서 관리할 수밖에 없음.

### (d) hover 자체를 끄는 prop 부재

`disableHoverableContent`는 공식 문서 정의대로 "Prevents Tooltip.Content from remaining open when hovering" — **콘텐츠 위에서의 hover 유지**만 차단한다. trigger의 hover open 자체는 그대로 동작하므로, click 모드만 운영하려 해도 hover open이 의도치 않게 동시 발화된다.

---

## Sandbox 실측 (Storybook)

검증 컴포넌트(이 PR 도중 검증용으로 잠시 만들었다 폐기): `RadixTooltipClickCheck` — `@radix-ui/react-tooltip` 기반으로 controlled `open` + 4단계 우회를 적용한 sandbox.

| #   | 시나리오           | 적용 우회                                 | 사용자 실측 결과                                                                                                                                                                       |
| --- | ------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Naive              | controlled `open`만 외부에서 토글         | 클릭해도 열림 상태가 유지되지 않음. 내부 `onClick → onClose`가 소비자 setOpen을 덮어쓴다.                                                                                              |
| 2   | ClickPrevent       | `onClick.preventDefault()`                | 첫 클릭은 열림. 그러나 두 번째 클릭에서 `onPointerDown`(open이면 close) 때문에 토글이 깨진다.                                                                                          |
| 3   | PointerDownPrevent | `onPointerDown.preventDefault()`          | `onClick` 내부 `onClose`가 여전히 발화 → 토글 안 됨.                                                                                                                                   |
| 4   | BothPrevent        | `onPointerDown` + `onClick` 둘 다 prevent | 클릭으로 띄우는 것까지는 가능. **그러나 trigger에서 마우스가 벗어나는 순간 `onPointerLeave`의 내부 `onTriggerLeave()`가 닫아버림** → "클릭으로 띄우고 유지" 의미 자체가 성립하지 않음. |

사용자 직접 검증 코멘트 (시나리오 4):

> "클릭해서 띄운다음 커서 다른데로 빼면 사라지네."

→ `onPointerLeave`까지 차단하려면 추가로 소비자 `onPointerLeave={(e) => e.preventDefault()}`를 또 붙여야 하고, focus/blur도 같은 방식으로 막아야 하며, 결국 **Tooltip primitive의 핸들러 거의 전체를 우회**하는 형태가 된다. 이 시점이면 primitive를 쓰는 의미 자체가 사라진다.

---

## 왜 Popover로는 같은 문제가 없나

[radix-ui/primitives popover.tsx](https://github.com/radix-ui/primitives/blob/main/packages/react/popover/src/popover.tsx)의 `PopoverTrigger`는 `onClick`을 통한 토글만 내부 동작으로 두고, `onPointerMove`/`onPointerLeave`/`onPointerDown`에 추가 close 로직을 강제 바인딩하지 않는다.

이 때문에 controlled `open` 외부 관리 + `onPointerEnter/onPointerLeave` 핸들러를 소비자가 직접 추가하는 방식으로 hover 모드를 흉내내는 것이 가능 — 현재 `src/components/Tooltip/Tooltip.tsx`의 구현 방향. BG 단계 sandbox에서 hover 다중 인스턴스 전환·click 외부 클릭 닫힘·hover bridge·12 placement·collisionPadding 자동 회피 5개 시나리오 모두 통과(`plan/background/cross-analysis.md` L33).

---

## 함의

- 결정 6에서 D(Tooltip 단독) 후보 제외의 근거가 단순한 "터치 미지원"을 넘어 **primitive 설계 차원의 click 모드 부재**임이 1차 소스 + 실측으로 확정.
- 우회 시 부작용: 텍스트 선택 차단, 드래그 차단, 키보드 포커스 동작 손상, 그리고 결국 `pointerleave` 자동 close까지 막지 못해 click "유지" 자체가 불가능.
- 의존성 단일화 정책(결정 5) 아래에서 남는 선택지는 사실상 Popover 단독뿐임이 재확인됨.
