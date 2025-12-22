# 마크업 및 디자인 시스템 가이드

## 1. 디자인 시스템 준수 (Typography & Color)
HTML/CSS 작성 시 디자인 값(색상, 폰트 크기 등)을 하드코딩하지 않습니다.

### Typography
- `font-size`, `line-height`를 직접 선언하지 말고, **사전에 정의된 Typography 컴포넌트**를 사용합니다.
- Figma 상의 **Text Style Name**과 매핑되는 컴포넌트를 찾아서 쓰세요.
- 없다면 사용자에게 요청해야 합니다.
- **Usage**: 기본 속성(size, height, default color)은 건드리지 않고, 외부 여백(`margin`)이나 `color` 정도만 커스텀합니다.

### Color
- 헥사 코드(`#123456`)를 직접 사용하지 않습니다.
- 반드시 프로젝트에 정의된 **Color Variable** (SCSS 변수, styled-components 테마 객체 등)을 사용하세요.
- 만약 필요한 컬러 값이 정의되어 있지 않다면, 임의로 만들지 말고 사용자에게 요청해야 합니다.

## 2. 시맨틱 마크업 (Semantic Markup)
태그는 시각적 모양이 아니라 **의미와 기능**에 맞게 선택해야 합니다.

### 링크 (Link)
- **정의**: 눌렀을 때 **페이지 이동**이 발생하는 모든 UI (텍스트, 이미지, 버튼 모양 포함).
- **규칙**: 반드시 `<a>` 태그(Next.js의 경우 `<Link>`)와 `href` 속성을 사용합니다.
- **❌ Bad**:
    - `<button onClick={() => router.push(...) }>`
    - `<div onClick={() => window.location.href = ... }>`

### 폼 (Form)
- **규칙**: 사용자 입력을 받는 영역은 관련 폼 태그로 감싸야 합니다.
    - 전체 영역: `<form>`
    - 그룹핑: `<fieldset>`, `<legend>`
    - 입력/라벨: `<input>`, `<label>`
