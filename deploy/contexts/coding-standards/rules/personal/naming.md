---
tags: [file-folder-structure]
---

# 네이밍 컨벤션

## 변수명, 함수명, 클래스명 공통
- callback의 매개변수명을 한글자로 적지않고 원래 단어를 다 그대로 써야합니다.
- 예시: `array.map(t => t.some)`이 아니라 `array.map(topic => topic.some)` 이런식이 되야합니다.

## 파일명과 기능의 관계

파일명이 특정 함수/컴포넌트/클래스 이름과 동일하면 `export default`를 사용한다.
파일명이 kebab-case이면 관련 멤버들을 named export로 내보낸다.
함수 코드가 길어져 별도 파일로 분리할 때는 해당 함수 이름으로 파일을 만들고 default export를 사용한다.

## 내부 식별자는 사람이 부르는 자리에 쓰지 않는다

도구가 내부적으로 쓰는 식별자(체크 ID·룰 코드·내부 약어)를 **파일명·명령어·문서 마커·출력 머리말**에 쓰지 않는다. 그 자리에서는 식별자가 뜻 없이 홀로 나와, 체계를 모르는 사람에게 아무것도 전달하지 않는다. 그 자리에는 무엇을 하는지를 쓴다.

- 나쁨: `scripts/e9-candidates.mts`, `npm run e9-candidates`, 마커 `<!-- e9-phrases -->`, 출력 머리말 `[E9 후보]`
- 좋음: `scripts/session-phrase-candidates.mts`, `npm run session-phrase-candidates`, 마커 `<!-- session-phrases -->`, 출력 머리말 `[세션 맥락 표현 후보]`

**경계 — 식별자 자체를 없애라는 말이 아니다.** 뜻이 함께 나오는 자리에서는 남긴다. 린터 출력이 `(warn E9) 세션 맥락 표현 …`처럼 ID와 뜻을 같이 내면 그 자리의 `E9`는 은어가 아니라 검색 키다. 금지 대상은 ID의 존재가 아니라 **뜻 없이 ID만 노출되는 자리**다.
