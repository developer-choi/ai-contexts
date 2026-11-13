# clean-env-check.mjs 사용법

`node <workflow 스킬 폴더>/recruitment/clean-env/clean-env-check.mjs --github <owner/repo> [옵션]`
`node <workflow 스킬 폴더>/recruitment/clean-env/clean-env-check.mjs --zip <제출 zip 경로> [옵션]`

제출물을 빈 GitHub Actions 러너에서 설치→빌드→실행→홈페이지 응답까지 돌리고, 끝나면 임시 브랜치(`ci-check`)·run·secret·임시 레포를 지운다. Ctrl+C로 끊어도 지운다.

## 인자

`--github`·`--zip` 중 정확히 하나를 준다. 옵션은 모두 값을 하나 받는다.

- `--github <owner/repo>` 제출 레포를 clone해 `ci-check` 브랜치로 push한다. 그 레포에 push 권한이 있어야 한다
- `--zip <제출 zip 경로>` 내 계정에 비공개 임시 레포 `clean-env-<시각>`을 만들어 zip을 올린다. gh 토큰에 `delete_repo` scope가 있어야 한다(없으면 `gh auth refresh -s delete_repo`를 사용자에게 요청하라는 사유로 멈춘다)
- `--env-file <파일>` 메일로 따로 보낼 env 파일. 내용을 repo secret `ENV_LOCAL`로 넣고, 러너가 `--env-name` 이름의 파일로 써 준다
- `--env-name <이름>` 러너에 쓸 env 파일명. 기본 `.env.local`
- `--node <버전>` 기본 `24`
- `--port <포트>` 기본 `3000`

`gh`가 로그인돼 있어야 한다.

## 출력

진행은 stderr에 `[clean-env] …` 줄로 출력한다(`대상 <레포>`, `run <id> 대기`, `run 성공`·`run 실패`). run이 실패하면 실패 단계 로그 끝부분을 stdout에 출력한다.

정리 중 실패한 항목은 `[clean-env] 정리 실패 — <항목>: <사유>`로 출력한다. 흔적이 남았다는 줄이 나오면 그 항목을 사용자에게 그대로 보고하고, 손으로 지우지 않는다.

## 종료 코드

- `0` run 성공
- `1` run 실패
- `2` 절차 오류(인자·gh 권한·push·3분 안에 run 미등록 등). 인자 오류면 사유 뒤에 이 문서 경로가 붙는다
- `3` 정리 실패(흔적 남음)
- `130` 중단됐고 정리는 끝났다. 판정이 없으니 다시 돌린다
