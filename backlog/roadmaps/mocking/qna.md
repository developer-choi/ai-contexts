---
tags: [testing, mocking]
source: official
---
# Questions
- [TODO] Test double 5종(dummy/stub/spy/mock/fake)은 무엇이며 각각의 정의는?
- [TODO] mock과 stub의 본질적 차이는?
- [TODO] London school과 Classical/Detroit school의 차이는?
- [TODO] Mockist 테스트가 구현 디테일에 결합되는 이유와 그 결과는?
- Unit test에서 의존성을 mock하고 호출 assertion이 통과하면, 실제 연동도 정상이라고 볼 수 있는가?
- Unit test에서 dependency가 있을 때 어떻게 처리하는가?
- Integration test에서 mock하는 것과 하지 않는 것의 기준은?
- 테스트에서 API를 mock할 때 왜 window.fetch stubbing 대신 MSW를 권장하는가?
- [TODO] vi.fn / vi.spyOn / vi.mock의 차이는?
- [TODO] vi.mock의 hoisting 동작은 무엇이며, hoisting 안 될 때 어떻게 강제하는가?
- [TODO] mockReset / mockClear / mockRestore의 차이는?
- [TODO] vi.useFakeTimers / vi.setSystemTime의 역할은?
- [TODO] MSW가 네트워크 레벨에서 가로채는 철학과 contract 개념은?
- [TODO] renderHook의 시그니처와 result.current는?
- [TODO] renderHook의 rerender는 어떤 용도인가?
- [TODO] renderHook의 wrapper 옵션은 어떻게 쓰는가?
- [UNVERIFIED] over-mocking이 안티패턴인 이유는?
- [UNVERIFIED] false positive와 false negative를 mock 맥락에서 설명하면?
- [UNVERIFIED] 같은 fetch 호출을 vi.mock으로 모듈 mock할지 MSW로 가로챌지의 선택 기준은?
- [UNVERIFIED] renderHook에서 act warning이 발생하는 원인과 해결법은?
- [UNVERIFIED] React Query 사용 hook을 테스트할 때 useQuery를 mock할지 MSW로 갈지의 기준은?
- [UNVERIFIED] vi.mock의 단점은 무엇인가?

학습 순서·진행 추적은 `mocking-roadmap.md` 참고.

---

# Answers

## [TODO] Test double 5종(dummy/stub/spy/mock/fake)은 무엇이며 각각의 정의는?

학습 후 작성. 1단계.

### Reference
- https://martinfowler.com/bliki/TestDouble.html

---

## [TODO] mock과 stub의 본질적 차이는?

학습 후 작성. 1단계. 핵심 단서: "behavior verification vs state verification".

### Reference
- https://martinfowler.com/articles/mocksArentStubs.html

---

## [TODO] London school과 Classical/Detroit school의 차이는?

학습 후 작성. 1단계.

### Reference
- https://martinfowler.com/articles/mocksArentStubs.html

---

## [TODO] Mockist 테스트가 구현 디테일에 결합되는 이유와 그 결과는?

학습 후 작성. 1단계. 핵심 단서: "Mockist tests are thus more coupled to the implementation of a method".

### Reference
- https://martinfowler.com/articles/mocksArentStubs.html

---

## Unit test에서 의존성을 mock하고 호출 assertion이 통과하면, 실제 연동도 정상이라고 볼 수 있는가?

### Official Answer
Unit tests are incapable of ensuring that when you call into a dependency that you're calling it appropriately (though you can make assertions on how it's being called, you can't ensure that it's being called properly with a unit test).

> #### Official Annotation:
> It doesn't matter if your component `<A />` renders component `<B />` with props c and d if component `<B />` actually breaks if prop e is not supplied.
> So while having some unit tests to verify these pieces work in isolation isn't a bad thing, it doesn't do you any good if you don't also verify that they work together properly.
> — Kent C. Dodds, "Write tests. Not too many. Mostly integration."

> #### AI Annotation:
> 아니오.
> mock은 가짜 구현이므로, 실제 의존성이 해당 인자를 받아서 올바르게 동작하는지는 보장할 수 없다.
> 예를 들어 `api.createUser({name: 'Kim'})`을 호출했다고 assertion하더라도, 실제 API가 `username` 필드를 기대한다면 unit test는 이를 잡지 못한다.

### Reference
- https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests

---

## Unit test에서 dependency가 있을 때 어떻게 처리하는가?

### Official Answer
When a block of code requires other parts of the system to run, you can't use a unit test with that external data.
The unit test needs to run in isolation.
Other system data, such as databases, objects, or network communication, might be required for the code's functionality.
If that's the case, you should use data stubs instead.

> #### Key Terms:
> - **data stubs**: 실제 외부 데이터 대신 사용하는 가짜(고정) 데이터

> #### AI Annotation:
> Unit test는 isolation이 핵심이므로, DB·네트워크·외부 객체 같은 외부 의존성은 그대로 사용할 수 없다.
> 대신 data stub(고정된 가짜 데이터)으로 대체하여 테스트 대상 코드만 격리해 검증한다.

### Reference
- https://aws.amazon.com/what-is/unit-testing/

---

## Integration test에서 mock하는 것과 하지 않는 것의 기준은?

### Official Answer
I pretty much only mock:
1. Network requests (using MSW)
2. Components responsible for animation (because who wants to wait for that in your tests?)

> #### Official Annotation:
> When you mock something you're removing all confidence in the integration between what you're testing and what's being mocked.
> You don't actually want to send emails or charge credit cards every test, but most of the time you can avoid mocking and you'll be better for it.
> — Kent C. Dodds, "Write tests. Not too many. Mostly integration."

> #### AI Annotation:
> 그 외에는 전부 실제 코드를 사용한다.
> 커스텀 render가 앱의 모든 Provider(Router, Theme, Auth 등)를 감싸 실제 환경과 최대한 비슷하게 렌더링한다.

### Reference
- https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests

---

## 테스트에서 API를 mock할 때 왜 window.fetch stubbing 대신 MSW를 권장하는가?

### Official Answer
We recommend using the Mock Service Worker (MSW) library to declaratively mock API communication in your tests instead of stubbing window.fetch, or relying on third-party adapters.

> #### Key Terms:
> - **declaratively**: 어떻게가 아니라 무엇을 선언하는 방식 (HTTP 핸들러 정의)
> - **stubbing**: 원래 함수를 가짜로 바꿔치기하는 방식

> #### AI Annotation:
> window.fetch를 stub하면 axios 같은 다른 HTTP 클라이언트를 쓸 때 깨지고, 네트워크 레벨이 아닌 함수 레벨에서 가로채므로 실제 요청 흐름과 달라진다.
> MSW는 Service Worker로 네트워크 레벨에서 가로채므로 선언적이고, 클라이언트 구현에 독립적이다.

### Reference
- https://github.com/testing-library/react-testing-library
- https://github.com/mswjs/msw

---

## [TODO] vi.fn / vi.spyOn / vi.mock의 차이는?

학습 후 작성. 2단계. 핵심 단서: vi.fn은 함수 자체 생성, vi.spyOn은 객체 메서드/getter/setter 감시, vi.mock은 import된 모듈 전체 대체.

### Reference
- https://vitest.dev/api/vi

---

## [TODO] vi.mock의 hoisting 동작은 무엇이며, hoisting 안 될 때 어떻게 강제하는가?

학습 후 작성. 2단계. 핵심 단서: vi.mock 호출은 파일 최상단으로 hoisting됨. 일반 변수를 mock 안에 쓰려면 `vi.hoisted` 필요.

### Reference
- https://vitest.dev/guide/mocking
- https://vitest.dev/api/vi

---

## [TODO] mockReset / mockClear / mockRestore의 차이는?

학습 후 작성. 2단계.

### Reference
- https://vitest.dev/api/mock

---

## [TODO] vi.useFakeTimers / vi.setSystemTime의 역할은?

학습 후 작성. 2단계.

### Reference
- https://vitest.dev/api/vi

---

## [TODO] MSW가 네트워크 레벨에서 가로채는 철학과 contract 개념은?

학습 후 작성. 3단계. 핵심 단서: "Network behavior is a contract-like description of the network's expected state".

### Reference
- https://mswjs.io/docs/philosophy

---

## [TODO] renderHook의 시그니처와 result.current는?

학습 후 작성. 4단계. result.current는 가장 최근 commit된 hook 반환값.

### Reference
- https://testing-library.com/docs/react-testing-library/api/

---

## [TODO] renderHook의 rerender는 어떤 용도인가?

학습 후 작성. 4단계. 다른 props로 hook을 다시 호출.

### Reference
- https://testing-library.com/docs/react-testing-library/api/

---

## [TODO] renderHook의 wrapper 옵션은 어떻게 쓰는가?

학습 후 작성. 4단계. QueryClientProvider 등 Provider 주입 시 필요.

### Reference
- https://testing-library.com/docs/react-testing-library/api/

---

## [UNVERIFIED] over-mocking이 안티패턴인 이유는?

보조 소스 학습 후 작성. 5단계.

### Reference
- https://kentcdodds.com/blog/testing-implementation-details

---

## [UNVERIFIED] false positive와 false negative를 mock 맥락에서 설명하면?

보조 소스 학습 후 작성. 5단계.

### Reference
- https://kentcdodds.com/blog/testing-implementation-details
- https://en.wikipedia.org/wiki/Type_I_and_type_II_errors

---

## [UNVERIFIED] 같은 fetch 호출을 vi.mock으로 모듈 mock할지 MSW로 가로챌지의 선택 기준은?

보조 소스 학습 후 작성. 5단계.

### Reference
- https://kentcdodds.com/blog/stop-mocking-fetch

---

## [UNVERIFIED] renderHook에서 act warning이 발생하는 원인과 해결법은?

보조 소스 학습 후 작성. 5단계.

### Reference
- https://react.dev/reference/react/act

---

## [UNVERIFIED] React Query 사용 hook을 테스트할 때 useQuery를 mock할지 MSW로 갈지의 기준은?

보조 소스 학습 후 작성. 5단계.

### Reference
- https://tanstack.com/query/latest/docs/framework/react/guides/testing

---

## [UNVERIFIED] vi.mock의 단점은 무엇인가?

보조 소스 학습 후 작성. 5단계. 핵심 단서: ESM hoisting 제약, import 시점 의존, 동적 모듈 mock 어려움.

### Reference
- https://vitest.dev/guide/mocking
