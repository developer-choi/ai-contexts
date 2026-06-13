---
tags: [build-tool, vite, rollup, rsc, esm, monorepo-playground]
source: 1차 검증(react.dev · Node docs · 플러그인 README · ariakit issue) + MP 실제 적용
---

# 라이브러리 빌드에서 "use client" 디렉티브 보존 + ESM-only

## 동기

MP design-system을 Next.js(examples)·채용과제에서 import해 쓸 때 두 가지가 깨졌다:
(1) 빌드 산출물이 `"use client"`를 잃어, `useState`를 쓰는 컴포넌트를 **서버 컴포넌트가 import하면 Next 빌드 에러**. (2) 전 컴포넌트가 단일 번들이라 **트리셰이킹이 약함**. 이를 ESM 단독 + 모듈별 디렉티브 보존(preserveModules)으로 해결한 기록. 나중에 라이브러리 빌드 설정 공부 시 참고.

적용 커밋 (MP = `~/WebstormProjects/main/monorepo-playground`, 파일: `packages/design-system/vite.config.ts` · `package.json`):

- `82c29d15` (= ESM-only / CJS 출력 제거 + umd 잔재 정리)
- `5303f95e` (= use client 디렉티브 보존 preserveModules + tree-shaking)

> 주의: 이 두 해시는 reorder로 한 번 바뀐 값이다(옛 `fb0ae360`·`25c9f2e7`은 폐기). 더 옮겨질 수 있으니 `git log -- packages/design-system/vite.config.ts`로 재확인.

## 1. 문제 — Rollup은 번들 시 모듈 레벨 "use client"를 떨군다

`"use client"`는 파일당 하나만 의미가 있는데, 번들러가 여러 모듈을 한 파일로 합치면 그 디렉티브가 사라진다(Rollup이 제거하며 "Module level directives cause errors when bundled" 경고).

- react.dev: *"'use client' must be at the very beginning of a file, above any imports or other code (comments are OK)."* / *"'use client' defines the boundary between server and client code on the module dependency tree, not the render tree."* (https://react.dev/reference/rsc/use-client)
- 결과: `Button.tsx`(`"use client"` + `useState`)가 단일 `index.js`로 합쳐지며 디렉티브 소실 → 서버 컴포넌트(`apps/examples/src/app/not-found.tsx` → `ErrorPageTemplate` → design-system)가 import할 때 "클라 훅인데 use client 없음" 에러.

## 2. 정석 3갈래 (핵심 제약: 단일 번들 유지 + 모듈별 디렉티브 보존은 동시 불가)

- **① 통짜 배너** — 전 export가 클라일 때. `output.banner: '"use client";'`. 단일 파일 유지. radix-ui가 실제로 이 방식(패키지별로, 클라 코드 든 패키지에만 박음; `react-slot`처럼 훅 없는 건 안 박음). 단점: 서버 안전 export까지 클라로 묶임.
- **② 모듈별 보존** — `preserveModules: true` + `rollup-preserve-directives` 플러그인. 파일별 디렉티브 유지 + 트리셰이킹. 출력이 src 구조 그대로 다파일이 됨. **← MP 채택.**
  - 플러그인 README: *"Rollup by default always removes directives like 'use client'."* / *"When preserveModules: true is set, because each module is a separate output file, it's possible to keep directives."* (https://github.com/Ephem/rollup-plugin-preserve-directives)
  - 패키지명 주의: Vite엔 `rollup-preserve-directives`(v1.x), 루트 `plugins`에 등록해야 동작(`build.rollupOptions.plugins` 아님 — vitejs/vite Discussion #15721). Ephem의 `rollup-plugin-preserve-directives`(v0.4)와 다른 패키지.
- **③ bunchee** — `"use client"`/`"use server"` 자동 감지 + 클라/서버 청크 분리. zero-config. Next 인접 라이브러리들이 사용.

## 3. CJS "use client" 순서 함정 (ESM-only로 원천 회피)

CJS 출력에선 `"use client"`가 **실행문 앞 디렉티브 프롤로그**에 있어야 한다. 빌드 도구가 interop 코드(`Object.defineProperty(exports, ...)`)를 먼저 끼우면 디렉티브가 프롤로그를 벗어나 깨진다.

- ariakit#4118 깨진 예: `"use strict";Object.defineProperty(...);"use client";` → Next가 거부. 기대: `"use client";`가 맨 앞. (https://github.com/ariakit/ariakit/issues/4118)
- **ESM-only로 가면 cjs 출력 자체가 없어 이 함정이 사라진다.** (MP가 ESM-only를 택한 부수 이득)

## 4. ESM-only 결정 (왜 dual(es+cjs)을 버렸나)

- 소비자가 examples(Next.js)·채용과제뿐이라 전부 ESM 네이티브.
- Node도 `require(esm)`가 정식화 → **CJS 소비자도 ESM 패키지를 require로 쓸 수 있다.**
  - Node 공식: require(ESM)는 **v25.4.0부터 정식(no longer experimental)**, 무플래그 v22.12+/v20.19+. *단 대상 모듈 그래프에 top-level await가 없어야* 함(있으면 `ERR_REQUIRE_ASYNC_MODULE`). (https://nodejs.org/api/modules.html — "Loading ECMAScript modules using require()")
- 정확한 표현: "ESM이 CJS를 없앤다"가 아니라 **"ESM이 상호운용의 기준점이 됐다"** (CJS 레거시는 오래 남되, 새 패키지를 ESM-only로 내도 CJS가 require로 소비 가능).

## 5. 실제 vite.config / package.json 변경 요지

- `vite.config.ts`:
  - `preserveDirectives()`를 **루트 `plugins`**에 추가.
  - `build.lib.formats: ['es']`, `fileName: () => 'index.js'` (단일 ES).
  - `output: { format:'es', preserveModules:true, preserveModulesRoot:'src', entryFileNames:'[name].js', dir:'dist' }`.
  - `external` 확대: `[/^react($|\/)/, /^react-dom($|\/)/, 'clsx', /^radix-ui($|\/)/]`. **이유: preserveModules는 번들 안 한 런타임 의존성을 `dist/node_modules/...`로 줄줄이 토해내므로, 소스가 실제 import하는 런타임 의존성을 전부 external로 빼야 한다**(clsx·radix-ui는 design-system의 dependencies라 소비자가 받음).
  - 제거: `lib.name`, `output.globals` — UMD/IIFE 전용 설정. ES/CJS는 실제 import/require를 유지해 globals(외부 의존성→전역 변수명) 매핑을 참조하지 않으므로, 원본 es+cjs 빌드에서도 **한 번도 동작한 적 없는 죽은 설정**이었다. (이 정리는 cjs 제거와는 별개 사안 — 커밋 `82c29d15` 본문에 그 구분을 명시.)
- `package.json`:
  - `main`(`./dist/index.cjs`) 및 `exports["."].require` 제거 (cjs 진입점 없음).
  - `module`/`type:"module"`/`exports.import` 유지.

## 6. 결과 산출물 검증

- `dist/components/Button.js` 1번째 줄 `"use client";` / `Spinner.js`·`Modal/Dialog.js`는 소스에 디렉티브 없어 **미주입**(= radix식 조건부 보존 동작).
- `.cjs` 0개. 모듈별 `.js` + 단일 `design-system.css`(`cssCodeSplit:false`).
- 검증: `not-found`(404) 정상 렌더 + use-client 에러 로그 0건, tsc 통과.

## 7. sideEffects — 트리셰이킹 "켜기" (false vs CSS 배열)

`package.json`의 `sideEffects`는 소비자 번들러가 **파일 하나하나**에 묻는 질문의 답이다: "이 파일의 export가 아무도 안 쓰이면 통째로 지워도 되나?"

- `false` = 모든 파일 부수효과 없음 → 안 쓰는 건 다 가지치기(가장 공격적).
- `true`/없음 = 다 부수효과 있을 수 있음 → 안 지움.
- **배열** = 그 패턴(예: css)만 부수효과로 보존, 나머지는 지워도 됨.

핵심은 **바인딩 없는 `import './x.css'`**(변수 안 가져오고 스타일 주입만 하는 import): `false`면 "안 쓰는 import"로 보고 삭제 → 스타일 증발. `["**/*.css"]`면 보존.

- webpack 공식: *"if you use something like `css-loader` in your project and import a CSS file, it needs to be added to the side effect list so it will not be unintentionally dropped in production mode."* / 배열 예 `["./src/...js", "*.css"]`. (https://webpack.js.org/guides/tree-shaking/)
- MP 현황: `cssCodeSplit:false`라 **JS가 css를 import하지 않음**(소비자가 `style.css`를 직접 import). 그래서 현재는 `false`든 `["**/*.css","**/*.scss"]`든 결과 동일. 배열은 webpack 권장 + 향후 컴포넌트별 css import 대비한 방어. (커밋 `5303f95e`)

## 다음 / 미해결

- `Modal/Dialog.tsx`는 소스에 `"use client"`가 없어 `Dialog.js`에도 미주입. 지금은 radix Dialog(외부, 자체 use client) 래핑이라 무방하나, 서버 컴포넌트에서 `<Dialog.Root onOpenChange=...>`처럼 핸들러를 직접 넘기면 깨질 수 있음 — **소스 결정 사안**(별도).
- 단일 번들 유지하며 모듈별 디렉티브 보존하는 길은 원리상 없음 — 서버 안전 export가 늘면 ②(preserveModules) 또는 ③(bunchee) 유지가 정답.
