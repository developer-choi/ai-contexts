# typed CSS modules — scss에 없는 클래스 접근 시 타입 오류

## 동기

`docs/patterns/testing/`(TestsWeAvoid·WhatToTest)가 "클래스 이름과 prop 유니온이 어긋나는 것은 타입드 CSS 모듈로 잡는다"고 단언하나, 현재 컴포넌트 스타일엔 그 설정이 없어 사실이 아니다. CSS 클래스명 단언 유닛 테스트를 안 쓰는 근거("정적 분석이 더 싸게 잡는다")가 성립하려면 이 설정이 실제로 있어야 한다.

## 현재상태 (2026-06-14 확인)

- `packages/design-system/src/vite-env.d.ts` = `/// <reference types="vite/client" />`만. vite/client가 `*.module.scss`를 `{ readonly [key: string]: string }`(인덱스 시그니처)로 선언 → `styles.없는클래스`도 string으로 통과, 타입 오류 안 남.
- 예외: `src/styles/typography.d.ts`는 **손으로** 정확한 클래스 목록(`{ h1; h2; … bold }`)을 선언해 typography만 오타가 잡힌다. 컴포넌트 scss(`Button.module.scss` 등)는 전부 인덱스 시그니처라 안 잡힌다.

## 기대상황

모든 `*.module.scss`에 대해 실제 클래스 이름만 가진 정확한 타입이 생성되어, scss에 없는 클래스(`styles.contained`인데 scss엔 `.solid`만 있음)를 JS에서 접근하면 컴파일·CI에서 타입 오류가 난다. → CSS 클래스명 단언 유닛 테스트가 불필요해지는 근거가 실제로 성립.

## 방법 후보 (의사결정 필요)

- `typed-scss-modules` CLI — scss마다 `*.module.scss.d.ts` 자동 생성(watch/CI). typography 수기 `.d.ts`도 이걸로 대체 가능
- `vite-plugin-sass-dts` — vite dev/build 중 `.d.ts` 생성
- `typescript-plugin-css-modules` — 에디터(IDE) 타입만 강하고 `tsc` 빌드 체크엔 약함 → 단독으론 부족

트레이드오프: 생성된 `.d.ts`를 커밋할지/gitignore할지, CI에서 "생성 → tsc" 순서 보장, typography 수기 `.d.ts`를 자동 생성으로 일원화할지.

## 종료 조건

- 컴포넌트 scss에 없는 클래스를 접근하면 `tsc`(check-types)가 에러를 낸다 — 재현 1건으로 확인
- typography 수기 `.d.ts`가 자동 생성으로 흡수되거나 공존 방침 확정
- `docs/patterns/testing/`의 "타입드 CSS 모듈로 잡는다" 문구가 실제 설정을 가리키도록 갱신
- `docs/static-checking.md` 매핑 테이블에 추가

## 첫 행동

`typed-scss-modules`를 design-system에 dev 설치하고 `Button.module.scss` 1개에 `.d.ts`를 생성 → `styles.없는클래스` 접근이 `tsc` 에러를 내는지 확인. 되면 전체 scss로 확대하고 생성 스크립트를 lint/build 파이프라인에 연결.
