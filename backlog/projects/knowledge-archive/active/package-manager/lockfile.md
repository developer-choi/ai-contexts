# lockfile

- lockfile 목적: 직접 설치 안 한 패키지가 `node_modules`에 들어간 이유(전이 의존성 출처)를 lockfile로 추적할 수 있는가
- `package.json`에 정확한 고정 버전 박을 때 단점 (왜 `^`/`~`인가)
- 동일 패키지가 다른 모듈에서 다른 범위로 요구될 때 호환 결정 메커니즘과 lockfile 기록
- References:
  - https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json
  - https://classic.yarnpkg.com/en/docs/package-json
