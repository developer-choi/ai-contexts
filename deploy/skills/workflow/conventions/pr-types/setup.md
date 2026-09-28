# SETUP PR

경계: 빌드·린트·포맷 등 static checking 도구와 설정. 런타임 코드 없음. 적용 모드: 채용 (실무는 기존 정식 환경을 그대로 쓴다).

## 정식 구축 항목

**본 목록을 베이스로 후보를 도출한다**:

- 린트 (ESLint 룰·플러그인)
- 포맷 (Prettier + ignore)
- **커밋 컨벤션 강제** (commitlint + **commit-msg** 훅)
- **pre-commit 훅** (lint-staged)
- **훅 배선·배포** (git 설정 훅 + `prepare`가 부르는 레포 내 등록 스크립트 — `monorepo-playground/templates/recruitment/README.md`)
- tsconfig 강화
- 빌드·스타일링 (vite/next + scss/tailwind)
- 환경 일관성 (.editorconfig·.nvmrc 등)

위 값 중 폴더 구조에 기대는 것(경로 alias·import 경계 규칙 등)이 실제로 있으면 폴더 구조를 세우는 PR을 의존으로 적는다. 없으면 두 PR은 따로 출발한다.

## stub

deps·설정도 코드로 표현 가능한 계획이라 stub(또는 그 자리 실행) 대상이다 — "세팅 PR이라 stub 불필요"로 판정하지 않는다. 행동 결정이 없으면 `it.todo`는 면제 사유를 적고 0건으로 둔다.

다른 PR 범위 파일의 기존 위반을 파일 단위로 격리할 때는 [file-level(blanket) eslint-disable 라이프사이클](../artifact/comments.md#file-levelblanket-eslint-disable-라이프사이클)을 따른다.
