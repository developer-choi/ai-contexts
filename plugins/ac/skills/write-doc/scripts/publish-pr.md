# publish-pr.mjs 사용법

`node <write-doc 스킬 폴더>/scripts/publish-pr.mjs <패키지.md> [--pr <번호>] [--repo owner/name] [--accept-residual] [--apply]`

확정한 `pr-body` 패키지를 GitHub PR의 제목·본문으로 게시한다. frontmatter를 떼고, 첫 H1을 제목으로, 나머지를 본문으로 쓴다.

- `--pr <번호>` 게시할 PR 번호. `--apply`에 필수다. 빼면 검사만 돈다
- `--repo owner/name` 빼면 현재 폴더의 레포
- `--apply` 줄 때만 `gh pr edit`을 실행한다. 없으면 미리보기만 출력한다
- `--accept-residual` 사용자가 잔여 위반을 받아들인 글에 준다. 채점기 기계 적발 합계만 넘긴다

## 게시하지 않고 멈출 때 (exit 1)

사유 목록은 stderr에 출력한다.

- 패키지 frontmatter `type`이 `pr-body`가 아니다
- H1이 없다
- 채점기 기계 적발 합계가 0보다 크다. 고치거나, 사용자가 잔여를 받아들였으면 `--accept-residual`
- 아래는 `--accept-residual`로도 못 넘긴다
  - `[//]: #` 주석 줄이 남았다(사용자에게 보이고 처리한 뒤 다시 실행한다), 줄 중간에 `[//]`가 남았다
  - 채점기가 PR 제목 기준이나 번호 참조 링크 깨짐을 적발했다
  - Claude Code 생성 표기 줄이 있다
  - GitHub 렌더 API(`gh api markdown`)로 그린 본문에 `**`·`__`가 글자로 남았다(코드 안은 빼고 본다). 채점기는 원문만 읽어 이 꼴을 못 잡는다
  - 렌더 API 호출이 실패했다(gh 로그인·네트워크를 확인한다)

렌더 검사는 `--apply`가 없어도 돈다. 미리보기 단계에서 걸린 자리를 먼저 고치게 하려는 것이다.

`--apply`로 게시하면 `gh`의 종료 코드로 끝난다.
