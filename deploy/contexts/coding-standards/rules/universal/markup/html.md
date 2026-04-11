# 마크업 및 디자인 시스템 가이드

## 1. 디자인 시스템 준수

### 디자인 값 하드코딩 금지 (Stylelint 강제)
색상, font-size, line-height, padding, margin 등의 하드코딩은 Stylelint 커스텀 룰(`mp/no-hardcoded-colors`, `mp/no-hardcoded-values`)이 차단한다.

### 디자인 토큰이 없는 경우
- 필요한 색상/타이포/스페이싱 변수가 프로젝트에 정의되어 있지 않다면, 임의로 만들지 말고 사용자에게 요청해야 합니다.
- Typography: Figma 상의 **Text Style Name**과 매핑되는 스타일이나 컴포넌트를 찾아서 쓰세요.

## 2. 시맨틱 마크업
태그는 시각적 모양이 아니라 **의미와 기능**에 맞게 선택해야 합니다.

### 링크
- **정의**: 눌렀을 때 **페이지 이동**이 발생하는 모든 UI (텍스트, 이미지, 버튼 모양 포함).
- **규칙**: 반드시 `<a>` 태그(Next.js의 경우 `<Link>`)와 `href` 속성을 사용합니다.
- **❌ Bad**:
    - `<button onClick={() => router.push(...) }>`
    - `<div onClick={() => window.location.href = ... }>`

### 폼
- **규칙**: 사용자 입력을 받는 영역은 관련 폼 태그로 감싸야 합니다.
    - 전체 영역: `<form>`
    - 그룹핑: `<fieldset>`, `<legend>`
    - 입력/라벨: `<input>`, `<label>`
