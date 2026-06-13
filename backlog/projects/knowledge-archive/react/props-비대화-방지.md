# Props 비대화 방지 패턴

## [ideation] 외부 SDK 래퍼 컴포넌트 props 폭증

### 기대상황 (필수)

외부 SDK(예: Toss Payments)를 React 컴포넌트로 래핑할 때, props 개수가 5~6개를 넘지 않으면서도 부모가 SDK 기능에 충분히 접근 가능한 설계 패턴 가이드를 보유. 새로운 SDK 래퍼를 만들 때 이 가이드를 참조해 처음부터 비대해지지 않게 설계.

### 현재상태 (선택)

langdy-student `src/components/Purchase/RenewedPurchase/PurchaseOverlay/TossPaymentWidget.tsx`에서 props 9개로 비대:

- `customerKey`, `variantKey`, `amount` (입력 3개)
- `onReady`, `onWidgetsReady`, `onAgreementChange`, `onPayMethodChange`, `onError` (콜백 5개)
- `paymentMethodVariant` (variant 분기 1개)

콜백 5개 중 일부는 Toss SDK 이벤트를 그대로 표면으로 노출한 형태(SDK 용어 누수). 그룹화·통합 없음.

### 현재 생각중인 방법 (선택)

후보 패턴 (옵션별 trade-off 비교 필요):

- **imperative ref API** — `useImperativeHandle`로 widgets 인스턴스 노출. 부모가 직접 `widget.requestPayment(...)` 호출. 콜백 polling 대신 부모가 명령형 호출
- **단일 onChange 객체 콜백** — `onChange({ agreement, payMethod, error, ... })` 1개로 통합
- **부모가 SDK 직접 호출 + 컴포넌트는 슬롯 DOM만** — 컴포넌트는 `<div ref>` 슬롯만, SDK 초기화·이벤트 구독은 부모. headless에 가까움
- **headless hook 분리** — `useTossWidget(opts)` 훅이 SDK 상태·이벤트 노출, view 컴포넌트는 얇은 슬롯. 로직과 UI 분리
- **reducer/state machine** — 위젯 상태(idle/ready/paying/error)를 state machine으로 추상화. 부모는 상태 구독

조사 항목:
- 본 코드베이스 다른 SDK 래퍼 사례 (있다면 어떤 패턴 채택했는지)
- 토스 공식 React 예제·가이드의 권장 패턴
- 일반적인 headless 패턴 사례 (radix-ui, react-aria, downshift 등)
- 각 옵션의 trade-off (테스트 용이성, 부모 boilerplate, SDK 업데이트 대응)

### 종료 조건

- AC `deploy/contexts/coding-standards/` 또는 `topics/react/`에 가이드 1건 박힘
- TossPaymentWidget 리팩터 방향이 가이드에 비춰 결정됨

### 첫 행동

- langdy-student 본 코드베이스에서 `useImperativeHandle` 사용처와 외부 SDK 래퍼 컴포넌트들 grep
- 토스 공식 문서(`@tosspayments/tosspayments-sdk` README, React 예제) 확인
- radix-ui·react-aria의 headless 패턴 1차 소스 읽기

## [ideation] 사례 회고 — langdy-student TossPaymentWidget (PR3, 2026-05)

### 기대상황 (필수)

PR3 IMPL 중 만든 TossPaymentWidget이 위 [외부 SDK 래퍼 컴포넌트 props 폭증] 항목에서 정의할 가이드를 따르도록 리팩터됨. 같은 사고가 다음 SDK 래퍼에서 재발하지 않음.

### 현재상태 (선택)

`src/components/Purchase/RenewedPurchase/PurchaseOverlay/TossPaymentWidget.tsx`의 props 9개에서 다음 안티패턴 동시 발생:

- **SDK 용어 그대로 누수**: `customerKey`(→ 도메인은 `userId`), `variantKey`, `paymentMethodClassName`을 컴포넌트 인터페이스에 박음
- **고정 상수 prop 노출**: `variantKey.agreement` 등 위젯 사용 내내 고정인 키를 부모가 매번 전달
- **derive 가능한 prop 별도 수신**: `paymentMethodClassName`이 `paymentMethodVariant`에서 파생 가능한데도 별도 prop
- **SDK 타입 콜백 표면 노출**: `onWidgetsReady`가 `TossPaymentsWidgets` 인스턴스를 그대로 부모로 넘김 → 부모가 SDK 타입 의존
- **그룹화 0건**: 9개 prop 평평하게 나열, 입력/콜백/variant 그룹 구분 없음

PR3 IMPL 세션 중 위 항목을 점검할 절차 없음 (Step 5.4 회귀 체크리스트에 props 비대화 검사 없음, Coding-Standards Reviewer 누락 — task #2·#3 참조).

### 현재 생각중인 방법 (선택)

원인 가설:
- 토스 공식 예제가 SDK 인자명을 그대로 컴포넌트 prop으로 매핑하는 형태로 제시됨 → 그대로 베낌
- "부모가 위젯 인스턴스를 받아야 한다" 요구를 콜백 노출(`onWidgetsReady`)로 처리 → imperative ref API 같은 대안 미검토
- props 9개 도달 시점에 "그룹화하자" 멘탈 트리거 없음

해결 가이드 (작업 시 적용):
- 컴포넌트 props는 SDK 용어가 아닌 컴포넌트가 노출하고 싶은 도메인 용어로 명명 (`customerKey` → `userId`)
- 고정 상수는 prop으로 받지 말고 컴포넌트 내부 상수로 박기 (`variantKey.agreement` 등)
- derive 가능한 값은 받지 말고 컴포넌트 안에서 계산 (`paymentMethodVariant`에서 className 도출)
- SDK 타입은 콜백·ref API 표면에 그대로 노출하지 말고 도메인 핸들(필요한 메서드만 추출한 인터페이스)로 래핑
- 합칠 수 있는 prop은 합치되, 합치기 어려우면 의미별 객체 그룹핑만 해도 가독성 향상
- 단, 객체 그룹핑은 부모가 매 렌더 새 객체 생성 → effect deps 무효화 위험이 있으니 useMemo 안정화 비용도 같이 평가

### 종료 조건

- 위 [외부 SDK 래퍼 컴포넌트 props 폭증] 가이드 박힐 때 본 사례를 antipattern 예시로 포함
- TossPaymentWidget 리팩터 PR이 가이드 적용해 props 5개 이하로 축소

### 첫 행동

- `src/components/Purchase/RenewedPurchase/PurchaseOverlay/TossPaymentWidget.tsx` props 인터페이스 read
- 토스 공식 React 예제(`@tosspayments/tosspayments-sdk` README)와 본 컴포넌트 인터페이스 1:1 비교 — 어느 prop이 SDK에서 1:1로 베껴졌는지 식별
