# Vite 라이브러리 빌드

## 상황

Vite로 라이브러리를 ESM-only로 빌드하고 d.ts·공통 SCSS·import alias를 함께 셋업한다.

## package.json — ESM-only

```jsonc
{
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
}
```

- `type: "module"` — 패키지 전체를 ESM으로 해석
- `main`/`module` 모두 ESM 산출물을 가리켜 단일 진입점으로 통일
- `files`로 dist만 배포 (소스·테스트 제외)

## vite.config.ts — build.lib

```ts
import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import dts from 'vite-plugin-dts';
import {viteStaticCopy} from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    dts({tsconfigPath: './tsconfig.app.json', rollupTypes: true}),
    viteStaticCopy({
      targets: [{src: './src/styles/design-tokens.scss', dest: './'}],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});
```

- `vite-plugin-dts` — `tsconfigPath`로 빌드용 tsconfig 지정, `rollupTypes: true`로 d.ts를 단일 파일로 합침
- `viteStaticCopy` — 디자인 토큰 SCSS 등 스타일 보조 파일을 dist에 그대로 복사하여 라이브러리 산출물에 포함
- `rollupOptions.external` — peerDependency는 외부화 (번들에 포함 X)

## import alias 이중 등록

Vite는 tsconfig paths만으로는 alias가 동작하지 않는다 (Next.js와 다름). tsconfig와 vite.config 양쪽에 등록한다.

```jsonc
// tsconfig.app.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
    },
  },
}
```

```ts
// vite.config.ts (위 예시 참조)
resolve: {
  alias: {
    '@': resolve(__dirname, './src'),
  },
},
```

대안: `vite-tsconfig-paths` 플러그인을 사용하면 tsconfig paths가 단일 원천이 된다.

## 타입 에러: `__dirname`/`process` 미정의

`@types/node`를 devDependency로 추가한다. Vite 가이드의 `vite.config.ts`는 Node 전역을 사용하므로 `@types/node` 없이는 타입 에러가 난다.

배경: KA knowledge/vite/library-build
