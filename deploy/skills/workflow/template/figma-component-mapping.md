# 피그마 컴포넌트 매칭표

> 피그마 CSS 토큰 → 디자인시스템 컴포넌트 props 매핑.
> 디자인시스템 원본 소스(TSX props interface + SCSS/CSS module)를 읽어서 작성한다.

## 작성 방법

1. 디자인시스템 원본 레포에서 컴포넌트 소스 읽기
2. props interface에서 variant 속성(styleType, size 등) 추출
3. SCSS/CSS module에서 각 variant가 적용하는 CSS 토큰 확인
4. 아래 형식으로 매핑 작성

---

## [컴포넌트명] (예: Button)

### styleType

| Figma CSS 토큰 조합 | styleType | 비고 |
|---|---|---|
| bg: `action-primary`, color: `action-on-action-primary` | `"primary"` | 주황 CTA |
| bg: `surface-elevated`, color: `text-secondary` | `"neutralPrimary"` | 회색 배경 |
| bg: `surface-primary`, color: `text-secondary` | `"neutralElevated"` | 흰 배경 |

### size

| 높이 | size |
|---|---|
| 28px | `"xSmall"` |
| 38px | `"small"` |
| 48px | `"medium"` |
| 54px | `"large"` |

### fontWeight

| Figma font-weight | fontWeight prop |
|---|---|
| 600 / SemiBold | `"bold"` |
| 500 / Medium | `"medium"` |
| 400 / Regular | `"regular"` (기본값) |
