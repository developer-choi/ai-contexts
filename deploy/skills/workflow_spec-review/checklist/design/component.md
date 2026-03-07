# 컴포넌트 전용 디자인 점검 항목

디자이너가 피그마로 전달한 컴포넌트 시안을 검토할 때 추가로 확인하는 항목.

## 1. Best Practice 확인

유사 컴포넌트의 best practice를 확인하여 시안과 비교한다.

- [MUI Components](https://mui.com/material-ui/getting-started/)
- [Material Design 3 Components](https://m3.material.io/components)

시안이 표준 패턴과 다를 경우, 의도된 차이인지 확인한다.

## 2. 디자인 토큰

시안에 사용된 값이 디자인 시스템의 토큰과 일치하는지 확인한다.

- 색상이 팔레트에 정의된 값인가, 임의의 값인가?
- 폰트 크기/굵기/행간이 타이포그래피 스케일에 있는가?
- 간격/radius 등이 spacing/radius 토큰에 있는가?
- 토큰에 없는 값이 사용되었다면 디자이너에게 확인한다.

## 3. Props 구조

컴포넌트가 받아야 할 Props를 시안에서 추출한다.

- 시안에 표현된 variant(변형)가 몇 가지인가? (size, color, state 등)
- 선택적으로 보이는 요소가 있는가? (아이콘 유무, 서브텍스트 유무 등)
- disabled / loading 등 상태별 시안이 존재하는가?
