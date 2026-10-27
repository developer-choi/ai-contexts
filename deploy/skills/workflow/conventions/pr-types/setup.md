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

## stub

deps·설정도 코드로 표현 가능한 계획이라 stub(또는 그 자리 실행) 대상이다. 행동 결정이 없으면 `it.todo`는 면제 사유를 적고 0건으로 둔다.

다른 PR 범위 파일(todo.md에 그 PR 절이 남아 있으면 그 절, plan이 소비했으면 그 PR의 overview.md 기준)의 기존 위반은 파일 단위로 격리해 넘기고, 어느 PR 범위에도 없는 파일의 위반은 이 PR에서 고친다.

- 린트는 [file-level(blanket) eslint-disable 라이프사이클](../artifact/comments.md#file-levelblanket-eslint-disable-라이프사이클)로 격리한다
- 포맷·타입 위반의 격리 방법은 Lead가 사용자와 정하고, 격리한 파일마다 담당 PR의 TODO로 `{파일}: 격리 해제 + 위반 수정`을 등록한다([PR별 TODO 등록처](../pr-split.md#pr별-todo-등록처))

## 구현 분담

설치·설정·위반 수정은 Lead가 직접 하지 않고 [team-agent](../../../../contexts/team-agent.md) 규칙으로 띄운 구현자 팀원(sonnet)이 한다.

- 사용자가 설정 결과를 고치려 하면 같은 구현자에게 되돌린다
- 룰셋·포맷 옵션 같은 설정값은 Lead가 사용자와 정하고, 정한 값은 설정 stub에 들어간다
- 계획에 없던 결정은 구현자가 Lead에게 올린다
- 구현자는 고른 항목별로 (설치+설정 → 커밋 → 위반 수정 → 커밋) 사이클을 반복한다
- 린트·포맷·타입 검사는 구현자가 돌리고 Lead는 통과 여부만 받는다(막혀서 멈췄을 때는 [정답 대조 A](../../impl-review-loop/SKILL.md#a-정답-대조-non-null--커밋-단위마다-통과-필요)처럼 실패 내용을 받는다). 커밋 뒤 확인을 하려고 Lead가 다시 돌리지 않는다
- lint-staged는 해당 시점에 설치된 도구만 참조한다

[impl-review-loop](../../impl-review-loop/SKILL.md)에 넘기는 인자:

- 재료: 고른 항목 목록, 설정 stub, 위 「정식 구축 항목」과 격리 규칙이 짚은 문서
- 정답 대조 A
  - 정답 위치: realize-plan이 커밋한 설정 stub
  - 통과 기준: 설정 파일이 stub의 값과 맞는다. 그 커밋 단위까지 구축한 항목의 검사 도구(린트·포맷·타입)는 격리한 파일을 빼고 레포 전체에 돌려 0건이다. 훅(commit-msg·pre-commit)은 규칙을 어기는 커밋을 시도해 거부되는지 본다
  - 검증 메커니즘: 리뷰어 대조형(Reviewer는 sonnet). Reviewer가 설정 파일을 정답과 대조하고, 검사 도구와 훅 확인도 직접 돌린다
  - 종료 커버리지: 고른 항목마다 커밋 단위가 있다
- 규칙검사 B: 비운다
- 커밋 단위: 위 사이클 한 바퀴(고른 항목 하나). A는 그 항목의 마지막 커밋 뒤에 판정한다
