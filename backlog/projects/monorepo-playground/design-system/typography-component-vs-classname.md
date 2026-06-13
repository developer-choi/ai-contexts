# 타이포그래피: 컴포넌트 vs className 결정

## 동기

radix-themes 제거 시 themes의 `Heading`/`Text`/`Link`(타이포 컴포넌트)를 무엇으로 대체할지 결정해야 했다.
컴포넌트(`<Heading as size>`)로 갈지, CSS Module className으로 갈지.

## 결정: className 방식

DS는 타이포그래피를 **CSS Module 클래스**로 제공한다 — `packages/design-system/src/styles/typography.module.scss`의
`h1/h2/h3/h4/body1/body2/body3`(+ `.bold`). 소비자는 시맨틱 태그 + className으로 쓴다:

```tsx
import typography from '@monorepo-playground/design-system/styles/typography';
<h2 className={clsx(typography.h2, styles.title)}>제목</h2>
<p className={clsx(typography.body2, styles.desc)}>본문</p>
```

examples 전반의 themes `Heading/Text/Link`를 이 형태로 일괄 교체했다(master `refactor(examples): themes Heading/Text를 typography로 교체`).

## 근거

- **믹스인은 font-size·line-height만 설정**(+ `.bold` → font-weight). **color는 설정하지 않아 상속**된다 →
  같은 타이포 스케일을 색 맥락(에러 빨강·muted 회색 등)과 독립적으로 재사용.
- **clsx 조합** — 타이포 클래스 + 레이아웃/색 클래스를 자유 조합. 컴포넌트 prop 배선(as/variant) 불필요.
- **래퍼 컴포넌트 0** — 서버 컴포넌트에서 그대로 동작, 추가 DOM·런타임 없음. 시맨틱 태그는 소비자가 직접 선택(`<h2>` vs `<p>`).

## 트레이드오프 (재검토 트리거)

컴포넌트 방식의 장점은 `as` 다형성·시맨틱 기본값 강제다. 지금은 className의 단순함·상속·zero-runtime을 우선했다.
**타이포에 variant 토큰·색 프리셋·다형성 강제가 필요해지면** 컴포넌트화(또는 하이브리드)를 재검토한다.

## 종료 조건

이 결정이 `docs/`(MP 컨벤션)나 DS convention.md에 정식 반영되면 이 노트는 삭제 가능.
