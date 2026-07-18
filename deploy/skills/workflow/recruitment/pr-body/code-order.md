# 파일 내 코드 순서

## 문제

컴포넌트 파일이 화면을 그리는 본체(export)를 맨 아래 두고, 그 위를 상수·유틸·하위 컴포넌트가 차지하고 있었습니다.

```ts
const STATUS_BADGE = { ... }
function groupByTime() { ... }
function ReservationCard() { ... }
export function ReservationListClient() { ... }
```

사람은 코드를 위에서 아래로 읽고, 숲(전체 흐름)을 먼저 본 뒤 나무(세부 구현)를 봅니다.

그런데 이 순서는 반대라, 파일을 열면 이게 뭘 하는 화면인지 알기도 전에 하위 로직과 마크업부터 만납니다. 호출하는 쪽(부모)보다 호출되는 쪽(자식)이 먼저 나오는 셈입니다.

## 해결

진입점 `export default function ReservationListClient()`를 최상단으로 올리고, 그 아래에 이 컴포넌트가 쓰는 하위 요소를 순서대로 뒀습니다.

```ts
export default function ReservationListClient() { ... }
function ReservationCard() { ... }
function groupByTime() { ... }
const STATUS_BADGE = { ... }
```

파일을 열자마자 "이 파일이 뭘 하는지"가 먼저 보이고, 필요한 만큼만 내려가며 세부를 확인하면 됩니다. 개인 코딩 컨벤션에도 있는 규칙입니다: "핵심(타입, export 함수)이 먼저, 부수적인 것(상수, 유틸)은 뒤로."
