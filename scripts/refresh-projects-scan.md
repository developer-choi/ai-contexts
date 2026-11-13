# refresh-projects-scan.mjs 사용법

`/refresh-projects` 회차의 기계 점검을 낸다. 경로는 ai-contexts 레포 루트 기준이다. 대상 프로젝트와 워크트리 정리 대상은 `.claude/skills/refresh-projects/SKILL.md`의 표(첫 열 머리가 `약어`인 표, `정리 대상 루트`인 표)에서 읽는다.

## 회차 점검 (기본 모드)

`node scripts/refresh-projects-scan.mjs [--at <약어>=<워크트리>]… [--state <path>] [--skill <path>]`

읽기만 한다(fetch도 안 한다).

- `--at <약어>=<워크트리>` 그 프로젝트를 레지스트리 표의 경로 대신 이 폴더에서 본다. Phase 0이 만든 회차 워크트리를 프로젝트마다 준다. 여러 번 줄 수 있다
- `--state <path>` 프로젝트별 직전 최신화 해시. 기본 `~/WebstormProjects/main/backlog/refresh-projects/state.json`
- `--skill <path>` 표를 읽을 SKILL.md. 기본은 위 SKILL.md

출력 `[Phase 1 · 커밋 탐색]`은 프로젝트마다 한 줄이다.

- `⚠ 회차 워크트리를 안 준 프로젝트` — `--at`이 빠진 프로젝트다. 다시 실행할 때 준다
- `경로 없음`·`state.json 엔트리 없음`(초기 해시 정하는 기준이 따라 나온다)
- `orphan 해시 … — …` 뒤의 안내대로 직전 최신화 지점을 다시 찾는다
- `변경 없음 — Phase 3~4 스킵` 또는 `커밋 N건 · 파일 M개 (<해시>..HEAD)`와 커밋 5건까지

출력 `[짝꿍 드리프트 후보] N건`은 바뀐 프로젝트의 `meta/coupling.json` 그룹 중 일부 파일만 움직인 것이다. 그룹마다 움직임·안 움직임·note를 내고, 진짜 드리프트인지는 note를 읽고 정한다.

exit 0.

## 안 쓰는 워크트리·브랜치 표

`node scripts/refresh-projects-scan.mjs --worktrees [--at <약어>=<워크트리>]… [--backlog <path>] [--skill <path>]`

정리 대상 루트 아래 레포마다 `git fetch --prune`을 한 뒤 후보 표만 낸다. 지우지 않는다.

- `--at`으로 준 워크트리는 후보에서 뺀다
- `--backlog <path>` 「백로그가 가리킴」 칸을 채울 때 뒤질 backlog 레포. 기본 `~/WebstormProjects/main/backlog`
- 종류는 `워크트리`·`기록만(prunable)`(폴더 없이 git 기록만)·`폴더만`(git 기록 없이 폴더만)·`브랜치만`(어느 워크트리에도 안 물린 로컬 브랜치)
- 지울지는 사용자가 고른다. 고른 행의 「지정값」 칸을 `--remove`에 넘긴다

「정리 대상 루트」 표를 못 찾으면 stderr에 사유를 내고 exit 1. 아니면 exit 0.

## 고른 것 지우기

`node scripts/refresh-projects-scan.mjs --remove <지정값>… [--force]`

- 지정값은 `--worktrees` 표의 「지정값」 칸 그대로다. `--remove a b`와 `--remove a --remove b` 둘 다 받는다
- `--worktrees`와 함께 주면 지우기만 한다
- 미커밋이 있는 워크트리는 `--force`일 때만 지운다
- 그 경로를 잡은 프로세스를 먼저 끄고, `git worktree remove`, 남은 폴더 삭제, `git branch -D` 순서로 지운다. 원격 브랜치는 건드리지 않는다

출력 첫 줄 `[워크트리·브랜치 삭제] 성공/전체건 완료`, 그 아래 `✓ <지정값>` 또는 `✗ <지정값> — <사유>`. ✗는 완료가 아니다.

- 지정값이 없으면 사유와 이 문서 경로를 stderr에 내고 exit 1
- 표에 없는 지정값이 하나라도 있으면 아무것도 안 지우고 exit 1
- ✗가 하나라도 있으면 exit 1
