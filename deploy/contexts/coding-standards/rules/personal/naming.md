# 네이밍 컨벤션

## 변수명, 함수명, 클래스명 공통
- callback의 매개변수명을 한글자로 적지않고 원래 단어를 다 그대로 써야합니다.
- 예시: `array.map(t => t.some)`이 아니라 `array.map(topic => topic.some)` 이런식이 되야합니다.

## 파일명과 기능의 관계

파일명이 특정 함수/컴포넌트/클래스 이름과 동일하면 `export default`를 사용한다.
파일명이 kebab-case이면 관련 멤버들을 named export로 내보낸다.
함수 코드가 길어져 별도 파일로 분리할 때는 해당 함수 이름으로 파일을 만들고 default export를 사용한다.
