# 패키징 / 매니페스트

## 패키지 매니저

- 글로벌 `yarn`은 classic만 깔린다 — Berry는 Corepack 또는 yarnpkg 공식 사이트로 설치
- Corepack은 Node에 기본 포함이지만 AWS 서버·CLI 별도 설치 등 다른 경로에선 빠질 수 있다
- `npm publish`는 scoped 패키지 첫 배포 시 `--access=public` 필요 (private이 기본이라 명시 안 하면 실패)

## package.json

- `type` / `module` 필드는 npm 공식 docs에 정의가 없다 — 비공식 확장으로 보일 수 있어 출처에 유의
- `exports` 필드를 지우면 빌드 결과물의 모든 파일을 외부에서 import 가능 — 라이브러리 공개 범위가 의도치 않게 넓어진다
- `peerDependencies` 버전 범위는 가능한 한 넓게, patch까지 고정 X — npm v7+에서 충돌 시 설치 실패

## 모노레포 / Workspaces

- 모노레포에서 빌드 산출물 대신 원본 소스를 사용하려면 Next.js의 `transpilePackages: ['@<org>/core']`를 활용 — 패키지 소스를 직접 트랜스파일
