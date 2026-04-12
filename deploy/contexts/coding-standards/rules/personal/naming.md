# 네이밍 컨벤션

## 변수명, 함수명, 클래스명 공통
- callback의 매개변수명을 한글자로 적지않고 원래 단어를 다 그대로 써야합니다.
- 예시: `array.map(t => t.some)`이 아니라 `array.map(topic => topic.some)` 이런식이 되야합니다.

## 파일명과 기능의 관계
**[CRITICAL] 파일명이 특정 함수/컴포넌트/클래스 이름과 동일하면, 반드시 `export default`를 사용한다.**
- `Button.tsx` → `export default function Button() { ... }`
- `useColumnCount.ts` → `export default function useColumnCount() { ... }`
- `heavyCalculation.ts` → `export default function heavyCalculation() { ... }`

파일명이 kebab-case인 경우, 파일이 다루는 기능/도메인 단위를 의미하며 관련된 멤버들을 named export로 함께 내보낼 수 있다.
- `array.ts` → `export function sortArray() {}, export function findMax() {}`
- `date-utils.ts` → `export function formatDate() {}, export function parseDate() {}`

특정 함수의 코드가 길어져서 별도 파일이 필요할 때는, 해당 함수 이름으로 파일을 분리하고 default export를 사용한다.

- `array.ts` 안의 `heavyCalculation()`이 커질 경우, `heavyCalculation.ts`로 분리하고 `export default function heavyCalculation() { ... }` 형태로 관리한다.

  폴더명도 동일한 개념을 따른다. 폴더명은 해당 폴더가 다루는 기능/도메인을 나타내며, 내부에 관련된 여러 파일이 위치한다.