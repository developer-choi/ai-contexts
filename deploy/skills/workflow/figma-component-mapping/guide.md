# 피그마 컴포넌트 매칭표 생성 가이드

> 피그마 MCP가 제공하지 않는 variant props(styleType, size 등)를 디자인시스템 원본 소스에서 역추론하여 매칭표를 만든다.

## 적용 조건

- 실무 프로젝트만 (채용과제는 피그마 dev 권한 없으므로 불가)
- 피그마 MCP 연결 상태

## 왜 필요한가

피그마 MCP(`get_design_context`)는 React+Tailwind 참조 코드를 반환하지만, 컴포넌트 variant 속성(`styleType=neutralPrimary`, `size=medium` 등)은 포함하지 않는다. CSS 토큰만으로는 props를 정확히 결정할 수 없어 오매핑이 반복된다.

### 대표 오류 사례

| 유형 | 사례 |
|------|------|
| styleType 혼동 | `neutralElevated`(흰배경)와 `neutralPrimary`(회색배경)를 반대로 매핑 |
| size 오매핑 | `size="large"`(54px) 넣었는데 피그마는 48px(= `"medium"`) |
| fontWeight 오매핑 | `fontWeight="medium"` 넣었는데 피그마는 Regular(400) |
| hex 하드코딩 | 디자인 토큰이 존재하는데 hex 값으로 하드코딩 |
| mixin 중복 | 상위에서 이미 제공하는 padding을 하위에서 다시 적용 |

## 생성 절차

Step 5에서 Markup Implementer spawn 전에 Lead가 수행한다.

1. 사용자에게 **디자인시스템 원본 레포 경로** 요청 (예: `~/workspace/langdy/langdy-design-system`)
2. 원본 소스코드(TSX props interface + SCSS/CSS module)를 읽어서 매칭표 생성
3. 매칭표를 `/plan/background/consumable/figma-component-mapping.md`에 저장 ([템플릿](../template/figma-component-mapping.md) 참조)
4. 마크업 시 피그마 CSS 토큰을 매칭표와 대조하여 props 결정
5. 새 컴포넌트 발견 시 매칭표에 추가

## 검증

생성된 매칭표를 디자인시스템 원본 소스와 대조한다 (대조 절차는 SKILL.md 「자가 검토 필수」 일반 규칙).
