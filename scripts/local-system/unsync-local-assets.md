# unsync-local-assets.mjs 사용법

`node scripts/local-system/unsync-local-assets.mjs [<폴더>…]`: ai-contexts 레포 루트 기준 경로다. 보통은 `npm run unsync:local-system`이 함수로 실행한다.

`sync-local-assets.mjs`가 만든 산출물을 레포마다 지운다. `local/` 아래 폴더(`hooks`·`skills`·`contexts` 제외)와 같은 이름의 `.claude/<폴더>`를 통째로 지우고, 원본 `local/`은 건드리지 않는다. 옛 `.claude/contexts` 사본은 sync가 지운다.

## 인자

- `<폴더>…` 훑을 자리. `~`로 시작하면 홈으로 푼다. 그 폴더가 git 레포(`.git`이 있음)면 그 레포 하나, 아니면 직속 하위 폴더 중 git 레포 전부
- 생략하면 `~/WebstormProjects/main`·`~/WebstormProjects/my-else`

## 출력

`로컬 자산 제거 결과` 아래 레포마다 `<홈 기준 경로> | <상태> | <내용>`. 대상이 없으면 `대상 레포 없음`.

- `removed` 지운 것 목록
- `skipped` 폴더가 없거나(`root not found`) 지울 산출물이 없다
- `failed` 지우다 오류. 하나라도 있으면 exit 1
