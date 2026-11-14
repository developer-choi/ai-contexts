# repo-sync.mjs 사용법

스캔 루트 바로 아래 git 레포(워크트리 포함)를 origin과 양방향 동기화한다. 경로는 ai-contexts 레포 루트 기준이다. 실제로 fetch·commit·push·merge를 하므로 인자 없이 실행해도 동기화가 일어난다.

## 호출

- `node scripts/repo-sync.mjs` — 전 레포 순회
  - 스캔 루트는 `~/WebstormProjects/main`·`~/WebstormProjects/my-else`·`~/WebstormProjects/simplify`
  - 순회를 마치면 `sync:environment` → `sync:system`을 이 순서로 이어서 돌린다(앞이 실패해도 뒤를 돌린다)
- `node scripts/repo-sync.mjs --wip <레포경로> --message "<커밋 메시지>"` — 그 레포 하나만 미커밋을 이 메시지로 커밋하고 이어서 동기화한다. 배포는 안 돌린다. 순회 출력의 `[WIP 커밋 필요]` 아래 줄을 메시지만 채워 실행한다
- `--json` 표 대신 행 배열 JSON을 stdout에 낸다. 배포 출력은 stderr로 간다
- `--root <dir>[,<dir>…]` 스캔 루트를 바꾼다. 배포는 안 돌린다. 픽스처로 판정을 검증할 때만 쓴다 — 실제 레포에 대면 검증이 곧 push라 되돌릴 수 없다

## 레포별 처리

보호 브랜치는 `master`·`main`·`develop`·`release`·`release/…`다.

- 일반 브랜치에 미커밋이 있으면 먼저 커밋해야 한다. `--wip` 메시지가 없으면 손대지 않고 `wip-needed (N건)`로 낸다
- 원격에 없는 일반 브랜치는 `push --set-upstream`한다
- behind만 있으면 ff merge한다. 보호 브랜치의 미커밋은 stash했다가 pop한다
- ahead만 있으면 일반 브랜치는 push, 보호 브랜치는 push하지 않고 `blocked`로 낸다
- 현재 브랜치가 아닌 보호 브랜치는 체크아웃 없이 ff한다(다른 워크트리가 체크아웃 중이면 건너뜀)

## 출력 (표)

`레포  브랜치  상태` 표. `|` 뒤는 다른 보호 브랜치의 `ff +N`·`ff 불가`다. 상태는 아래 중 하나다.

- `up-to-date`·`pulled +N`·`pushed +N`·`wip-pushed +N`
- `wip-needed (N건)`·`dirty`(보호 브랜치 미커밋)
- `blocked: …`·`failed: …`·`stash-conflict: …`
- `skipped: no origin`·`skipped: detached HEAD`

표 아래 블록은 읽는 쪽이 할 일이다.

- `[WIP 커밋 필요]` 레포마다 변경 목록과 `--wip` 실행 줄. 메시지를 정해 실행한다
- `[사용자 조치 필요] N건` `blocked`·`failed`·`dirty`·`stash-conflict`·`ff 불가` 행의 수. 레포별 추천 액션은 읽는 쪽이 정한다
- `[사용자 조치 필요] 배포 실패 N건` 실패한 배포 단계와 `npm run <단계>` 재실행 안내
- `[stash 남음]` 이 회차가 만든 stash가 pop 안 된 채 남은 레포

## exit code

- 배포 단계가 하나라도 실패하면 1, 아니면 0. 레포 행이 `failed`·`blocked`여도 exit code는 바뀌지 않는다
- `--wip`에 `--message`가 없으면 아무것도 안 하고 사유와 이 문서 경로를 stderr에 내고 1
