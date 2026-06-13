> 이관: KA main `knowledge/frontend/javascript/async/promise.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [javascript, concept]
source: unverified
priority:
---

# Questions
- [UNVERIFIED] Promise란 무엇인가?
- [UNVERIFIED] Promise 생성자는 언제 사용하는가?
- [UNVERIFIED] unhandledrejection은 언제 발생하는가?
- [UNVERIFIED] Promise.all()과 Promise.allSettled()는 언제 구분해서 써야 하는가?

---

# Answers

## [UNVERIFIED] Promise란 무엇인가?

### User Answer
미래에 성공하거나 실패할 수 있는 비동기 작업을 나타냅니다.
3가지 상태(pending, fulfilled, rejected)를 가집니다.
비동기 작업이 완료/실패될 때까지 기다리지 않고, then, catch, finally 시점에 실행될 콜백 함수를 미리 등록(attach)해 두는 방식으로 처리합니다.
체이닝 문법이기 때문에 콜백 지옥보다 보기 편합니다.


---

## [UNVERIFIED] Promise 생성자는 언제 사용하는가?

### User Answer
Promise 생성자는 대부분 Promise를 지원하지 않는 함수를 감싸기 위해 사용합니다.


---

## [UNVERIFIED] unhandledrejection은 언제 발생하는가?

### User Answer
Promise가 rejected될 때 이를 처리해 주지 않으면, global scope까지 propagation되어 unhandledrejection 이벤트가 발생합니다.
브라우저에서는 `window.addEventListener('unhandledrejection', ...)`로 핸들러를 등록할 수 있습니다.
Node.js에서는 `process.on('unhandledrejection')`으로 로그를 남기는 데 활용할 수 있습니다.

주의해야 할 점은, "Promise가 rejected될 때" 처리해 주지 않으면 발생한다는 것입니다.
예를 들어, rejected된 Promise에 대해 1초 뒤에 핸들러를 등록하면, 정작 Promise가 rejected되는 시점에는 아무런 핸들러가 없으므로 unhandledrejection이 발생합니다.


---


## [UNVERIFIED] Promise.all()과 Promise.allSettled()는 언제 구분해서 써야 하는가?

### User Answer
`Promise.all()`은 여러 비동기 작업 중 하나라도 실패했을 때 나머지도 모두 실패로 처리해야 하는 경우에 사용합니다.
일부가 실패해도 성공한 결과만이라도 사용해야 하는 경우에는 `Promise.allSettled()`를 써야 합니다.

쇼핑몰 개발 당시 모든 페이지에서 재사용되는 API들을 하나의 함수에서 호출하는 "every page api"를 만든 적이 있는데, 이때 `Promise.all()`로 구현해서 인기 검색어 호출이 실패하면 헤더 카테고리도 같이 안 나오는 문제가 있었습니다.
이후 `Promise.allSettled()`로 바꾸어, 인기 검색어를 못 가져와도 헤더 카테고리는 정상적으로 나오도록 예외 처리를 수정했습니다.

여기서 한 단계 더 나아가, 실패한 건 무시하고 성공한 것만 모아 주는 `Promise.allFulfilled()` 같은 유틸을 만들고 싶었지만 마땅한 방법이 떠오르지 않아 접었습니다.

