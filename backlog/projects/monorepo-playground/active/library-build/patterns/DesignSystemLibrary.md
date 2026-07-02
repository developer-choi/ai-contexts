# 디자인 시스템 라이브러리

## 상황

사내 디자인 시스템을 별도 패키지로 빌드·배포한다. 컴포넌트 + 공통 SCSS(reset, design-tokens 등)를 함께 내보낸다.

## SCSS 셋업

Vite는 `.scss/.sass/.less/.styl`을 built-in 지원한다. 별도 플러그인 없이 pre-processor만 설치하면 CSS Module + SCSS가 동작한다.

```bash
npm install -D sass
```

## 공통 스타일시트 동봉 — `viteStaticCopy`

reset.css, global.css, design-tokens.scss를 dist에 그대로 복사한다.

```ts
// vite.config.ts
import {viteStaticCopy} from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {src: './src/styles/reset.css', dest: './'},
        {src: './src/styles/design-tokens.scss', dest: './'},
      ],
    }),
  ],
});
```

## 외부에서 import — TS와 SCSS 경로 차이

라이브러리를 `@scope/core`로 publish한 후 호스트 앱에서:

```tsx
// .tsx — exports 필드 해석으로 dist 경로 없이 동작
import styles from '@scope/core/typography.module.scss';
```

```scss
// .scss — exports 필드 미해석. dist 경로 명시 필요
@use '@scope/core/dist/typography.module';
```

`.tsx`의 모듈 import는 번들러가 패키지 `exports`를 해석하지만, `.scss`의 `@use`는 sass가 직접 node_modules를 읽으므로 dist 경로를 그대로 적어야 한다.

## 외부 import 요구사항 3종

호스트 앱에서 디자인 시스템을 사용하는 경로는 셋업 시 모두 검증한다.

- TS 모듈 import — `import {Button} from '@scope/core'`
- 스타일이 입혀진 컴포넌트 import — 위 import 한 번으로 컴포넌트의 CSS Module이 함께 적용
- 내보낸 SCSS 파일 외부 사용 — 호스트 앱의 layout에서 reset/global을 CSS로 import (`import '@scope/core/reset.css'`), SCSS에서 디자인 토큰을 `@use` (`@use '@scope/core/dist/design-tokens'`)

## 라이브러리 프로젝트 공통 요구사항 체크리스트

Monorepo·Polyrepo·Monolithic 어떤 형태든 라이브러리 셋업 시 공통:

- 로컬 진입점 또는 dev 서버 (Next.js / Vite / Storybook 중 택)
- TS + import alias
- CI/CD 자동 publish + 테스트 환경(RTL 등)
- Tree-shaking 검증 (빌드 산출물에서 직접 확인)

## 함정

- 공통 디자인 토큰 SCSS를 패키지 내부에서도 사용하면서 export까지 하면 빌드 결과 `style.css`와 별도 export된 `design-tokens.scss` 양쪽에 토큰 CSS가 중복될 수 있다 — 검증 필요
- Next.js Client Component 지원이 필요하면 `'use client'` 지시문 보존을 위한 별도 셋업 필요 (대표 옵션: `vite-plugin-preserve-directives` 또는 esbuild 옵션)

배경: KA knowledge/design-system-library
