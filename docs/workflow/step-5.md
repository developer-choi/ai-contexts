# Step 5: 상세 명세 작성 (Task Refinement)

이 단계는 `/plan/commit-sequence.md`에 정의된 각 커밋 단위 작업을 구체화하여 **최종 개발 명세서**를 완성하는 단계입니다.

> **[roadmap](docs/self-help/roadmap.md) 연결**: 4단계 - 구현의 여정
>
> 선택한 기술을 실제로 어떻게 적용했는지 설명합니다.
> - **구현 상세**: 구체적으로 어떻게 코드로 구현했는가?
> - **기술적 난관**: 구현 과정에서 마주친 엣지 케이스나 예상치 못한 문제는 무엇이었는가?

각 커밋에 대한 **상세 명세서**를 `/plan/tasks/` 폴더 아래에 생성해주세요.

**파일 명명 규칙**: `/plan/tasks/[순서]-[작업키워드].md` (예: `/plan/tasks/01-feat-button.md`)

---

## 참고 자료
- `/plan/background.md` (Step 1에서 생성됨)
- `/plan/overview.md` (Step 3에서 생성됨)
- `/plan/commit-sequence.md` (Step 4에서 생성됨)
- 기타 사용자가 추가로 전달한 비슷한 컴포넌트나 커밋 등

---

## [CRITICAL] 상세 스펙 누락 금지 및 품질 검증

- 개발자가 추가 질문 없이 바로 구현할 수 있을 정도로 구체적으로 작성
- 사용자가 제공한 정보를 그대로 복사하지 말고, **개발자 관점에서** 누락된 엣지 케이스와 예외 상황 보완
- 기술적 난관에 대한 구체적인 해결 방향 제시
- **커밋 전 검증 필수**: 각 커밋 단위의 작업을 완료할 때마다 반드시 다음 명령어를 수행하여 오류를 해결하세요.
  - `npx tsc --noEmit` (타입 체크)
  - 프로젝트 설정에 따른 린트 검사 (예: `yarn lint` 또는 `eslint` 실행)

---

## 공통 작성 항목 (모든 작업 필수)

모든 작업 명세서는 다음 항목들을 반드시 포함해야 합니다.

### 1. 개요
- **작업 파일**: 생성 또는 수정할 파일의 경로 (예: `src/components/.../FileName.tsx`)
- **목적**: 이 작업이 왜 필요한지 세 줄 미만 요약.

### 2. 예상 영향 범위
- **수정되는 파일**: 기존 코드를 수정해야 한다면 해당 파일 목록.
- **의존 관계**: 이 작업이 다른 컴포넌트/함수에 미치는 영향.

### 3. 핵심 로직 설계 (Core Logic Design)
- **[CRITICAL] 실제 코드 작성 금지**: `const`, `function`, `async/await`, `useCallback` 등 실제 구현 코드를 절대 작성하지 마세요.
- 대신 **의사 코드(Pseudo-code)**, **논리적 단계(Flow)**, 또는 **텍스트 서술**을 통해 로직의 흐름과 호출할 메서드만 기술하세요.
- 개발자가 구현 방식(How)을 고민하게 하는 것이 아니라, 수행해야 할 논리(What)를 전달하는 것이 목적입니다.

**❌ Bad (실제 코드 작성 - 금지)**
```typescript
const handleAccept = async () => {
  const status = await notification.checkPermission();
  if (status === 'GRANTED') {
    toggleNotification('PROMOTION', true);
  }
};
```

**✅ Good (로직 흐름 서술 - 권장)**
1. `notification.checkPermission()` 호출하여 권한 상태 확인
2. **GRANTED 상태인 경우**:
   - `toggleNotification('PROMOTION', true)` API 호출
   - 성공 토스트 노출 (포맷: `... (${dayjs().format('YYYY.MM.DD')})`)
   - `onAccept()` 호출하여 모달 닫기
3. **그 외 상태인 경우**:
   - `onOpenNotificationPermissionModal()` 호출하여 기기 설정 유도 모달 오픈

### 4. 테스트 케이스
개발 완료 후 검증해야 할 항목들을 기능별/상태별로 상세히 리스트업합니다.

**기본 체크리스트 형식**:
- [ ] 정상 동작 확인
- [ ] 엣지 케이스 처리 확인
- [ ] 에러 상황 핸들링 확인

---

## 작업 유형별 템플릿

각 작업의 성격에 따라 아래 템플릿을 참고하여 **유형별 특화 항목**을 추가하세요.

### 1. 컴포넌트 개발인 경우
**추가 필수 항목**: Props Interface, 데이터 표시 형식, UX 워크플로우, 상태 피드백, 스타일링 & 엣지 케이스

**템플릿**: [`./template/component.md`](./template/component.md)

### 2. 함수 / 훅 / 클래스 개발인 경우
**추가 필수 항목**: 모듈/함수 시그니처, 핵심 로직, 예외 처리

**템플릿**: [`./template/function-hooks-class.md`](./template/function-hooks-class.md)

---

## 작성 시 주의사항

1. **중복 방지**: 사용자가 제공한 정보를 단순 복사하지 말고, 개발자가 필요로 하는 형태로 재구성
2. **구체성**: "적절히 처리", "필요시 추가" 같은 모호한 표현 금지
3. **완결성**: 한 명세서만으로 개발 완료 가능하도록 모든 정보 포함
4. **검증 가능성**: 테스트 케이스에 구체적인 검증 기준 명시
