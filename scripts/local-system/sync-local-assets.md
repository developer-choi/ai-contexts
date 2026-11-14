# sync-local-assets.mjs 사용법

`node scripts/local-system/sync-local-assets.mjs [<폴더>…]`: ai-contexts 레포 루트 기준 경로다. 보통은 `npm run sync:local-system`이 함수로 실행한다.

레포마다 `local/` 아래 폴더(`hooks`·`skills`·`contexts`·`agents` 제외)를 `.claude/<폴더>`로 복사한다. 내용이 바뀐 파일만 기록하고, 원본에서 사라진 파일은 지운다. 배포를 멈춘 폴더의 옛 사본(`.claude/contexts`)이 남아 있으면 통째로 지운다.

## 인자

- `<폴더>…` 훑을 자리. `~`로 시작하면 홈으로 푼다. 그 폴더가 git 레포(`.git`이 있음)면 그 레포 하나, 아니면 직속 하위 폴더 중 git 레포 전부. 하위 폴더 안쪽(`.claude/worktrees` 등)으로는 들어가지 않는다
- 생략하면 `~/WebstormProjects/main`·`~/WebstormProjects/my-else`

## 전제

실행 전에 AC git 훅 준비 상태를 확인한다. 고칠 수 있으면 전역 훅을 다시 등록하고, 못 고치면 사유(의존성이 없으면 `npm ci` 안내 포함)를 stderr에 내고 exit 1.

## 출력

`로컬 자산 동기화 결과` 아래 레포마다 `<홈 기준 경로> | <상태> | <내용>`. 대상이 없으면 `대상 레포 없음`.

- `synced` 기록하거나 지운 파일이 있다. 옛 사본을 지웠으면 내용 끝에 `removed .claude/<폴더>`가 더해진다
- `unchanged` 바뀐 것이 없다
- `skipped` 폴더가 없거나(`root not found`) 배포할 `local/` 폴더가 없다
- `failed` 복사 중 오류. 하나라도 있으면 exit 1
