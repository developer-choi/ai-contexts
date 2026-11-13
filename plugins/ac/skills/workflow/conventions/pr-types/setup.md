# SETUP PR

경계: 빌드·린트·포맷·스타일링 등 개발 도구와 설정. 런타임 코드 없음. 적용 모드: 채용 (실무는 기존 정식 환경을 그대로 쓴다).

## 정식 구축 항목

이 PR이 구축할 항목은 아래 목록을 베이스로 고른다:

- 린트 (ESLint 룰·플러그인)
- 포맷 (Prettier + ignore)
- **커밋 컨벤션 강제** (commitlint + **commit-msg** 훅)
- **pre-commit 훅** (lint-staged)
- **훅 배선·배포** (git 설정 훅 + `prepare`가 부르는 레포 내 등록 스크립트 — MP `templates/recruitment/README.md`)
- tsconfig 강화
- 빌드·스타일링 (vite/next + scss/tailwind)
- 환경 일관성 (.editorconfig·.nvmrc 등)

위 항목의 설정값 중 폴더 구조에 의존하는 것(경로 alias·import 경계 규칙 등)이 실제로 있으면 폴더 구조를 세우는 PR을 의존으로 적는다. 없으면 두 PR은 따로 출발한다.

## 설정값과 격리

설치와 설정 적용은 IMPL이 한다 — 적용하는 순간 기존 위반이 걸려 stub 커밋의 lint·tsc 통과를 지킬 수 없다. 설정값(룰셋·포맷 옵션·tsconfig 옵션 등)은 사용자와 정해 implementation.md에 적는다. 행동 결정이 없으면 `it.todo`는 면제 사유를 적고 0건으로 둔다.

다른 PR 범위 파일(todo.md에 그 PR 절이 남아 있으면 그 절, plan이 소비했으면 그 PR의 overview.md 기준)의 기존 위반은 파일 단위로 격리해 넘기고, 어느 PR 범위에도 없는 파일의 위반은 이 PR에서 고친다.

- 린트는 [file-level(blanket) eslint-disable 라이프사이클](../artifact/comments.md#file-levelblanket-eslint-disable-라이프사이클)로 격리한다
- 포맷·타입 위반의 격리 방법은 Lead가 사용자와 정하고, 격리한 파일마다 담당 PR의 TODO로 `{파일}: 격리 해제 + 위반 수정`을 등록한다([PR별 TODO 등록처](../pr-split.md#pr별-todo-등록처))

## 구현 분담

설치·설정·위반 수정은 Lead가 한다.

- 계획에 없던 결정은 사용자에게 올린다
- 고른 항목별로 (설치+설정 → 커밋 → 위반 수정 → 커밋) 사이클을 반복한다
- 타입 검사에 영향을 주는 설정(tsconfig 등)은 설치+설정과 위반 수정을 한 커밋으로 묶는다 — 이후 점검이 커밋마다 타입 검사를 건다
- lint-staged는 해당 시점에 설치된 도구만 참조한다

[impl-review-loop](../../impl-review-loop/SKILL.md)에 넘기는 인자:

- 재료: 고른 항목 목록, implementation.md의 설정값, 위 「정식 구축 항목」과 격리 규칙이 짚은 문서
- 정답 대조 A
  - 정답 위치: implementation.md의 설정값 — 사용자가 정하고 승인한 값이라 정답으로 친다
  - 통과 기준: 설정 파일이 그 값과 맞는다. 그 커밋 단위까지 구축한 항목의 검사 도구(린트·포맷·타입)는 격리한 파일을 빼고 레포 전체에 돌려 0건이다. 훅(commit-msg·pre-commit)은 규칙을 어기는 커밋을 시도해 거부되는지 본다
  - 검증 메커니즘: 리뷰어 대조형(Reviewer는 [team-agent](../../../../contexts/team-agent.md) 규칙으로 띄운 sonnet 팀원 — 설정 파일을 정답과 기계적으로 대조하고 도구를 돌려 보는 일이다). Reviewer가 설정 파일을 정답과 대조하고, 검사 도구와 훅 확인도 직접 돌린다
  - 종료 커버리지: 고른 항목마다 커밋 단위가 있다
- 규칙검사 B: 비운다
- 커밋 단위: 위 사이클 한 바퀴(고른 항목 하나). A는 그 항목의 마지막 커밋 뒤에 판정한다
