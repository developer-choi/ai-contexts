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

## 구현 분담

realize-plan에서 그 자리 실행하든 implement에서 하든, 설치·설정·위반 수정은 Lead가 직접 하지 않고 [team-agent](../../../../contexts/team-agent.md) 규칙으로 띄운 구현자 팀원이 한다.

- 사용자가 설정 결과를 고치려 하면 같은 구현자에게 되돌린다
- 룰셋·포맷 옵션 같은 설정값은 Lead가 사용자와 정해 넘긴다
- 계획에 없던 결정은 구현자가 혼자 정하지 않고 Lead에게 올린다
- 구현자는 도구별로 (설치+설정 → 커밋 → 위반 수정 → 커밋) 사이클을 반복한다
- 린트·포맷·타입 검사는 구현자가 돌리고 Lead는 통과 여부만 받는다(막혀서 멈췄을 때는 [축 A](../../impl-review-loop/SKILL.md#a-진실원천-충실도-non-null--매-증분-게이트)처럼 실패 내용을 받는다). 커밋 뒤 확인이나 리뷰 엔진 우회 판정을 하려고 Lead가 다시 돌리지 않는다
- lint-staged는 해당 시점에 설치된 도구만 참조한다
- 리뷰 엔진([impl-review-loop](../../impl-review-loop/SKILL.md))에 넘기는 진실검사 A는 정한 설정값이 설정 파일에 반영됐는지와 그 도구를 레포 전체에 돌려 0건인지이고, 증분 단위는 도구별 커밋이다
