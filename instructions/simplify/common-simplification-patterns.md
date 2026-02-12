# 공통 단순화 패턴

> 라이브러리 종류와 무관하게 반복적으로 제거하는 범용 패턴 모음

---

## Disable/Enable Props 제거

**무엇을**: 기능을 켜고 끄는 boolean props (disable*)

**왜 불필요한가**:

- **학습 목적**:
    - 대부분 기본값(false) 사용 → 항상 켜진 상태
    - 예외 케이스는 학습에 불필요
- **복잡도**:
    - 각 disable prop마다 조건문 추가
    - 상호 의존성 (disableAutoFocus면 disableRestoreFocus도 고려)
    - 테스트 케이스 2^n개 (n = disable props 개수)
- **현실**: 99% 기본값 사용

**삭제 대상**:
- `disable*` 계열 props → 항상 기본 동작 유지
- 조건부 활성화 로직

**예시**:
```javascript
// ❌ 삭제 대상
function FocusTrap({ disableAutoFocus = false, disableEnforceFocus = false }) {
  if (!disableAutoFocus) {
    node.focus();
  }
  if (!disableEnforceFocus) {
    enforceFocus();
  }
}

// ✅ 단순화 결과
function FocusTrap() {
  node.focus();
  enforceFocus();
}
```

---

## 복잡한 Ref 처리 제거

**무엇을**: 여러 ref를 병합하거나 전달하는 복잡한 로직

**왜 불필요한가**:

- **학습 목적**:
    - ref 병합은 고급 주제
    - 단순한 ref 하나로도 컴포넌트 이해 가능
- **복잡도**:
    - `useForkRef` 유틸리티 필요
    - React.cloneElement로 자식 복제
    - ref 콜백 함수 생성 및 메모이제이션
- **대안**: ref 하나만 사용

**삭제 대상**:
- `useForkRef(ref1, ref2)` → 하나의 ref만 사용
- 복잡한 ref 병합 로직
- React.cloneElement로 ref 주입

**예시**:
```javascript
// ❌ 삭제 대상
const handleRef = useForkRef(forwardedRef, innerRef);
const childRef = getReactElementRef(children);
const handleChildRef = useForkRef(handleRef, childRef);
return React.cloneElement(children, { ref: handleChildRef });

// ✅ 단순화 결과
const rootRef = useRef(null);
return <div ref={rootRef}>{children}</div>;
```

---

## 브라우저 호환성 코드 제거

**무엇을**: 구형 브라우저를 지원하기 위한 코드

**왜 불필요한가**:

- **학습 목적**:
    - 현대 브라우저만 타겟
    - 호환성 코드는 레거시 지원용으로 학습과 무관
    - 표준 API 사용이 더 명확함
- **복잡도**:
    - Feature detection 조건문
    - Polyfill import 및 관리
    - Vendor prefix (-webkit-, -moz-, -ms-)

**삭제 대상**:
- IE11 대응 코드
- 구버전 브라우저 대응 (vendor prefix 등)
- Polyfill
- Feature detection 조건문

**예시**:
```javascript
// ❌ 삭제 대상
const ownerDocument = (node ? node.ownerDocument : document) || document;
const isIE = typeof window !== 'undefined' && 'ActiveXObject' in window;
if (!Array.from) { /* polyfill */ }

// ✅ 단순화 결과
const ownerDocument = node.ownerDocument;
```

---

## Interval/Polling 로직 제거

**무엇을**: 주기적으로 상태를 체크하는 코드

**왜 불필요한가**:

- **학습 목적**:
    - 이벤트 기반 처리가 더 직관적
    - Interval은 브라우저 버그 우회용 (학습과 무관)
- **복잡도**:
    - setInterval/clearInterval 관리
    - 메모리 누수 방지 (cleanup)
    - Polling 주기 최적화
- **성능**: Polling 대신 이벤트 리스너 → CPU 사용 감소

**삭제 대상**:
- `setInterval()`로 주기적 상태 체크
- interval ID 관리 코드

**예시**:
```javascript
// ❌ 삭제 대상
const intervalId = setInterval(() => {
  if (doc.activeElement !== rootRef.current) {
    rootRef.current.focus();
  }
}, 50);
return () => clearInterval(intervalId);

// ✅ 단순화 결과
doc.addEventListener('focusin', handleFocusIn);
return () => doc.removeEventListener('focusin', handleFocusIn);
```

---

## 특수 케이스 처리 제거

**무엇을**: 특정 요소나 상황을 위한 예외 처리

**왜 불필요한가**:

- **학습 목적**:
    - 일반적인 케이스만 이해해도 충분
    - 특수 케이스는 고급 주제
    - 80%의 경우에 동작하면 학습 목적으로 충분
- **복잡도**:
    - 각 타입별로 다른 처리
    - Edge case detection 코드
    - 방어적 if문 남발

**삭제 대상**:
- 특정 타입별 예외 처리
- Edge case 방어 코드

**예시**:
```javascript
// ❌ 삭제 대상
if (event.target.tagName === 'INPUT' && event.target.type === 'radio') {
  const radioGroup = doc.querySelectorAll(`input[name="${event.target.name}"]`);
  // 라디오 그룹 내 포커스 이동 로직 (20줄)...
}
if (isSentinelNode(event.target)) {
  handleFocusSentinel(event);
}

// ✅ 단순화 결과
// 일반 Tab 순서에 따른 포커스 이동만 처리
```

---

## 복잡한 알고리즘 단순화

**무엇을**: 복잡한 계산이나 정렬 로직

**왜 불필요한가**:

- **학습 목적**:
    - 알고리즘 자체가 학습 주제가 아님
    - 단순한 방법으로도 대부분 정상 동작
- **복잡도**:
    - 수십 줄의 계산/정렬 로직
    - 배열 분리 → 정렬 → 병합

**삭제 대상**:
- 복잡한 정렬/탐색 알고리즘 → 단순한 대안으로 대체

**예시**:
```javascript
// ❌ 삭제 대상 (60줄의 tabIndex 정렬 알고리즘)
function orderByTabIndex(nodes) {
  const regular = [];
  const ordered = [];
  nodes.forEach(node => {
    if (node.tabIndex > 0) ordered.push(node);
    else regular.push(node);
  });
  return [...ordered.sort((a, b) => a.tabIndex - b.tabIndex), ...regular];
}

// ✅ 단순화 결과 (DOM 순서 그대로 사용)
const focusableNodes = rootRef.current.querySelectorAll('[tabindex], a, button, input');
```

---

## 유틸리티 함수 제거

**무엇을**: 재사용을 위한 helper 함수들

**왜 불필요한가**:

- **학습 목적**:
    - 한 곳에서만 쓰면 인라인이 더 명확
    - "무엇을 하는가"가 바로 보임
- **복잡도**:
    - 함수 정의 찾아가며 읽어야 함
    - 함수 이름으로 추상화 → 세부 동작 숨김
- **원칙**: YAGNI - 실제로 재사용할 때만 함수화

**삭제 대상**:
- 한 번만 사용되는 helper 함수들 → 사용처에 인라인 또는 제거

**예시**:
```javascript
// ❌ 삭제 대상 (별도 유틸리티 함수)
function getTabIndex(node) {
  const tabIndex = parseInt(node.getAttribute('tabindex') || '', 10);
  return Number.isNaN(tabIndex) ? -1 : tabIndex;
}
// 사용처
const index = getTabIndex(element);

// ✅ 단순화 결과 (인라인)
const index = parseInt(element.getAttribute('tabindex') || '', 10);
```

---

## Deprecated Props 제거

**무엇을**: 하위 호환성을 위해 남겨둔 옛날 props/API

**왜 불필요한가**:

- **학습 목적**:
    - 학습용으로는 최신 방식 하나만 이해하면 충분
    - 옛날 API를 배울 이유 없음
- **복잡도**:
    - 두 가지 API 병합 로직
    - fallback 체인 (a ?? b ?? c)
- **혼란**: "어느 걸 써야 하나?" → 선택지 줄이기

**삭제 대상**:
- deprecated 표시된 props
- 옛날 API를 새로운 API로 변환하는 병합 코드

**예시**:
```javascript
// ❌ 삭제 대상 (deprecated prop과 새 API 병합)
const BackdropSlot = slots?.backdrop ?? BackdropComponent ?? DefaultBackdrop;
const backdropProps = {
  ...BackdropProps,
  ...slotProps?.backdrop,
  ...componentsProps?.backdrop,
};

// ✅ 단순화 결과 (하나의 고정된 컴포넌트)
<DefaultBackdrop onClick={onClose} open={open} />
```

---

## 메타데이터 제거

**무엇을**: 개발/디버깅/문서화를 위한 추가 정보

**왜 불필요한가**:

- **학습 목적**:
    - PropTypes는 타입 검증 도구이지 핵심 로직이 아님
    - TypeScript를 사용하면 빌드 타임에 검증 (더 강력)
    - displayName은 DevTools에서만 유용
- **복잡도**:
    - PropTypes 100줄 이상
    - 실제 코드보다 메타데이터가 더 많음
- **프로덕션**: PropTypes는 빌드 시 제거됨

**삭제 대상**:
- `PropTypes` - 런타임 타입 검증
- `displayName` - 디버깅용
- `defaultProps` - 함수 파라미터 기본값으로 대체

**예시**:
```javascript
// ❌ 삭제 대상 (100줄 이상의 메타데이터)
Dialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  children: PropTypes.node,
  fullScreen: PropTypes.bool,
  // ... 30개 이상의 prop 정의
};
Dialog.displayName = 'Dialog';
Dialog.defaultProps = { maxWidth: 'sm' };

// ✅ 단순화 결과
function Dialog({ open, onClose, children }) {
  // 함수 파라미터에서 직접 기본값 설정
}
```
