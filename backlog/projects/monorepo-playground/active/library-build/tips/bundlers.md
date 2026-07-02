# 번들러

## 일반

- Turbopack ≠ Turborepo (단일 패키지 번들러 vs 모노레포 빌드 오케스트레이터)
- 번들링은 트랜스파일링보다 본질적으로 비싸다 (전체 모듈 그래프 분석 필요) → dev에서 번들링을 회피하는 전략(Vite 등)이 정당화된다
- HTTP/2·3에서도 번들링은 초기 로딩 성능 최적화에 여전히 중요
- Tree-shaking은 번들링 없이 효과적으로 달성하기 어렵다
- Chunk splitting은 번들링 과정의 일부 — unbundled dev 환경에서는 개념 자체가 성립하지 않는다

## Vite

- Vite의 esbuild는 타입 검사를 하지 않는다 — 타입 검증은 별도 `tsc`(또는 IDE/CI)
- Vite 라이브러리 모드는 진입점이 필수 (HTML 진입점 불가)
- 배럴 파일(`index.ts`)을 써도 빌드 결과물이 자동으로 단일 파일이 되지는 않는다 — 별도 설정으로 결정
- Vite의 JSON import는 named import + tree shaking 지원
- Vite는 dev에서 source code를 native ESM 그대로 서빙 — 번들 단계 없이 브라우저가 개별 파일 요청
- Vite는 `dependencies`만 pre-bundle, 변경분만 재처리
- esbuild는 JS 기반 번들러보다 dependencies pre-bundle이 10–100배 빠르다 (Go 작성)
- Pre-bundle은 (a) CJS/UMD → ESM 변환, (b) bare import → URL rewrite, (c) 600+ 내부 모듈 단일 합침 — 세 효과가 동시
- 사내 사용 라이브러리는 ESM-only가 합리적, npm 공개 배포면 UMD/CJS 동봉을 검토
- `peerDependencies`는 `rollupOptions.external` 원칙
- Vite는 tsconfig paths만으로 alias가 동작하지 않는다 (Next.js와 다름) — `vite.config.ts`의 `resolve.alias`도 등록
- Vite 가이드대로 `vite.config.ts` 작성 시 타입 에러 발생 → `@types/node` 설치
