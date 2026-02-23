# Step 5: 구현

`/plan/pr{N}/overview.md` 구현 방침을 바탕으로 **코드 작성 및 커밋** 단계입니다.

**목표**:
- overview.md에 정의된 기능 구현
- 작은 커밋 단위로 리뷰하기 쉽게 만들기

---

## 참고 자료

- `/plan/background.md`
- `/plan/codebase-audit.md` (있는 경우)
- `/plan/pr{N}/overview.md`
- `/plan/pr{N}/overview.md`에 리스트업된 **참고 컨벤션** 파일들 (코드 작성 전 반드시 읽기)

---

## 커밋 순서 가이드

다음 순서로 커밋을 쌓는 것을 권장합니다. 더 좋은 순서가 있다면 사용자에게 제안하세요.

### Phase 0. 사전 작업 (Conflict 방지)
**1. Deprecated 처리**
- 기존 모듈 대체 시 바로 삭제 말고 `@deprecated` 먼저
```typescript
/**
 * @deprecated 대신 NewModule 사용
 */
function deprecatedSomeFunction() {}
```

2. **기존 코드 리팩토링**: 파라미터 타입 변경 등 (나중에 Conflict 방지)
3. **파일 분리**: 관심사/책임 많아지면 역할 기반으로 분리

### Phase 1. 기초 공사
4. **타입 정의**: 모든 구현의 기준
5. **API 함수**: 백엔드 API 준비됐으면 호출 함수 작성
6. **단위 모듈/컴포넌트 마크업**:
   - 공통 UI 컴포넌트 (도메인 비종속)
   - 도메인 기초 UI 컴포넌트 (도메인 종속)
   - 유틸리티/포매팅 함수
   - 상수
   - 상태별 UI (Empty, Loading, Error)
   - **우선순위**: 공통 모듈 → 도메인 종속 모듈

### Phase 2. 통합
7. **Mock 기반 통합**: Mock API, Hook 구현, 페이지 조립

### Phase 3. 연동
8. **실제 API 연동**: Mock → 실제 API, 에러 처리, 엣지 케이스

---

## [CRITICAL] 구현 진행 방식

**⚠️ 한번에 모든 Phase 구현 금지!**

1. Phase 단위로 나눠서 진행
2. 첫 Phase만 먼저 구현
3. 구현 완료 후 사용자 리뷰
4. 다음 Phase 구현 반복

**이유**: 한번에 구현하면 중간 문제 발견 시 많은 코드 수정 필요. Phase별 리뷰로 빠른 발견/수정

### Phase 완료 전 자가 점검

사용자에게 보고하기 전, 다음을 수행:
1. overview.md에 리스트업된 **참고 컨벤션 파일을 다시 열어** 작성한 코드와 대조
2. 위반 사항이 있으면 수정 후 커밋

### Phase 완료 시 필수 작업

1. **커밋 확인**: Phase에서 작성/수정한 코드가 모두 커밋되었는지 확인. 커밋 누락은 반복적으로 발생하는 실수이므로 반드시 점검
2. 사용자에게 다음과 같이 안내:

> "Phase [N] ([Phase 이름]) 완료.
>
> Gemini CLI로 코드 풀질 검증 후 리뷰 부탁드립니다.
>
> **Gemini CLI 검증 항목**:
> 1. 테스트 스크립트 실행 (`package.json`의 scripts 확인)
> 2. 컨벤션 준수 확인 (`instructions/conventions/README.md` 참고)

### 모든 Phase 완료 시

사용자에게 다음과 같이 안내하세요:

> "모든 구현 완료.
>
> - [ ] `/plan/pr{N}/overview.md`의 모든 핵심 기능이 구현되었는지 확인해주세요.
> - [ ] 누락된 기능이 있다면 말씀해주세요.
>
> 문제없으면 다음 단계(최종 점검)로 넘어갈게요."
