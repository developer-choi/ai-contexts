# 피그마 컴포넌트 매칭표

> 피그마 CSS 토큰 → 디자인시스템 컴포넌트 props 매핑.
> 디자인시스템 원본 소스(TSX props interface + SCSS/CSS module)를 읽어서 작성한다.

작성 절차는 [figma-component-mapping/guide.md](../figma-component-mapping/guide.md) 참조. 본 파일은 양식만 정의한다.

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
