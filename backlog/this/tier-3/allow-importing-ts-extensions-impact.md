---
target: monorepo-playground
---

# [ready] allowImportingTsExtensions 삭제 영향 범위

## 배경

`monorepo-playground`의 디자인 시스템 패키지에서 `tsconfig.node.json`에 있는 `allowImportingTsExtensions` 옵션 삭제를 검토한다.

대상 파일:

```txt
C:\Users\Langdy-3\WebstormProjects\main\monorepo-playground\packages\design-system\tsconfig.node.json
```

삭제 대상 옵션:

```json
"allowImportingTsExtensions": true
```

## 현재 설정 구조

`packages/design-system/tsconfig.json`은 project reference로 아래 두 config를 참조한다.

```json
{
  "files": [],
  "references": [{"path": "./tsconfig.app.json"}, {"path": "./tsconfig.node.json"}]
}
```

`tsconfig.node.json`의 include 범위는 다음 두 파일뿐이다.

```json
"include": ["vite.config.ts", ".storybook/main.ts"]
```

즉, 이 옵션은 디자인 시스템의 일반 소스 코드 전체가 아니라 아래 설정 파일 타입체크에만 직접 영향을 준다.

- `packages/design-system/vite.config.ts`
- `packages/design-system/.storybook/main.ts`

`tsconfig.app.json`에는 해당 옵션이 없고, 이미 기본값인 `false` 기준으로 앱/라이브러리 소스가 체크된다.

## 삭제해도 되는 이유

TypeScript의 `allowImportingTsExtensions` 기본값은 `false`다.

현재 `tsconfig.node.json`이 포함하는 두 파일에서는 `.ts` 또는 `.tsx` 확장자를 붙인 import 경로를 사용하지 않는다.

확인한 파일:

- `vite.config.ts`
- `.storybook/main.ts`

따라서 지금 상태 기준으로는 옵션을 삭제해도 `tsconfig.node.json` 타입체크 결과가 바뀌지 않아야 한다.

## 영향 범위

직접 영향 범위:

- Vite 설정 파일 타입체크
- Storybook 설정 파일 타입체크
- `yarn check-types` 실행 시 `tsc -b --noEmit`에 포함되는 node config reference

영향이 없어야 하는 범위:

- `src` 하위 컴포넌트 코드
- CSS/SCSS import
- Vite build의 번들링 동작
- Storybook story discovery 패턴
- package export 결과물

주의할 점:

- 삭제 후 `vite.config.ts` 또는 `.storybook/main.ts`에서 `import './some-file.ts'`처럼 `.ts` 확장자를 붙이면 TS5097이 발생한다.
- `import './style.css'`, `import './style.scss'` 같은 스타일 import는 이 옵션과 무관하다.

## 삭제 후 기대 동작

삭제 전 허용되던 형태:

```ts
import something from './some-config.ts';
```

삭제 후 금지되는 형태:

```ts
import something from './some-config.ts';
import Component from './Component.tsx';
```

삭제 후에도 허용되는 형태:

```ts
import something from './some-config';
import './style.css';
import './style.scss';
```

## 검증 체크리스트

작업 위치:

```powershell
cd C:\Users\Langdy-3\WebstormProjects\main\monorepo-playground\packages\design-system
```

1. `tsconfig.node.json`에서 아래 줄을 삭제한다.

```json
"allowImportingTsExtensions": true
```

2. 타입체크를 실행한다.

```powershell
yarn check-types
```

3. 린트를 실행한다.

```powershell
yarn lint
```

4. 라이브러리 빌드를 실행한다.

```powershell
yarn build
```

5. Storybook 설정 영향 확인이 필요하면 Storybook 빌드도 실행한다.

```powershell
yarn build-storybook
```

## 문제가 생겼을 때 확인할 것

TS5097이 발생하면 에러가 난 파일에서 `.ts` 또는 `.tsx` 확장자를 import 경로에 직접 쓴 부분을 찾는다.

예:

```ts
import config from './config.ts';
```

아래처럼 확장자를 제거한다.

```ts
import config from './config';
```

CSS/SCSS import는 수정 대상이 아니다.

```ts
import './style.css';
import './style.scss';
```

## 결론

현재 `monorepo-playground/packages/design-system` 기준으로는 `tsconfig.node.json`의 `allowImportingTsExtensions`를 삭제해도 영향 범위가 설정 파일 두 개로 제한된다.

두 설정 파일이 `.ts` 또는 `.tsx` 확장자 import를 사용하지 않으므로 삭제해도 안전한 변경으로 판단된다. 삭제 후에는 `yarn check-types`, `yarn lint`, `yarn build`를 통과하는지 확인하면 된다.
