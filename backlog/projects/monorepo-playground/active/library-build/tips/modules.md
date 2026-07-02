# 모듈 시스템

## ESM

- `export {}`는 no-op (빈 객체 export 아님 — 파일을 모듈로 표시할 뿐)
- `export * from "mod"`는 default를 포함하지 않는다 — default까지 내보내려면 명시적으로 다시 export
- 두 wildcard re-export가 동일 이름을 export하면 둘 다 누락된다 (런타임 오류 없이 침묵)
- 모듈은 첫 import 시 1회만 평가된다 — top-level 코드는 초기화 전용, 반복 호출은 함수로 export
- 브라우저 환경에서 bare import(`import x from 'pkg'`)는 불가 — 번들러 또는 Import maps 필요

## ESM / CJS 호환

- ESM-only 라이브러리를 SSR/CJS 환경에서 `require`로 가져오면 에러 — 호환은 번들러·런타임 변환에 의존하는 것이지 직접 섞어 쓰는 게 아님
- TS의 ESM/CJS 호환 동작은 `esModuleInterop` 옵션에 좌우된다

## Tree shaking

- ESM이 CJS보다 tree shaking에 강한 이유: import 경로가 string literal로 강제되고 export 이름이 build time에 고정. CJS는 동적이라 정적 분석이 어렵다
- CJS도 컨벤션 준수 + 플러그인(예: `webpack-common-shake`)으로 부분 tree shaking 가능 — 신규 코드는 ESM
- 번들러 출력 기본값(Vite는 `build.lib`에서 ESM+UMD)은 모듈 시스템 호환 범위를 반영
