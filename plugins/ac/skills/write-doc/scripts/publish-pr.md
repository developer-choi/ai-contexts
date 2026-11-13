# publish-pr.mjs 사용법

`node <write-doc 스킬 폴더>/scripts/publish-pr.mjs <패키지.md> --pr <번호> [--repo owner/name] [--accept-residual] [--apply]`

확정한 `pr-body` 패키지를 GitHub PR의 제목·본문으로 게시한다. frontmatter를 떼고, 첫 H1을 제목으로, 나머지를 본문으로 쓴다.

- `--pr <번호>` 필수. 게시할 PR 번호
- `--repo owner/name` 빼면 현재 폴더의 레포
- `--apply` 줄 때만 `gh pr edit`을 실행한다. 없으면 미리보기만 낸다
- `--accept-residual` 사용자가 잔여 위반을 받아들인 글에 준다. 채점기 기계 적발 합계만 넘긴다

## 출력

stdout에 제목·본문 미리보기와 `채점기 기계 적발 합계: N건`을 낸다. `--apply`가 없으면 끝에 `미리보기다(…). 게시하려면 같은 명령에 --apply를 붙여 다시 실행한다.`가 붙는다.

## 게시하지 않고 멈출 때 (exit 1)

stderr에 `게시하지 않는다:`와 사유 목록을 낸다.

- 패키지 frontmatter `type`이 `pr-body`가 아니다. PR 코멘트 같은 다른 글은 이 스크립트로 올리지 않는다
- H1이 없다
- 채점기 기계 적발 합계가 0보다 크다 — 고치거나, 사용자가 잔여를 받아들였으면 `--accept-residual`
- 아래는 `--accept-residual`로도 못 넘긴다
  - `[//]: #` 주석 줄이 남았다(사용자에게 보이고 처리한 뒤 다시 실행한다), 줄 중간에 `[//]`가 남았다
  - 채점기가 PR 제목 기준이나 번호 참조 링크 깨짐을 적발했다
  - Claude Code 생성 표기 줄이 있다

`--apply`로 게시하면 `gh`의 종료 코드로 끝난다. 패키지 경로나 `--pr`이 없으면 사유와 이 문서 경로를 stderr에 내고 exit 1.

## 시험용 환경변수

`PUBLISH_PR_GH=<node 스크립트 경로>`를 주면 진짜 `gh` 대신 그 스크립트를 node로 실행한다.
