# Vite Config

- `build.lib.format`을 `['es']`만으로 줄이면 fileName을 함수 아닌 문자열로 단순화 가능한지 검증
- `build.lib.name`/`fileName`이 없을 때 package.json 어느 필드를 따라가는지 확인
- `index.esm.js`에 모든 컴포넌트 합쳐있을 때 Tree Shaking 실제 동작 검증, 다른 라이브러리는 컴포넌트별 분리 빌드인지 한 파일 합본인지 비교
- viteStaticCopy가 라이브러리에서 공통 scss 내보내기 최적인지 대안 비교
- Vite CLI가 tsconfig.app.json/tsconfig.node.json 분리해 두는 이유 (TS 공식 예약 파일명인지, Vite 사정인지)
- **[검증 필요]** rollupOptions.external 가이드: UI 프레임워크(react, vue 등)·공통 유틸(lodash, dayjs)·peerDependencies는 external. 미적용 시 번들 사이즈↑·중복 로드·React Hooks 런타임 오류 가능 — GPT 답변 기반, 1차 소스 검증 필요

## 일부 답 확보 (2026-06-10, MP design-system 적용)

MP `packages/design-system` 빌드를 ESM-only + preserveModules로 바꾸며 확인됨 (커밋 `82c29d15`=ESM-only/CJS제거, `5303f95e`=use client 보존+tree-shaking; 상세·1차 소스는 `use-client-preservation.md`).

- `build.lib.formats: ['es']`로 줄이면 `fileName`을 함수→단순 함수/문자열로 줄여도 됨. 단 `preserveModules:true`를 켜면 `fileName`/`name` 대신 `output.entryFileNames`로 파일명을 정한다.
- `lib.name`은 **UMD/IIFE 전용**(external을 가리킬 전역 변수명). es/cjs만 빌드하면 한 번도 안 쓰이는 죽은 설정 → ES-only면 제거. `output.globals`도 동일(umd 전용). name이 없을 때 기본 fileName은 package.json `name`을 sanitize해 따라가므로, `index.js`를 원하면 명시 필요.
- 단일 합본 vs 컴포넌트별 분리: radix-ui는 **패키지별 분리 빌드**(1패키지 1컴포넌트). 한 패키지를 단일 번들로 합치면 트리셰이킹이 약하고 모듈별 `"use client"`도 소실 → `preserveModules:true`로 src 구조대로 다파일 출력하면 트리셰이킹 + 디렉티브 보존을 둘 다 얻음.
- `rollupOptions.external`: 소스가 실제 import하는 런타임 의존성(여기선 react·clsx·radix-ui)을 external로. preserveModules 환경에선 **필수** — 안 빼면 의존성이 `dist/node_modules/...`로 줄줄이 산출됨. 서브패스까지 잡으려면 정규식(`/^radix-ui($|\/)/`).
