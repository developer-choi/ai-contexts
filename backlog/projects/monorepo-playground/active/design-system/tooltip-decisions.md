# 토론 결과: Tooltip 결정 9건

## 배경

PR1 Tooltip 신규 컴포넌트 추가를 위한 결정 9건. 결정 1~4는 overview.md에서 도출한 미결 항목을 본 세션에서 토론(메인 잠정안 vs 반대 입장 에이전트 도전 → 메인 답변). 결정 5·6은 BACKGROUND 단계에서 사용자 sandbox 검증을 거쳐 사전 확정된 것을 본 문서에 자체완결적으로 기록. 결정 7은 step-4 stub 작성 + Reviewer 검토를 통해 추가된 사항. 결정 8은 IMPL 단계 코드 리뷰 중 사용자 질의로 후행 명문화.

## 프로젝트 조건

- Langdy 디자인시스템 V3, Radix Popover 단일 + 이벤트 분기 채택 (`overview.md` "기술 선택과 근거" 표의 방향 B)
- Figma 명세 그대로 따름: 12방향, hover/click 통합(`mode` prop), 트리거 간격 8px, **Appear는 Instant(지연 없음)**
- 외부 라이브러리: `@fluentui/react-icons` 사용 중, 자체 Icon 컴포넌트 없음
- 레포 내 다른 컴포넌트 아이콘 prop 타입: `ReactNode` (Modal `IconButton`, Toast `icon?: ReactNode`)
- 토론 도전 제외: hover/click 통합 / 트리거 자동 감지 미적용 (디자이너 명세 그대로 따름)

---

## 결정 1) API 형태

### 결정해야 할 것

Tooltip을 소비자에게 한 컴포넌트로 노출할지(`<Tooltip content="..." mode="hover"><Trigger /></Tooltip>`), 여러 서브컴포넌트를 조립하는 형태로 노출할지(`<Tooltip.Root><Tooltip.Trigger /><Tooltip.Content /></Tooltip.Root>` — Compound 패턴).

레포 내 Modal이 Compound 패턴(`<Modal.Root><Modal.Header /><Modal.Body /></Modal.Root>`)이라 이 PR도 같은 방향으로 갈지가 쟁점.

두 선택지:

- **A: Compound** — `<Tooltip.Root><Tooltip.Trigger>...</Tooltip.Trigger><Tooltip.Content>...</Tooltip.Content></Tooltip.Root>`
- **B: 단일 컴포넌트** — `<Tooltip content="..." mode="hover" position="bottom-center"><Trigger /></Tooltip>`

### 메인 잠정안 (도전 전)

A: Compound. 근거 — Radix Popover primitive 자체가 Compound, 레포 컨벤션 일관성(Modal), 추후 슬롯 확장 자연.

### 반대 도전

- Modal은 header/body/footer 슬롯 복수 → Compound 정당화. Tooltip은 trigger 1 + content 1, 슬롯 없음.
- 가장 흔한 사용 패턴(`<Tooltip content="..."><Icon /></Tooltip>` 한 줄)을 3-tag 보일러플레이트로 늘림.
- Sandbox(`TooltipB.tsx`)에서 단일 컴포넌트 + `content` prop으로 이미 검증 통과.
- Radix primitive 내부 Compound는 어댑터 사정. 공개 API와 분리 가능 (Radix Tabs도 그렇게 감쌀 수 있음).
- 시장 표준: MUI/Mantine/Chakra Tooltip 모두 단일.

### 메인 답변

도전 수용. 현 명세상 Compound가 강제하는 사용 사례 없음. Modal 일관성 근거는 약함 — Modal은 슬롯 복수가 명세에 있어 Compound가 필요했고, Tooltip은 그렇지 않음. YAGNI 위반 지적 인정.

### 결정

**단일 컴포넌트 채택**

- 형태: `<Tooltip content={...} mode="hover" arrowDirection="top-center" icon={...}><Trigger /></Tooltip>`
- `children`이 trigger, `content` prop이 본문
- `mode`는 optional (default `'click'` — figma component code default 매칭)
- 추후 슬롯 필요성이 명세에 등장하면 그때 Compound 전환 검토

---

## 결정 2) 방향 prop 모델

### 결정해야 할 것

Tooltip이 트리거 요소 기준으로 어느 방향(상/하/좌/우)에 어느 정렬(시작/중앙/끝)로 뜰지를 소비자가 prop으로 어떻게 지정할 것인가. 두 모델이 충돌한다:

- **Radix Popover 모델**: `side: 'top'|'right'|'bottom'|'left'` + `align: 'start'|'center'|'end'` 두 prop 분리. 4 × 3 = 12 조합.
  - 소비자 코드: `<Tooltip side="bottom" align="end" ... />`
- **Figma 모델**: `top-start`, `bottom-center`, `right-end` 같은 12개 토큰을 단일 값으로 표현.
  - 소비자 코드: `<Tooltip position="bottom-end" ... />`

### 메인 잠정안 (도전 전)

Radix 모델 그대로 노출 — `side` + `align` 두 prop 분리. 근거: Radix Popover API 직역, 어댑터 두께 최소화.

### 반대 도전

- Figma 토큰명(`top-start`, `bottom-center` 등)은 **디자이너-개발자 커뮤니케이션 단위**. 디자이너가 "bottom-end로 해주세요"라고 요청 → 분리 모델이면 개발자가 매번 머릿속에서 `side="bottom"`, `align="end"`로 split해야 함. 디자인시스템이 줄여야 할 인지 비용.
- "내부 변환층이 두꺼움" 근거 약함. `'bottom-end'.split('-')` 한 줄로 끝나며, 자동 충돌 회피(Radix가 내부에서 side 기준 reverse)도 split된 값으로 그대로 작동 → 영향 없음.
- 단일 prop이 API 표면 더 작음(2개 → 1개).

### 메인 답변

도전 수용. Figma 토큰명을 prop 값으로 그대로 받는 것이 디자인-개발 매핑 비용 최소화. 변환층은 한 줄이라 비용 무시 가능. 충돌 회피 동작도 영향 없음.

### 결정

**Figma 모델 채택 — `arrowDirection` 단일 prop, 12개 문자열 union 타입**

- prop 이름: `arrowDirection` (figma component code의 prop 이름과 1:1 매칭). 의미는 "화살표가 향하는 방향"이며 popup이 trigger의 어느 쪽에 뜨는지(=Radix `side`)와는 **반대**.
- 타입: `'top-start' | 'top-center' | 'top-end' | 'right-start' | 'right-center' | 'right-end' | 'bottom-start' | 'bottom-center' | 'bottom-end' | 'left-start' | 'left-center' | 'left-end'`
- default: `'top-center'` (figma 화살표가 위쪽 방향 = popup이 trigger 아래쪽에 위치. figma component code의 default는 `'bottom-center'`(=화살표 아래쪽)이나 사용자 결정으로 `'top-center'` 채택. align mismatch 시각 부작용 없음)
- 소비자 코드 예시: `<Tooltip arrowDirection="bottom-end" content="..." mode="hover"><Trigger /></Tooltip>`
- 내부 변환:
  ```ts
  const RADIX_SIDE_BY_ARROW_DIRECTION: Record<Side, Side> = {
    top: 'bottom',   // 화살표 위쪽 → content가 trigger 아래쪽
    right: 'left',
    bottom: 'top',
    left: 'right',
  };
  const [arrowSide, align] = arrowDirection.split('-') as [Side, Align];
  const side = RADIX_SIDE_BY_ARROW_DIRECTION[arrowSide];
  ```
  `arrowDirection`의 side 부분을 swap 매핑으로 Radix `side`(=content 위치)로 변환. `align`은 그대로 위임.

---

## 결정 3) 아이콘 노출 API

### 결정해야 할 것

Figma의 `hasIcon` boolean + `Icon` instance 분리 패턴은 레포 컨벤션(`has<Prop>` 금지)에 위배되므로 단일 prop으로 통합해야 한다. 그 단일 prop을 어떤 타입으로 받을지, 받은 노드의 크기를 디자인시스템이 강제할지가 쟁점.

두 선택지:

- **A: `icon?: ReactNode` 그대로** — 소비자가 넣은 노드를 디자인시스템이 sizing 강제 없이 그대로 렌더. 크기 일관성은 소비자 책임.
- **B: `icon?: ReactNode` + 내부 SCSS에서 컨테이너/shape 크기 강제** — `.icon` 컨테이너 20×20px, 내부 svg 16×16px 등으로 강제하여 시각 일관성 보장.

### 메인 잠정안 (도전 전)

B: 내부 sizing 강제. 근거 — 시각 일관성 보장, Figma fallback 디자인 측정값(20×20, 16×16)과 일치.

### 반대 도전

- ReactNode를 그대로 받으면 임의 크기/svg가 들어와 시각 일관성이 깨짐.
- Figma `Icon` instance 슬롯 = 아이콘 컴포넌트만 허용한다는 디자인 규약 신호.
- 타입을 디자인시스템 Icon 컴포넌트 union 또는 icon name string으로 좁히는 것이 안전.

### 메인 답변 (사용자 추가 검토 반영)

A 채택으로 변경.

- **figma-spec.md 재확인 결과**: 20×20·16×16은 표의 "토큰" 컬럼이 `—`인 측정값이고, L78에 "Tooltip 내부에 들어가는 **fallback 아이콘은** 코드상 컨테이너 20px·shape 16px로 별도로 그려져 있어"라고 명시. 즉 **fallback 아이콘 디자인의 측정값**이지 모든 아이콘에 강제되는 사이즈가 아니다. ErrorCircle 자체는 `size: "12" | "24"` 옵션을 가지므로 Figma도 아이콘 사이즈 변동 가능성을 열어둠.
- 메인 잠정안의 "Figma 명세와 일치" 근거가 측정값을 강제로 과대 해석한 약한 근거. 인정.
- 반대 에이전트의 "타입 좁히기"는 자체 Icon 컴포넌트 없고 `@fluentui/react-icons` 외부 의존 구조라 적용 어려움. 반대 에이전트의 "시각 일관성 강제" 우려는 **Figma 명세에 강제 규약이 없으므로 수용하지 않음** — 소비자 책임 영역.
- 레포 내 Icon prop 일관성도 ReactNode 그대로 받는 쪽(Modal, Toast).

### 결정

**`icon?: ReactNode` prop, 내부 sizing 강제 없음**

- prop: `icon?: ReactNode` (undefined이면 표시 안 함, `has<Prop>` 금지 컨벤션 준수)
- 디자인시스템은 아이콘 크기를 강제하지 않는다. Figma 명세에 강제 규약 없음, 소비자가 적절한 크기로 노드를 전달할 책임.
- 레포 내 Modal/Toast의 아이콘 prop 패턴과 일치

---

## 결정 4) Provider 노출 여부

### 결정해야 할 것

Tooltip에 Radix UI식 **Provider 패턴**(`<TooltipProvider delayDuration={500} skipDelayDuration={200}>`)을 소비자에게 export로 노출할지. Provider는 트리 상단에 두어 자식 Tooltip 인스턴스들이 "등장 delay", "인스턴스 전환 skip delay" 같은 페이지 단위 정책을 공유하게 만드는 패턴.

두 선택지:

- **A: Provider 노출** — `export const TooltipProvider`로 소비자가 페이지 단위 정책 조정. `<TooltipProvider delayDuration={...}><Tooltip ... /><Tooltip ... /></TooltipProvider>` 형태.
- **B: Provider 미노출** — 소비자는 Provider 의식 없음. 페이지 단위 조정 불가, 인스턴스 단위로만 동작.

### 메인 잠정안 (도전 전)

B: Provider 미노출. 근거 — API 단순화.

### 반대 도전

- "외부 클릭으로 자연스러운 close"는 click 모드 한정.
- hover 모드 다중 인스턴스 → `skipDelayDuration` 필요 (5개를 빠르게 옮겨다닐 때 매번 delay 걸리면 UX 저하).
- Radix Tooltip primitive에 Provider가 있는 이유가 정확히 이 시나리오.
- `delayDuration` default를 디자인시스템이 일방적으로 고정하는 근거 약함 — 제품마다 적정값 다름.
- 선택적 노출이 안전.

### 메인 답변 (사용자 추가 검토 반영)

B 채택. 근거 보강:

1. **`delayDuration`/`skipDelayDuration`은 본 컴포넌트와 무관 prop**. 이 두 prop은 Radix **Tooltip primitive 전용**이며, 본 PR은 Radix **Popover**만 사용한다(`overview.md` "기술 선택과 근거" 방향 B). Radix Popover에는 이 prop들이 없음.
2. **Figma 명세에 페이지 단위 정책·delay 토큰 부재**. `figma-spec.md` L40 "Appear는 `onClick` 또는 `onHover` 시 **Instant**로 나타난다 (지연 없음)" — 등장 delay 없음. 페이지 단위 정책을 정의하는 토큰·서술도 없음. Provider가 공유시킬 상태 자체가 명세에 존재하지 않는다.
3. **Figma의 click 모드 "다른 트리거 발생 시 기존 닫힘"(`figma-spec.md` L45)은 Provider 없이 처리됨**. Radix Popover의 외부 클릭 close 기본 동작에 의해 B의 trigger 클릭이 A의 외부 클릭으로 인식되어 A close → B open이 자동으로 일어남(`handover-radix-tooltip.md` L52). hover 모드 다중 인스턴스도 각 Tooltip 자체 hover 핸들러(pointerleave close + 새 pointerenter open)로 처리. 인스턴스 간 상태 공유 불필요.
4. **추후 명세 확장 대응**: Figma 명세에 delay/duration 같은 시간 토큰이 추가되면, 인스턴스 단위 prop(`<Tooltip delay={...}>`)으로 받는 형태를 우선 검토. 페이지 단위 공유 요구가 생길 때 Provider 도입. 본 PR 범위 밖.

### 결정

**B: Provider 미노출**

- 근거: Figma 명세에 페이지 단위 정책·delay 토큰 부재. Provider가 공유시킬 상태 없음.
- Figma click 모드 "다른 트리거 → 기존 닫힘"은 Radix Popover의 외부 클릭 close 기본 동작으로 자동 처리.
- hover 모드 다중 인스턴스도 각 Tooltip의 자체 hover 핸들러로 처리.
- 추후 명세 확장 시 인스턴스 prop 또는 Provider 추가는 비파괴적.

---

## 결정 5) 의존성 다중화 회피 — 두 라이브러리 동시 채택을 배제

> 본 결정은 BACKGROUND 단계에서 사용자 sandbox 검증을 거쳐 사전 확정. 본 토론에서는 그 결정의 근거를 decisions.md 안에 자체완결적으로 기록.

### 결정해야 할 것

hover + click 두 트리거를 모두 받는 Tooltip을 구현하는 가장 시맨틱적으로 정확한 방식은 Radix Tooltip(hover/focus 전용, `role="tooltip"` + `aria-describedby`) + Radix Popover(click 전용, `role="dialog"`)를 **모드별로 둘 다 사용**하는 것이다.

디자인시스템 내부 가이드의 위치:

- `docs/COMPONENT_DEVELOPMENT_GUIDE.md` L29-43은 "Radix UI 래핑"을 권장 방향 A로 두고, L37에서 Tooltip을 "직접 구현 시 회귀 위험이 큰 컴포넌트 (Dialog/Dropdown/Tabs/Tooltip 등)"로 분류하여 Radix 래핑 카테고리에 포함시킨다.
- `langdy-component-guide` 스킬은 위 가이드의 A/B/C 기준 적용을 안내한다.
- 두 문서 모두 **"Radix 래핑 일반 권장"까지만 명시**한다. 어느 Radix primitive 조합을 쓸지(Tooltip 단독 / Popover 단독 / 둘 다)는 명시하지 않으므로, 본 PR이 자체적으로 결정해야 한다.

본 결정은 "Radix 래핑" 가이드 권장 안에서 의존성 1개로 갈지 2개로 갈지의 정책 선택. 시맨틱 정확성을 우선시하면 둘 다 사용이 자연스러운 방향이지만, 의존성 단일화의 이득을 위해 이를 의도적으로 배제할지가 쟁점.

### 메인 잠정안 (도전 전)

권장대로 둘 다 사용. 근거: 시맨틱 정확성(hover=`role="tooltip"` + `aria-describedby`, click=`role="dialog"`), 각 Primitive의 표준 ARIA/UX·키보드 동작·collision 회피를 그대로 받는 이점.

### 반대 도전

- 디자인시스템 컴포넌트는 광범위·장기 운영. **의존성 2개를 평생 동기 관리**해야 함 — Radix 각 패키지의 버전·patch·번들 크기·breaking change 추적 비용이 두 배.
- 두 Primitive를 mode 분기로 동시 유지하면 **회귀 표면이 두 배**. 한쪽 라이브러리 동작 변경이 다른 쪽에선 없을 수 있어 디버깅·테스트 부담.
- 시맨틱 정확성은 **스크린리더 사용자에 한정된 이점**. 시각·키보드 사용자 동작에는 차이 없음.
- BG 단계 sandbox 검증으로 **단일 Primitive(Popover)만으로 5개 시나리오 모두 통과** 확인됨 (`cross-analysis.md`).

### 메인 답변

도전 수용. 권장 방향이 시맨틱에서 우위인 점은 명백하지만, **디자인시스템 컴포넌트의 장기 유지보수 비용**을 우선시한다. 두 라이브러리 동시 채택은 다음 조건에서만 재고:

- 시맨틱 부정합이 접근성 검증에서 실제 문제로 제기됨
- 단일 Primitive로 명세 요구사항을 만족시킬 수 없음이 사후 확인됨

비파괴적 전환 가능 — 공개 API를 유지한 채 내부 구현만 교체 가능하므로 지금 정책 선택의 reversibility는 높음.

### 결정

**두 라이브러리 동시 채택 배제 — 단일 Primitive로 간다**

- 가이드가 명시한 "Radix 래핑" 권장은 유지하되, 가이드가 명시하지 않은 영역(어느 primitive 조합인지)에서 의존성 단일화를 채택. 근거: 의존성 1개·내부 트리 일원화로 장기 유지보수 비용 최소화.
- 시맨틱 정확성 우위(hover별 `role="tooltip"`)는 의도적으로 포기. 부정합(항상 `role="dialog"`)은 알려진 트레이드오프로 수용 (overview.md "리스크와 대응"에도 명시).
- 어느 1개를 선택할지(Tooltip 단독 vs Popover 단독)는 결정 6에서 다룬다.

---

## 결정 6) 단일 Primitive 선택 — Radix Tooltip 단독 vs Radix Popover 단독

> 본 결정은 BACKGROUND 단계에서 사용자 sandbox 검증을 거쳐 사전 확정. 본 토론에서는 그 결정의 근거를 decisions.md 안에 자체완결적으로 기록.

### 결정해야 할 것

결정 5에서 단일 primitive 정책이 확정됨. 그러면 남은 두 후보 중 어느 것을 쓸지:

- **D — Radix Tooltip 단독**: `@radix-ui/react-tooltip`만 사용. hover/focus 트리거.
- **B — Radix Popover 단독**: `@radix-ui/react-popover`만 사용. click 트리거 기본, hover는 controlled state + `onPointerEnter/Leave` + close debounce로 직접 구현.

(결정 5에서 배제된 A(둘 다 사용)는 후보 아님. 자세한 비교는 `overview.md` "기술 선택과 근거" 표.)

### 메인 잠정안 (도전 전)

D: Radix Tooltip 단독. 근거: 본 컴포넌트의 이름이 "Tooltip"이고 hover 트리거가 명세의 한 축이므로 시맨틱·이름 양쪽에서 가장 자연스러운 첫 후보.

### 반대 도전

Radix Tooltip primitive는 **hover/focus 전용으로 설계**되어 click 모드를 깔끔히 흉내낼 수 없다. Trigger 컴포넌트가 `onPointerMove`(open)·`onPointerLeave`(close)·`onPointerDown`(open이면 close)·`onClick`(close)·`onFocus`(open)·`onBlur`(close)를 모두 강제 바인딩하고 있어, controlled `open` + preventDefault 우회로도 깨끗한 click 트리거가 성립하지 않는다. 본 세션에서 sandbox 실측으로 4단계 우회를 모두 시도했으나, 가장 완화된 단계(`onPointerDown`+`onClick` 둘 다 preventDefault)에서도 "**클릭으로 띄운 뒤 마우스가 trigger를 벗어나면 `onPointerLeave`의 내부 close가 발화되어 자동으로 사라지는**" 결정적 한계가 남았다. 본 PR Figma 명세는 `mode='click'`(주로 모바일/터치)을 요구사항으로 포함하므로, primitive 설계상 명세 충족 불가.

상세 분석(공식 문서 정의 · 소스코드 핸들러 발췌 · 메인테이너 답변 #2029 · sandbox 실측 4단계 결과)은 별도 부록 [`tooltip-radix-click-analysis.md`](./tooltip-radix-click-analysis.md) 참조.

### 메인 답변

도전 수용. Tooltip 단독은 primitive 설계상 click 모드 구현 불가로 명세 요구사항 미충족. 결정 5의 단일 primitive 정책 아래 남는 후보는 Popover 단독뿐.

### 결정

**B: Radix Popover 단독**

### 근거

**Popover로 hover 모드까지 흉내 가능한지 BG sandbox 실측으로 확인** (`cross-analysis.md` L33):

| 시나리오                                             | 결과 |
| ---------------------------------------------------- | ---- |
| hover 다중 인스턴스 전환                             | 통과 |
| click 외부 클릭 닫힘                                 | 통과 |
| hover bridge (트리거→content 마우스 이동 중 안 닫힘) | 통과 |
| 12 placement                                         | 통과 |
| collisionPadding 자동 회피                           | 통과 |

5개 시나리오 모두 통과 → Popover 단독으로 명세 동작 모두 구현 가능.

**시맨틱 트레이드오프**

Popover의 `role="dialog"`는 "대화형 영역" 시맨틱이므로 hover로 떠 있는 보조 정보에는 부정확. 스크린리더가 hover 시 "대화 시작"으로 안내할 수 있음. 이 트레이드오프는 결정 5(의존성 단일화 정책)에서 이미 수용된 사항(시각·키보드 사용자에게는 영향 없음, 스크린리더 한정). 추후 접근성 검증에서 문제 제기 시 결정 5를 재고하고 방향 A로 전환 — 비파괴적(공개 API 유지하며 내부 구현만 교체 가능).

---

## 결정 7) 외부 controlled API 미노출

> 본 결정은 step-4 stub 작성 중 사용자 검토로 추가. 초기 잠정안의 "controlled/uncontrolled 둘 다 노출"이 결정 4(Provider 미노출)의 정신과 일관성 결함을 보여 정정.

### 결정해야 할 것

Tooltip이 `open` + `onOpenChange` prop을 소비자에게 노출하여 외부에서 open 상태를 제어할 수 있게 할지.

두 선택지:

- **A: 외부 controlled 노출** — `open` + `onOpenChange` props. 소비자가 외부 버튼·로직으로 Tooltip을 열고 닫을 수 있음.
- **B: 외부 controlled 미노출** — Tooltip 내부 `useState`로만 관리. 소비자는 trigger 요소를 통해서만 상호작용. 단, **내부 controlled state는 유지** (hover 모드 `onPointerLeave` 100ms close debounce 구현에 필수).

### 초기 잠정안 (step-3 토론 부수 사항)

A: 둘 다 노출. 근거 — "Radix Popover가 둘 다 지원, 표준".

### 정정 근거 (사용자 검토)

- "Radix가 지원하니까 노출"은 결정 4가 거부한 근거 패턴과 동일. 결정 4(Provider 미노출) `decisions.md` L143: "Figma 명세에 페이지 단위 정책·delay 토큰 부재. Provider가 공유시킬 상태 없음".
- 같은 논리로 Tooltip 외부 controlled도 Figma 명세에 요구 없음. hover/click 트리거가 자체적으로 open·close를 다루며, 외부에서 닫는 API 시나리오는 명세에 정의되지 않음.
- TooltipB.tsx(sandbox)도 외부 controlled prop 노출 안 함. sandbox 검증 5개 시나리오에도 외부 controlled 없음.
- API 표면 최소화 원칙(도입 이득)과도 정합.

### 결정

**B: 외부 controlled 미노출**

- `TooltipProps`에서 `open`, `onOpenChange` 제거
- 내부 `useState`는 유지 — hover 모드의 `onPointerLeave` 100ms close debounce에 필수. Radix Popover.Root에는 항상 controlled로 넘긴다 (내부 state 기반).
- 추후 명세에 외부 제어 요구가 추가되면 prop 추가는 비파괴적 확장.

---

## 결정 8) hover bridge 알고리즘 선택

> 본 결정은 IMPL 단계 코드 리뷰 중 사용자 질의로 발견. 결정 5·6에서 "100ms close debounce" 어휘로 부수 언급되었으나, 알고리즘 선택의 비교·근거가 별도 결정으로 기록되지 않았던 누락을 후행 명문화. **흐름**: A(시간) → 디자이너 의견 + 1차 소스 검토로 B(::after) → 둥근 trigger 코너 케이스에서 부적합 발견 → 다시 A로 회귀(+ ::after는 갭 cover 보조).

### 결정해야 할 것

trigger와 content 사이 갭을 마우스가 통과하는 동안 hover 상태를 유지하는 알고리즘. trigger의 `onPointerLeave`가 즉시 close하면 content가 unmount되어 사용자가 도착할 hover target 자체가 사라진다.

네 선택지:

- **A: 시간 기반 (100ms close debounce)** — pointerleave 시점에 timer 시작. 그 사이 다른 pointerenter가 오면 cancel.
- **B: CSS invisible bridge** — content에 `::after`로 갭 영역을 채워 hover target 자체를 확장.
- **C: Radix Tooltip의 grace polygon 직접 포팅** — `getHull` + `isPointInPolygon` + 글로벌 `document.pointermove` 리스너 (~80줄).
- **D: `@floating-ui/react`의 `safePolygon()` interaction** — C와 동등 알고리즘을 라이브러리로.

### 흐름

1. **BG sandbox 시점**: A(시간 기반 100ms) 채택. sandbox 5개 시나리오 통과(`cross-analysis.md` L33).
2. **IMPL 코드 리뷰 중 디자이너 의견 제기** — 40~50대 정밀 조작 사용자가 100ms 안에 ::after 영역에 도달 못 할 수 있음. 시간을 늘리면 의도적으로 마우스 뺀 후 잔상이 어색. 시간 기반은 두 극단 못 만족 → B(::after)로 정정.
3. **1차 소스 검토 (B 도입 검증)** — Radix Popper는 floating-ui offset middleware에 `sideOffset + arrowHeight`를 넘김(`simplified-radix-ui-primitives/.../popper.tsx:193`), 실제 trigger~content 박스 거리 = 20px이고 figma의 "트리거 간격 8px"는 trigger~Arrow tip 거리. ::after height는 `calc(SEMANTIC_GAP_SM + ARROW_HEIGHT)`로 정정.
4. **사용자 storybook 실측 — 둥근 trigger 케이스에서 B 부적합 발견** — `border-radius: 50%`로 trigger의 hit-test가 둥근 영역만 따르고, trigger 박스 사각형과 둥근 영역 사이 **코너 빈공간**에 마우스가 빠지면 ::after 영역 밖이라 hover bridge 깨짐. 마우스가 trigger 중심에서 약간 빗겨 위로 올리는 자연스러운 경로에서 자주 발생.
5. **z-index/영역 보정 시도** — ::after를 trigger 안쪽까지 침범시키고 `z-index: -1`로 trigger click을 위로 통과시키는 시도. trigger click 막힘 / `:hover` 스타일 영향 등 부작용 발견 → 폐기.
6. **다시 A로 회귀 + ::after는 갭 cover 보조** — 100ms timer가 둥근 trigger 코너 통과 케이스를 cover하는 grace period 역할. ::after는 trigger~content 갭(20px) cover만 담당. 디자이너의 100ms 우려는 "200ms로 늘릴 수 있는 비파괴적 옵션"으로 백로그.

### 결정

**A(시간 기반 100ms) + ::after(갭 cover 보조) 채택 — 두 메커니즘 OR**

- 100ms `HOVER_CLOSE_DEBOUNCE_MS` timer + `closeTimerRef` + `cancelClose`/`handleEnter`/`handleLeave` + `useEffect` cleanup
- ::after 4방향 `calc(SEMANTIC_GAP_SM + ARROW_HEIGHT) = 20px` cover (영역 보정 buffer 없음)
- 동작:
  - 마우스가 ::after 영역 안에 진입 → content/`::after`의 pointerenter 발화 → `cancelClose()` + `setOpen(true)` → 유지 (즉시 hit)
  - 마우스가 ::after 영역 밖 (예: 둥근 trigger 코너 빈공간) → trigger pointerleave의 timer가 100ms 동안 close 대기 → 그 안에 trigger 또는 ::after 다시 진입 시 cancel → 유지

### 영향

- `Tooltip.tsx`: `HOVER_CLOSE_DEBOUNCE_MS = 100` + `closeTimerRef` + `cancelClose`/`handleEnter`/`handleLeave` + `useEffect` cleanup + `hoverProps`(trigger asChild + content 양쪽 spread) + `onOpenAutoFocus`/`onCloseAutoFocus` `preventDefault` (hover 모드)
- `Tooltip.module.scss`: ::after 4방향 `sideOffset + arrowHeight` cover. 영역 보정 buffer 없음. `$side-offset` / `$arrow-height` SCSS 변수와 JS 상수 매뉴얼 동기화
- `Tooltip.test.tsx`: hover 2 + click 3 + icon 1 = 6 cases. hover bridge 자체는 JSDOM의 React batching 미시뮬레이션 한계로 단위 검증 불가, storybook 시각 검증으로 cover.

### 검증

- 사용자 storybook 실측 ✅:
  - hover bridge: trigger → 갭 → content 유지
  - 둥근 trigger(`Variants/Positions` 스토리, 24×24 원) 코너 빈공간 통과: 100ms timer로 cover
  - trigger 떠나서 ::after 거치지 않고 빼기: 100ms 후 close
  - 단위 테스트 6/6 통과

---

## 결정 9) 화살표 구현 방식 — Radix `Popover.Arrow` vs `.arrow` span 직접 그리기

### 결정해야 할 것

12 방향 모두에서 align(start/center/end)에 따라 화살표가 정확한 위치(start면 content edge에서 `padding-md` 안쪽 / center면 가운데 / end면 반대편 edge에서 `padding-md` 안쪽)에 놓이게 구현한다.

### 흐름

- 1차 시도: Radix `Popover.Arrow` + `arrowPadding` prop.
- 문제: Radix 내부 로직상 `cannotCenterArrow`로 판정되는 케이스에서 `arrowPadding` 값이 무시되고, 화살표가 trigger 중심을 따라 강제 정렬됨. 24×24 같은 작은 trigger에서 align=start/end의 의도된 위치(edge에서 12px 안쪽)와 어긋남.
- 대안: `.arrow` `<span>`을 Content 내부에 직접 두고 CSS `position: absolute` + `clip-path: polygon(...)`으로 그린다.

### 결정

**`<span class={styles.arrow} aria-hidden="true" />` 직접 그리기 채택.**

- `data-side` 별로 4종 삼각형(`clip-path` polygon) 정의 — top/bottom은 `width: 13.856px height: 12px`, left/right는 회전된 비율.
- `data-align` 별 위치:
  - start → `left/top: <edge inner-padding>` (디자인이 정한 content edge 안쪽 거리)
  - center → `50% + translate(-50%)`
  - end → `right/bottom: <edge inner-padding>` (start와 같은 값)
- content와의 1px 겹침(`calc(100% - 1px)`)으로 sub-pixel/antialiasing 갭 방지.
- 색상은 content 배경과 동일.

### 영향

- `Popover.Arrow` 제거 → arrow 위치를 우리 CSS가 100% 통제 (Radix 내부 로직에 의존하지 않음).
- 트레이드오프: collision 발생 시 Radix가 side를 자동 flip해도 우리 CSS는 `data-side`만 보고 그리므로 자연스럽게 따라간다 (수동 동기화 불필요).

### 검증

- Storybook `Variants/Positions` (24×24 원 trigger 12개) — 모든 방향 align=start/center/end에서 화살표 위치 디자인 일치 ✅
- `Pattern/CollisionAvoidance` — viewport 경계 trigger에서 flip 발생 시에도 arrow가 정상 위치 ✅

---

## 도입 이득

- API 표면 최소화 (단일 컴포넌트 + 단일 `arrowDirection` + Provider 없음)
- 디자이너 Figma 토큰명과 코드 `arrowDirection` 값 1:1 매핑 (인지 비용 최소)
- 레포 내 다른 컴포넌트와 아이콘 prop 타입 일관성
- 의존성 단일화 — Radix Popover 1개만 추적

## 도입 비용

- `arrowDirection` 12-union 내부 split + Radix `side` swap 변환 (RADIX_SIDE_BY_ARROW_DIRECTION 4-entry 상수)
- hover 모드를 직접 구현하는 코드 (controlled state + 핸들러 + close debounce + CSS ::after bridge) — sandbox/실측 검증 완료
- 화살표를 Radix가 아닌 우리 CSS로 그리는 비용 (.arrow span + clip-path 4종 + align 위치 6 규칙) — Popover.Arrow의 `cannotCenterArrow` 제약 우회

## 리스크와 대응

- **시맨틱**: 항상 `role="dialog"` (`overview.md` 방향 B 채택의 알려진 트레이드오프). 대응: overview.md에 명시. 접근성 검증 시 인지.
- **추후 명세 변경**: delay/Provider 필요해지면 추가. 대응: 현재 API가 비파괴적 확장 가능 (단일 컴포넌트 + prop 추가만으로 대응).
- **아이콘 크기 불일치**: 소비자가 임의 크기 노드를 전달할 수 있음. 대응 없음 — Figma 명세에 강제 규약 없으므로 소비자 책임 영역으로 둔다.

## 결론

의존성 단일화 정책(결정 5) → 라이브러리 선택 Radix Popover 단독(결정 6) 위에 **단일 컴포넌트(결정 1) + `arrowDirection` 12-union + RADIX_SIDE_BY_ARROW_DIRECTION swap(결정 2) + `icon` ReactNode·sizing 미강제(결정 3) + Provider 미노출(결정 4) + 외부 controlled 미노출(결정 7) + hover bridge timer + CSS ::after(결정 8) + `.arrow` span 직접 그리기(결정 9)** 조합으로 확정.

9개 결정 모두 Figma 명세 충실 해석 + 레포 컨벤션 일관성 + API 표면 최소화 + a11y 정합성의 교집합이며, BG 단계의 sandbox 실측 결과(`cross-analysis.md` L33) 및 IMPL 단계의 Storybook 실측(`Variants/Positions`, `Pattern/CollisionAvoidance`)과 정합.

추가로 본 토론에서 확정된 부수 사항:

- `mode` default: `'click'`
- `arrowDirection` default: `'top-center'`

## 스킵한 항목

(없음 — 결정 1~4 토론·답변·결정 완료. 결정 5·6은 BG 사전 확정으로 본 세션 토론 대상 아님. 결정 7은 step-4 stub 작성 + Reviewer 검토 중 추가. 결정 8은 IMPL 코드 리뷰 중 사용자 질의로 후행 명문화 + 디자이너 의견 / 1차 소스 검토로 A→B→A 정정. 결정 9는 IMPL 단계 Storybook 실측 중 발견된 Radix 한계 우회로 후행 명문화)
