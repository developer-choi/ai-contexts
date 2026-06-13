# 레이아웃 프리미티브는 컴포넌트화하지 않고 per-file SCSS로

## 결정

`@radix-ui/themes`의 레이아웃 프리미티브 `Box` · `Flex` · `Grid` · `Container`는
**대체 컴포넌트를 만들지 않는다.** design-system에도, examples 자체 레이아웃 컴포넌트로도 두지 않는다.
대신 **페이지마다·컴포넌트마다 해당 `*.module.scss`에서 직접 정의**한다.

## 사유

- 이 넷은 시각 디자인(색·폰트·그림자)이 아니라 자리잡기 CSS 한두 줄(`display:flex; gap`, `max-width; margin:auto`)을 prop으로 감싼 styled `div`일 뿐 → 컴포넌트로 추상화해도 재사용 가치가 낮다.
- 레이아웃은 페이지마다 제각각이라 범용 prop 엔진(themes식 `Flex direction gap align …`)은 과설계.
- 레포 컨벤션이 이미 `*.module.scss` (CSS Module) → plain `div` + 클래스가 자연스럽다.
- design-system은 진짜 시각 컴포넌트(Button·Card·Badge·Callout·Table·AlertDialog 등)만 보유해 표면을 작게 유지.

## 변환 규칙 (themes → plain)

| themes | 대체 |
|---|---|
| `<Container size px py>` | `<div className={styles.container}>` + `max-width / margin:0 auto / padding` |
| `<Flex direction gap align justify>` | `<div className={styles.x}>` + `display:flex; …` |
| `<Box p m>` | `<div className={styles.x}>` |
| `<Grid columns gap>` | `<div className={styles.x}>` + `display:grid; …` |

- themes의 spacing 스케일(`gap="3"` 등)은 design-system 토큰(`--spacing-*`)으로 매핑해 쓴다.
- 즉 레이아웃 자리잡기 값도 하드코딩 금지, `var(--spacing-*)` 토큰 사용.

## 적용 시점

task#3(themes 제거 마이그레이션) 실행 시 이 규칙을 따른다. 시각 컴포넌트(Card/Badge/Callout/Table/AlertDialog 등)의
DS 이관 여부와는 독립이다 — 레이아웃 4종은 무조건 per-file SCSS.
