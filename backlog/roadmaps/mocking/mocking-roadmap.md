---
publishable: false
tags: [meta, roadmap]
---
# Mocking 학습 로드맵

## 목표

`qna.md`의 모든 질문에 답변 가능한 상태가 되는 것. 면접 대비.

- `[TODO]` 마커 — 1차 소스(공식 문서·Fowler·Kent)에서 답을 찾을 수 있는 질문. 학습하면서 답을 채우고 마커 제거.
- `[UNVERIFIED]` 마커 — 1차 소스가 부족함. 보조 소스(KCD 블로그, Google Testing Blog 등)로 직접 정리 후 마커 제거.

## 학습 순서

### 1단계 — Mock 이론 (도구 무관)

- [ ] Fowler, *Test Double* — https://martinfowler.com/bliki/TestDouble.html
- [ ] Fowler, *Mocks Aren't Stubs* — https://martinfowler.com/articles/mocksArentStubs.html

커버되는 `[TODO]` 질문:
- Test double 5종(dummy/stub/spy/mock/fake)은 무엇이며 각각의 정의는?
- mock과 stub의 본질적 차이는?
- London school과 Classical/Detroit school의 차이는?
- Mockist 테스트가 구현 디테일에 결합되는 이유와 그 결과는?

### 2단계 — Vitest 도구

- [ ] Vitest *Mocking* 가이드 — https://vitest.dev/guide/mocking
- [ ] Vitest `vi` API — https://vitest.dev/api/vi
- [ ] Vitest `Mock` API — https://vitest.dev/api/mock

커버되는 `[TODO]` 질문:
- vi.fn / vi.spyOn / vi.mock의 차이는?
- vi.mock의 hoisting 동작은 무엇이며, hoisting 안 될 때 어떻게 강제하는가?
- mockReset / mockClear / mockRestore의 차이는?
- vi.useFakeTimers / vi.setSystemTime의 역할은?

### 3단계 — MSW

- [ ] MSW *Philosophy* — https://mswjs.io/docs/philosophy
- [ ] MSW *Comparison* — https://mswjs.io/docs/comparison (선택)

커버되는 `[TODO]` 질문:
- MSW가 네트워크 레벨에서 가로채는 철학과 contract 개념은?

### 4단계 — Hook 테스트

- [ ] RTL `renderHook` API — https://testing-library.com/docs/react-testing-library/api/
- [ ] React `act` — https://react.dev/reference/react/act (act warning 보충용)

커버되는 `[TODO]` 질문:
- renderHook의 시그니처와 result.current는?
- renderHook의 rerender는 어떤 용도인가?
- renderHook의 wrapper 옵션은 어떻게 쓰는가?

### 5단계 — `[UNVERIFIED]` 질문 보충 (1차 소스 외)

1차 소스에 답이 없는 질문들. 보조 소스 학습 후 직접 정리.

| 질문 | 보조 소스 후보 |
|---|---|
| over-mocking이 안티패턴인 이유 | Kent C. Dodds, *Testing Implementation Details* — https://kentcdodds.com/blog/testing-implementation-details |
| false positive/negative를 mock 맥락에서 | Wikipedia, *Type I and type II errors*; KCD *Testing Implementation Details* (false positive/negative 사례 인용) |
| vi.mock vs MSW 선택 기준 | Kent C. Dodds, *Stop Mocking Fetch* — https://kentcdodds.com/blog/stop-mocking-fetch |
| renderHook + act warning 원인·해결법 | RTL *Common Mistakes* + React `act` 공식 페이지 |
| useQuery mock vs MSW 기준 | KCD 블로그 + TanStack Query *Testing* 가이드 — https://tanstack.com/query/latest/docs/framework/react/guides/testing |
| vi.mock의 단점 (ESM hoisting 등) | Vitest GitHub issues, `vi.hoisted` 도입 배경 |

## 진행 상황

- [ ] 1단계 완료 (4개 `[TODO]` 답변 채움)
- [ ] 2단계 완료 (4개 `[TODO]` 답변 채움)
- [ ] 3단계 완료 (1개 `[TODO]` 답변 채움)
- [ ] 4단계 완료 (3개 `[TODO]` 답변 채움)
- [ ] 5단계 완료 (6개 `[UNVERIFIED]` 답변 채움)
- [ ] 전체 22개 질문 답변 완료 (모든 마커 제거)
