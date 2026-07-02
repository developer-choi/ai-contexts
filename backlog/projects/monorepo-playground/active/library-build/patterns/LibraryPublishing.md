# 라이브러리 Publishing

## 상황

라이브러리 publish 시 외부에 공개할 결과물·API를 통제하고, 내부 모듈은 d.ts에서도 숨긴다.

## 공개 범위 — `files` + 진입점 re-export

```jsonc
// package.json
{
  "files": ["dist"],
}
```

- `files`로 dist만 배포
- 진입점(`src/index.ts`)에서 `export`하는 것만 공개 API — `exports` 차단보다 근본적
- 빌드 산출물에 들어간 모듈이라도 진입점에서 re-export하지 않으면 외부에서 named import 불가

> `exports` 필드를 지우면 빌드 결과물의 모든 파일을 외부에서 import 가능해진다. `viteStaticCopy()`로 임의 파일을 dist에 복사 포함하는 경우 `exports`에 일일이 등록하기 어려워 `exports` 미설정을 택할 수 있다 — 트레이드오프.

## Internal 모듈 숨기기 — `@internal` + `stripInternal`

```ts
/**
 * @internal
 */
export function _normalizeProps(props: RawProps): NormalizedProps {
  // ...
}
```

```jsonc
// tsconfig.app.json
{
  "compilerOptions": {
    "stripInternal": true,
  },
}
```

- 함수·변수에 `@internal` JSDoc 부여
- `stripInternal: true`로 d.ts 생성 시 해당 심볼 제외
- 런타임 코드에는 남지만 타입 자동완성·외부 import에서는 사라짐

## 타입 정의 동봉

`vite-plugin-dts`로 d.ts를 생성한다.

## `preserveModules` 함정 — 공통 클래스 중복

`build.rollupOptions.output.preserveModules: true`로 디렉토리 구조 보존 시, hooks와 utils 양쪽에서 사용하는 공통 클래스가 두 빌드 산출물에 중복 포함된다.

해결: 공통 클래스를 한쪽 디렉토리에 몰아두고 다른 쪽에서 import하도록 구조 정리. 빌드 후 dist를 직접 열어 중복 여부를 검증한다.

## 의존성 배치 — peer + dev 이중 등록

라이브러리에서 React 등 호스트 앱과 공유하는 패키지는 `dependencies`에 넣지 않는다.

```jsonc
// package.json
{
  "peerDependencies": {
    "react": ">=18",
  },
  "devDependencies": {
    "react": "^18.3.0",
  },
}
```

- `peerDependencies` — 호스트 앱이 제공한다고 선언. 빌드 산출물에 미포함 (rollupOptions.external)
- `devDependencies` — 라이브러리 내부 개발·테스트 시 사용
- `dependencies`로 넣으면 호스트 앱에 React가 중복 설치되어 hooks·context가 깨진다

## peer 버전 범위

```jsonc
{
  "peerDependencies": {
    "react": ">=18",
  },
}
```

- 가능한 한 넓게. `^18.3.1`처럼 patch까지 고정하면 npm v7+에서 호스트 앱과 충돌 시 설치 실패
- 메이저 호환 단위(`>=18`, `>=18 <20` 등)로 선언

배경: KA knowledge/library-publishing
