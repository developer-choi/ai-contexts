# 클린 환경 실행 확인 — 절차

리뷰어가 받는 것만 든 빈 머신(GitHub Actions `ubuntu-latest`)에서 설치→빌드→실행→홈페이지 응답까지 돌린다. 생성·push·run 대기·정리는 스크립트가 한 번에 하므로 `gh`·`git`으로 단계를 손으로 밟지 않는다.

```
node {{skill_dir}}/recruitment/clean-env/clean-env-check.mjs --github <owner/repo> | --zip <제출 zip> [--env-file <파일>] [--env-name <이름>] [--node <버전>] [--port <포트>]
```

종료 코드 0이면 통과, 1이면 run 실패(실패 로그가 stdout에 나온다), 2는 절차 오류다. 임시 브랜치·run·secret·임시 레포는 스크립트가 지운다. 3이면 그 정리가 실패한 것이라, stderr의 정리 실패 항목을 사용자에게 그대로 보고하고 손으로 지우지 않는다.

호출 전에 정할 것:

- **GitHub 제출은 collaborator 초대 전에** 돌린다 — 도는 동안 임시 브랜치·run이 리뷰어에게 보인다. 이미 초대했으면 사용자에게 알리고 진행 여부를 묻는다
- **zip 제출은 제출할 zip 파일 그대로**를 넘긴다. 풀어서 넘기지 않는다 — 풀어 커밋하면 zip 안의 `.gitignore`가 적용돼, zip엔 들었지만 무시 대상인 파일이 리뷰어가 받는 것과 달리 빠진다
- **node 버전·포트**는 과제 README에 명시가 있으면 `--node`·`--port`로 넘긴다. 없으면 기본 24 / 3000
- **환경변수가 필요한 과제**는 메일로 따로 보낼 파일을 `--env-file`로 넘긴다. 러너가 그 내용을 `.env.local`로 써 준 뒤 돌리므로 "메일로 받은 파일만 넣으면 돈다"를 재현한다. 메일로 보낼 파일명이 `.env.local`이 아니면(Vite의 `.env` 등) `--env-name`으로 그 이름을 준다
- zip 제출에서 종료 코드 2에 `delete_repo` scope가 없다는 메시지가 나오면 사용자에게 `gh auth refresh -s delete_repo`를 요청한다. 레포를 만들기 전에 멈추므로 남은 것은 없다
