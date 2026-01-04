# Google Docs / react-playground 마이그레이션 계획서

## 📋 목적

Google Docs에 있는 필기 내용을 목적에 맞게 3개 레포로 분산 저장

---

## 🗂️ 3개 레포의 역할

### 1. Google Docs (개인 노트)
- **목적**: 탐색, 삽질, 빠른 메모
- **내용**: 모든 것 (사실, 경험, 고민, 스크린샷, 링크)
- **특징**: 비정형, 자유 형식, 자주 수정
- **유지**: 영구 보관 (삭제 X, 아카이브 역할)

### 2. fact-archive (기술 지식 아카이브)
- **목적**: AI와 기술 면접 연습
- **독자**: AI (읽고 나한테 질문), 나 (복습용)
- **내용**: **사실/개념/이론만**
  - ✅ "네트워크란 무엇인가?"
  - ✅ "IntersectionObserver 스펙"
  - ✅ "React useEffect 규칙"
  - ❌ 경험, 고민, 설계 과정
- **형식**: Q&A, 개념 정리
- **예시**:
  ```markdown
  # IntersectionObserver

  ## 정의
  뷰포트와 타겟 요소의 교차 상태를 비동기로 관찰하는 Web API

  ## 주요 옵션
  - rootMargin: 루트 요소의 마진
  - threshold: 교차 비율 임계값
  ```

### 3. react-playground (프로젝트 + 설계 문서)
- **목적**: 채용 과제 대비, 포트폴리오
- **독자**: 채용 담당자, 나 (나중에 회고)
- **내용**:
  - 코드 (hooks, utils, components 등)
  - 설계 문서 (`docs/`)
    - roadmap 형식 (문제 정의 → Root Cause → 해결 → Trade-off)
    - "왜 이렇게 만들었는가" 중심
  - **예제 페이지** (실제 동작 확인용)
    - 각 모듈의 동작을 확인할 수 있는 페이지
    - 채용 담당자가 직접 테스트 가능
    - 설계 문서 이해를 돕는 시각적 자료
- **형식**: 완성된 문서 (roadmap 템플릿)
- **예시**:
  ```markdown
  # useInfiniteScroll

  ## 1. 문제 정의
  - 증상: 2회차부터 상단에서 API 호출
  - Root Cause: listEndDom cleanup 안됨

  ## 2. 해결 방법
  - enabled를 의존성 배열에 추가

  ## 3. Trade-off
  - DOM 조작 오버헤드 vs 정확성

  ## 4. 예제 페이지
  - `/examples/infinite-scroll` - 실제 동작 확인
  ```

### 4. ai-contexts (AI 정책)
- **목적**: AI에게 일 시키기
- **독자**: AI
- **내용**:
  - 코딩 스탠다드
  - 프로젝트별 정책
  - 워크플로우
- **형식**: 명령형, 규칙 중심
- **예시**:
  ```markdown
  ## Infinite Scroll
  - useInfiniteScroll hook 사용 (직접 구현 X)
  - 상세: ~/react-playground/docs/hooks/useInfiniteScroll.md
  ```

---

## 🔄 마이그레이션 기준

### Google Docs → fact-archive
**"이것이 사실/개념인가?"**

| ✅ 옮겨야 함 | ❌ 옮기지 않음 |
|-------------|--------------|
| API 스펙 | 개인 경험 |
| 개념 정의 | 문제 해결 과정 |
| 이론/원리 | 삽질 기록 |
| 기술 용어 | 고민/생각 |

**예시**:
- ✅ "IntersectionObserver란 무엇인가?"
- ✅ "React 렌더링 원리"
- ✅ "처리량(Throughput) 정의"
- ❌ "useInfiniteScroll을 어떻게 만들었는가"
- ❌ "이 버그를 어떻게 해결했는가"

### Google Docs → react-playground/docs
**"이것이 경험/설계인가?"**

| ✅ 옮겨야 함 | ❌ 옮기지 않음 |
|-------------|--------------|
| 문제 해결 roadmap | 개념/이론 |
| 설계 결정 | API 스펙 |
| Trade-off 분석 | 삽질 과정 (미정리) |
| 왜 이렇게 했는지 | 빠른 메모 |

**예시**:
- ✅ "useInfiniteScroll 설계"
- ✅ "왜 Redux 대신 Zustand를 선택했는가"
- ✅ "성능 최적화 과정"
- ❌ "IntersectionObserver API 스펙"
- ❌ "아직 해결 못한 버그 디버깅 중..."

### Google Docs → ai-contexts
**"AI가 코드 작성할 때 알아야 하는가?"**

| ✅ 옮겨야 함 | ❌ 옮기지 않음 |
|-------------|--------------|
| 코딩 컨벤션 | 개념 설명 |
| 사용 정책 | 상세 설계 과정 |
| 금지 사항 | 이론 |

**예시**:
- ✅ "마크업 코딩 스탠다드"
- ✅ "Infinite scroll은 useInfiniteScroll 써"
- ❌ "IntersectionObserver 동작 원리"
- ❌ "useInfiniteScroll 설계 과정"

---

## 📝 마이그레이션 프로세스

### 1단계: Google Docs에서 분류
각 문서를 읽으면서 태그 추가:
- `[FACT]`: fact-archive로
- `[DESIGN]`: react-playground/docs로
- `[POLICY]`: ai-contexts로
- `[KEEP]`: Google Docs에만 유지

### 2단계: fact-archive 마이그레이션
```markdown
Google Docs: [FACT] IntersectionObserver 정리
    ↓
fact-archive/docs/web/api/intersection-observer.md

# IntersectionObserver

## 정의
...

## 주요 옵션
...
```

### 3단계: react-playground/docs 마이그레이션
```markdown
Google Docs: [DESIGN] useInfiniteScroll 삽질 기록
    ↓
react-playground/docs/hooks/useInfiniteScroll.md (설계 문서)
react-playground/src/examples/InfiniteScrollExample.tsx (예제 페이지)

# useInfiniteScroll

## 1. 문제 정의
- 증상: ...
- Root Cause: ...

## 2. 해결 방법
...

## 3. Trade-off
...

## 4. 예제 페이지
- `/examples/infinite-scroll` - 실제 동작 확인
```

### 4단계: ai-contexts 업데이트
```markdown
ai-contexts/docs/contexts/react-playground.md

## Infinite Scroll
- useInfiniteScroll hook 사용
- 상세: ~/react-playground/docs/hooks/useInfiniteScroll.md
```

---

## 🎯 useInfiniteScroll 마이그레이션 예시

### Google Docs (원본)
```
[useInfiniteScroll 삽질 기록]

Q. IntersectionObserver가 뭐지?
A. 뷰포트와 요소 교차 관찰 API

문제 발견:
- 2회차부터 상단에서 호출됨
- 왜지? 디버깅 시작...

시도1: rootMargin만 조정 → 실패
시도2: cleanup 확인 → 발견!

해결:
- enabled를 의존성에 추가

고민:
- 성능 괜찮을까?
- 다른 방법은?

[스크린샷 10개]
[참고 링크]
```

### 마이그레이션 후

#### ✅ fact-archive/docs/web/api/intersection-observer.md
```markdown
# IntersectionObserver

## 정의
뷰포트와 타겟 요소의 교차 상태를 비동기로 관찰하는 Web API

## 주요 옵션
- `rootMargin`: 루트 요소의 마진 (교차 영역 확장/축소)
  - 예: `"0px 0px 300px 0px"` (하단 300px 확장)
- `threshold`: 교차 비율 임계값 (0.0 ~ 1.0)

## 사용 사례
- Lazy loading
- Infinite scroll
- Viewport tracking

## 참고 자료
- [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
```

#### ✅ react-playground/docs/hooks/useInfiniteScroll.md
```markdown
# useInfiniteScroll

Google Docs 참고: [링크]

## 1. 문제 정의 (증상과 영향)
- **증상**: 2회차 데이터 패칭부터 스크롤이 상단에 있을 때 API 호출됨
- **발견 경로**: 개발 중 테스트에서 발견
- **비즈니스 임팩트**: 의도하지 않은 시점에 API 호출 → 사용자 경험 저하

## 2. Root Cause
- `hasNextPage` / `isFetchingNextPage`가 useEffect 의존성 배열에 없음
- listEndDom이 cleanup 되지 않고 리스트 중간에 고정됨
- 2회차부터는 listEndDom이 리스트 중간에 위치하여 스크롤 상단에서도 교차 감지

## 3. 해결 방법 선택
- **선택한 방법**: `enabled` (hasNextPage && !isFetchingNextPage)를 의존성 배열에 추가
  - enabled가 변경될 때마다 useEffect cleanup 실행 → listEndDom 제거 및 재생성

- **고려했던 다른 방법**:
  - rootMargin만 조정: 근본 원인 해결 안됨
  - 수동으로 listEndDom 위치 업데이트: 복잡도 증가

## 4. Trade-off
- **장점**:
  - 정확한 위치(리스트 끝)에서만 트리거
  - 코드 간결, 이해하기 쉬움
- **단점**:
  - 매 데이터 패칭마다 DOM 생성/제거 발생
  - 성능 영향: 미미함 (IntersectionObserver는 비동기, DOM 조작도 단순)

## 5. 구현
```typescript
// 핵심: enabled를 의존성에 추가
useEffect(() => {
  if (!enabled) return;

  const listEndDom = document.createElement("div");
  // ... setup observer

  return () => {
    observer.disconnect();
    listDom.removeChild(listEndDom); // cleanup
  };
}, [fetchNextPage, enabled, listSelector, offset]);
```

## 6. 사용법
```typescript
useInfiniteScroll({
  listSelector: '.post-list',
  offset: 300,
  queryResult: useInfiniteQuery(...)
});
```

## 7. 주의사항
- `listSelector`에 해당하는 DOM이 렌더링된 후 호출해야 함
- tanstack-query의 `useInfiniteQuery` 전용

## 8. 예제 페이지
- **경로**: `/examples/infinite-scroll`
- **목적**: 실제 동작을 확인하여 이 hook을 이해하기 쉽게 함
- **내용**:
  - 무한스크롤 동작 시연
  - offset 값 조정 테스트
  - 2회차 이후 정상 동작 확인
```

#### ✅ ai-contexts/docs/contexts/react-playground.md
```markdown
## Infinite Scroll
- **정책**: `useInfiniteScroll` hook 사용 (직접 IntersectionObserver 구현 X)
- **이유**:
  - listEndDom cleanup 로직이 이미 구현됨
  - tanstack-query와 통합되어 있음
- **상세**: `~/react-playground/docs/hooks/useInfiniteScroll.md` 참고
```

---

## ✅ 마이그레이션 체크리스트

### fact-archive
- [ ] IntersectionObserver API 스펙
- [ ] React Hooks 규칙
- [ ] 네트워크 기본 개념
- [ ] (Google Docs에서 [FACT] 태그 붙은 것들)

### react-playground
- [ ] useInfiniteScroll 설계 문서
- [ ] useInfiniteScroll 예제 페이지
- [ ] (다른 custom hooks 설계 + 예제)
- [ ] 성능 최적화 사례
- [ ] (Google Docs에서 [DESIGN] 태그 붙은 것들)

### ai-contexts
- [ ] react-playground 정책 업데이트
  - [ ] useInfiniteScroll 사용 정책
- [ ] (다른 프로젝트 정책)

---

## 📌 원칙

1. **Google Docs는 삭제하지 않음** - 아카이브로 유지
2. **한 번에 다 옮기지 않음** - 필요한 것부터 점진적으로
3. **중복 괜찮음** - fact-archive와 react-playground/docs에 일부 중복 가능
   - fact-archive: 개념 중심
   - react-playground: 경험 중심
4. **ai-contexts는 최소화** - 토큰 절약, 핵심 정책만
5. **react-playground는 예제 페이지 필수** - 모든 모듈은 실제 동작을 확인할 수 있는 예제 페이지 제공
   - 채용 담당자가 직접 테스트 가능
   - 설계 문서 이해를 돕는 시각적 자료
