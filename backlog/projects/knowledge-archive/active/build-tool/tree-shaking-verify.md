# Tree Shaking 적용 여부 확인 방법

- 특정 라이브러리·모듈이 실제로 tree shaking 되는지(미사용 export가 번들에서 제거되는지) 확인하는 방법을 찾아봐야 한다.

## 관련 (2026-06-10, MP)

- 트리셰이킹을 **켜는** 메커니즘(`sideEffects` false vs CSS 배열, 바인딩 없는 `import './x.css'` 보존)은 `use-client-preservation.md` §7에 정리됨(webpack 1차 소스 포함).
- 단 "켜진 뒤 실제로 미사용 export가 빠졌는지 **검증**"은 여전히 미해결 — 소비자 쪽 번들 산출물에서 특정 export 누락을 확인하는 절차를 별도로 정해야 한다(이 파일의 원래 질문).
