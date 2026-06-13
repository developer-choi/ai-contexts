4# FullScreenBottomSheet Content 설계 결정

## Content의 역할

FullScreenBottomSheet는 위에서 아래로 드래그하면 닫히는 구조다.
Content는 그 내부의 스크롤 가능한 영역을 감싸는 컴포넌트다.

**한 줄 요약:** Content 영역이 스크롤 가능한 상태면, 드래그로 시트가 닫히는 걸 막는다.

## ~~왜 Content에서 막아야 하나~~

### ~~onPanEnd에서 막으면 안 되는 이유~~

`FullScreenBottomSheet.tsx`의 `handleDragEnd`에서 임계점 초과 여부를 체크해 닫는다.
여기서 "스크롤 가능하면 닫지 않는다"는 조건을 추가하면 닫히는 건 막을 수 있다.

그러나 framer-motion의 drag 이벤트 흐름은 다음과 같다:

```
pointerMove → framer-motion drag → 시트가 아래로 따라 내려가는 시각 효과
pointerUp   → onDragEnd → 닫을지 말지 결정
```

`onDragEnd`에서만 막으면 그 사이 시트가 이미 화면상에서 아래로 끌려 내려간다.
사용자가 리스트를 스크롤하는 동안 시트가 **아래로 끌려 내려가는 시각적 왜곡**이 생긴다.
손을 떼면 다시 원위치로 튀어돌아오는 UX가 된다.

### pointerMove stopPropagation으로 막아야 하는 이유

`stopPropagation`을 `pointerMove` 단에서 호출하면 framer-motion이 pan 제스처 자체를 인식하지 못한다.
드래그 애니메이션이 시작조차 되지 않아 시각적 왜곡이 없다.

`pointerDown`만으로는 부족하다. framer-motion의 pan은 `pointerMove` 기반으로 동작하므로
`pointerMove`도 함께 막아야 완전히 차단된다.

```tsx
// FullScreenBottomSheetContent.tsx
onPointerDown={isContentOverflowing ? (e) => e.stopPropagation() : undefined}
onPointerMove={isContentOverflowing ? (e) => e.stopPropagation() : undefined}
```

## state가 필요한가

현재 코드는 `isContentOverflowing` state + ResizeObserver로 오버플로우를 감시한다.

```tsx
// FullScreenBottomSheetContent.tsx
const [isContentOverflowing, setIsContentOverflowing] = useState(false);

useEffect(() => {
  const observer = new ResizeObserver(checkScrollable);
  observer.observe(element);
  return () => observer.disconnect();
}, [checkScrollable]);
```

state 없이 이벤트 시점에 직접 계산하는 방식도 가능하다:

```tsx
onPointerMove={(e) => {
  const el = ref.current;
  if (el && el.scrollHeight > el.clientHeight) e.stopPropagation();
}}
```

DOM 값을 이벤트 시점에 직접 읽으면 state + ResizeObserver 없이도 동작한다.
`pointerMove`가 fire될 때 이미 DOM에 최신 값이 있기 때문이다.

현재 state 방식은 "렌더 시점에 핸들러 자체를 붙이거나 안 붙이는" 패턴을 선택한 것으로, 설계 취향에 가깝다.

---

## touchAction: 'auto'는 왜 Root에 있나

### 배경

framer-motion은 `drag='y'`가 활성화된 `motion.div`에 `touch-action: none`을 인라인 스타일로 자동 설정한다.
이 CSS 속성은 브라우저 네이티브 스크롤 제스처를 전면 차단한다.

```tsx
// FullScreenBottomSheet.tsx — framer-motion이 내부적으로 touch-action: none을 설정
<motion.div
  drag={keyboardIsOpen ? false : 'y'}
  ...
/>
```

### stopPropagation만으로는 부족한 이유

`touch-action`과 `stopPropagation`은 완전히 다른 레이어다.

|                      | 차단 대상                     | 동작 레이어              |
| -------------------- | ----------------------------- | ------------------------ |
| `stopPropagation`    | framer-motion pan 제스처 (JS) | JavaScript 이벤트 버블링 |
| `touch-action: none` | 브라우저 네이티브 스크롤      | CSS / 브라우저           |

`stopPropagation`은 JS 이벤트 버블링만 막는다.
`touch-action: none`이 부모에 걸려 있으면 브라우저가 자식의 스크롤 자체를 허용하지 않는다.
Content에서 `stopPropagation`을 아무리 해도 `touch-action: none`은 그대로다.

### 왜 Root에 있어야 하나

키보드가 열리면 `drag={false}`로 전환된다. 그러나 framer-motion이 이전에 박아둔 `touch-action: none` 인라인 스타일이 즉시 제거되지 않을 수 있다.
`touchAction: 'auto'`를 명시적으로 Root에 덮어써야 하위 전체의 네이티브 스크롤이 복원된다.

```tsx
// FullScreenBottomSheet.tsx
<motion.div
  style={{ touchAction: keyboardIsOpen ? 'auto' : undefined }}
  drag={keyboardIsOpen ? false : 'y'}
  ...
/>
```

Content에서 `useKeyboardIsOpen()`을 선언하고 `touch-action: auto`를 걸어도 Content 영역 자체는 해결된다.
그러나 키보드 오픈 시 `drag={false}`는 여전히 Root에서 제어해야 한다. AppBar 등 Content 밖 영역에서 드래그가 시작되면 Content의 `stopPropagation`이 닿지 않기 때문이다.

`useKeyboardIsOpen`이 Root에 있어야 하는 이상, `touchAction: 'auto'`도 Root에 함께 두는 것이 자연스럽다.

---

## 임계점 초과 시 dip-up 현상 제거

### 현상

임계점(offset > 150px 또는 velocity > 800)을 넘겨 드래그 후 손을 떼면, 닫히기 전에 element가 살짝 위로 올라갔다가 내려가는 현상이 있었다.

### 원인 규명

`dragTransition` 값을 바꾸며 실험으로 증명했다.

- `bounceStiffness: 0` → dip-up 없이 바로 닫힘
- `bounceStiffness: 6000, bounceDamping: 0` → dip-up이 극도로 심해짐

pointer up 순간 두 가지가 동시에 시작된다:

1. **`dragTransition` 스프링** — Framer Motion 내부에서 즉시 `dragConstraints` 위치(y=0)로 당기기 시작
2. **`onDragEnd` 콜백** — 임계점 초과 확인 → `onClose()` → React 리렌더 → exit 애니메이션

스프링은 임계점 로직을 모르고 무조건 실행된다. exit 애니메이션이 시작되기 전 1~2 프레임 동안 스프링이 위로 당겨서 dip-up이 보였다.

`dragMomentum={false}`는 해결책이 아니었다. `dragMomentum`은 velocity 기반 flick 관성을 끄는 것이고, dip-up의 원인인 constraint snap-back은 별개다.

### 구조적 한계

`dragElastic`이 두 가지를 동시에 담당한다:

- 드래그 중 손가락을 따라오는 시각적 피드백
- 손을 뗄 때 `dragConstraints` 위치로 자동 복귀

이 두 가지를 분리하는 built-in prop이 없다. 어떤 `dragTransition` 값 조합으로도 "시각적 피드백은 유지, 임계점 초과 시 복귀만 차단"을 동시에 달성할 수 없다.

### 해결

`dragConstraints.bottom`을 제거해 자동 snap-back 자체를 없애고, `onDragEnd`에서 직접 제어한다.

```tsx
const y = useMotionValue(0);

// onDragEnd
if (isDragThresholdExceeded(info)) {
  onClose(); // exit 애니메이션이 y → '100%' 처리
} else {
  animate(y, 0, {type: 'spring', stiffness: 600, damping: 40}); // 수동 스냅백
}

// motion.div
<motion.div
  style={{y}}
  dragConstraints={{top: 0}} // bottom 제거
  dragElastic={{top: 0}} // bottom 제거
  dragMomentum={false}
  // dragTransition 제거
/>;
```

`dragConstraints.bottom`이 없으면 복귀할 목적지가 없어서 자동 스프링이 발동하지 않는다. 임계점 미달 시 snap-back은 `animate(y, 0, ...)` 한 줄로 직접 처리한다.
