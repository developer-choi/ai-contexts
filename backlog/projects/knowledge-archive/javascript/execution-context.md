> 이관: KA main `knowledge/frontend/javascript/internal/execution-context.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [javascript, concept]
source: unverified
priority:
---

# Questions
- [UNVERIFIED] Execution Context란 무엇인가?
- [UNVERIFIED] Execution Context는 어떻게 쌓이고 관리되는가?
- [UNVERIFIED] Global Execution Context는 일반 Execution Context와 무엇이 다른가?
- [UNVERIFIED] Activation Object에는 무엇이 저장되는가?
- [UNVERIFIED] Scope Chain이란 무엇이며 변수 탐색은 어떻게 이뤄지는가?
- [UNVERIFIED] Activation Object 생성 시 지역 변수와 함수 선언은 어떻게 다르게 처리되는가?
- [UNVERIFIED] scope 프로퍼티는 사용자가 접근할 수 있는가?
- [UNVERIFIED] Scope Chaining 덕분에 가능한 동작에는 어떤 것이 있는가?

---

# Answers

## [UNVERIFIED] Execution Context란 무엇인가?
### User Answer
Execution Context는 javascript 코드가 실행되는 environment(code block)를 뜻한다.

여기서 말하는 code block은 대부분 function을 의미하며, 대부분의 프로그래머는 function으로 Execution Context를 만든다.

function이 call되면 Execution Context가 하나 만들어진다.


---

## [UNVERIFIED] Execution Context는 어떻게 쌓이고 관리되는가?
### User Answer
현재 실행되는 Execution Context와 관련 없는 실행 코드가 실행되면, 새로운 Execution Context가 Stack에 들어가고 제어권이 그 Context로 이동된다.

Execution Context는 Stack 안에 하나씩 쌓이고, 제일 위에 있는 Execution Context가 현재 실행되는 Execution Context다.


---

## [UNVERIFIED] Global Execution Context는 일반 Execution Context와 무엇이 다른가?
### User Answer
Global Execution Context라고 해서 별다를 게 없다.
그냥 가장 먼저 실행되는 Execution Context일 뿐이다.

다만 특별한 점이 하나 있는데, Global Execution Context는 Activation Object를 만들 때 arguments 같은 것이 없다.


---

## [UNVERIFIED] Activation Object에는 무엇이 저장되는가?
### User Answer
Execution Context가 만들어지면 일단 Activation Object부터 만들고, 그 안에 아래의 것들을 저장한다.

- Parameter
- local variable 등
- arguments 생성
- Scope 정보 생성
- this 바인딩

마지막에는 this를 바인딩하며, 이때 바인딩할 this가 없으면 window가 바인딩된다.


---

## [UNVERIFIED] Scope Chain이란 무엇이며 변수 탐색은 어떻게 이뤄지는가?
### User Answer
현재 scope에 접근하려는 변수가 없으면 상위 scope에서 찾고, 이 scope list에서도 못 찾으면 `is not defined`가 발생한다.

`is not defined`는 단순히 정의를 안 해서 발생하는 게 아니다.
scope chain(= list) 전체를 탐색해도 없는 변수에 접근할 때 발생하는 에러다.


---

## [UNVERIFIED] Activation Object 생성 시 지역 변수와 함수 선언은 어떻게 다르게 처리되는가?
### User Answer
주의할 점은, local variable은 statement만 하고 initialization은 하지 않는다는 것이다.
그래서 undefined가 할당된 모습이 보인다.
실제로 initialization을 하는 건 나중에 Activation Object 생성이 완료되었을 때 한다.

신기한 점은, function으로 선언한 것은 이미 Function Object로 할당까지 되어 있다.
저것 때문에 Hoisting이 되는 듯하다.

정리하면, `var a = 3;` 같은 문장도 실행문이었다.
처음에 쭉 Activation Object 안에 이런저런 값들 넣고, 실제로 실행(할당까지) 하는 듯하다.

지역변수는 undefined로 일단 넣어 놓고, 함수는 Function Object로 할당해 놓는다.
아 ~ 그래서 function hoisting이 될 수밖에 없다.


---

## [UNVERIFIED] scope 프로퍼티는 사용자가 접근할 수 있는가?
### User Answer
scope 프로퍼티는 내가 접근할 수 있는 게 아니라 javascript engine에서만 접근이 가능한 것 같다.
찍어보니 안 나온다.


---

## [UNVERIFIED] Scope Chaining 덕분에 가능한 동작에는 어떤 것이 있는가?
### User Answer
- 왜 inner function에서 outer function의 변수값을 read할 수 있는가? → scope chaining 덕분이다.
- 왜 closure 함수가 자유 변수의 값을 read할 수 있는가? → scope chaining 덕분이다.
- 왜 closure 함수가 약간 성능적으로 손해를 보는가? → scope chaining 덕분이다.

