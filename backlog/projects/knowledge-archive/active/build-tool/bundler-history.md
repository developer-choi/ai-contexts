> 이관: KA main `knowledge/frontend/bundler/history.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [javascript, history, concept]
source: unverified
priority:
---

# Questions
- [UNVERIFIED] 번들러는 왜 등장했는가?
- [UNVERIFIED] 브라우저의 모듈 시스템 미지원이 번들러를 어떻게 요구했는가?
- [UNVERIFIED] HTTP/1.x의 한계는 번들러를 어떻게 요구했는가?
- [UNVERIFIED] HTTP/2·3에서도 번들링이 여전히 유효한가?
- [UNVERIFIED] 최적화·빌드 자동화는 번들러를 어떻게 요구했는가?

---

# Answers

## [UNVERIFIED] 번들러는 왜 등장했는가?

### User Answer
번들러 등장의 동인은 크게 세 가지로 정리된다.
- 브라우저의 모듈 시스템 미지원/지연.
- HTTP/1.x의 동시 요청 한계로 인한 네트워크 비용.
- 빌드 자동화·최적화 요구.

각각의 세부는 아래 질문에서 다룬다.

---

## [UNVERIFIED] 브라우저의 모듈 시스템 미지원이 번들러를 어떻게 요구했는가?

### User Answer
ES6 (ES2015)에서 import/export 문법이 도입됐지만, 한동안 브라우저는 ESM을 직접 이해하지 못했다.
브라우저는 CommonJS, AMD, IIFE 같은 형태만 실행할 수 있었다.

번들러는 이 간극을 메웠다.
- 개발자가 작성한 ESM 소스를 브라우저가 이해할 수 있는 형태로 변환·병합.
- 모듈 그래프를 평탄화해 단일 또는 소수의 파일로 출력.

---

## [UNVERIFIED] HTTP/1.x의 한계는 번들러를 어떻게 요구했는가?

### User Answer
모듈마다 개별 HTTP 요청을 보내면 다음 문제가 누적된다.
- 동시 요청 수 제한 (브라우저-호스트당 6 정도).
- 매 요청마다 3-way handshake 비용.

번들러가 다수의 모듈을 소수의 파일로 합치면, 요청 수가 줄어 초기 로딩 시간이 단축된다.

---

## [UNVERIFIED] HTTP/2·3에서도 번들링이 여전히 유효한가?

### User Answer
HTTP/2·3은 멀티플렉싱으로 동시 요청 한계 문제를 상당 부분 해소했다.
그래도 번들링은 여전히 의미 있다.
- 초기 로딩 최적화 (브라우저가 한 번에 처리할 모듈 수가 줄어듦, head-of-line blocking 완화).
- tree shaking, minification, chunk splitting 같은 다른 최적화도 번들링 단계에서 이뤄진다.

---

## [UNVERIFIED] 최적화·빌드 자동화는 번들러를 어떻게 요구했는가?

### User Answer
번들러는 단순히 모듈을 합치기만 하는 도구가 아니라, 다음 작업을 통합하는 자동화 플랫폼 역할을 한다.
- Tree Shaking, Minification 같은 코드 최적화.
- 이미지·CSS·Sass·TS 같은 비-JS 자원의 처리.
- 위 처리를 플러그인·로더 시스템으로 확장.
