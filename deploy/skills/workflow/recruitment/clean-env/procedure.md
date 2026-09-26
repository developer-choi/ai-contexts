# 클린 환경 실행 확인 — 절차

리뷰어가 받는 것만 든 빈 머신(GitHub Actions `ubuntu-latest`)에서 설치→빌드→실행→홈페이지 응답까지 돌린다.

- node 버전·포트는 과제 README에 명시가 있으면 그 값으로 워크플로를 고친다. 없으면 24 / 3000

## GitHub 제출

collaborator 초대 **전에** 돌린다. 초대 뒤에 돌리면 리뷰어가 Actions 탭에서 run 기록을 본다.

1. 제출 레포를 스크래치 폴더에 새로 클론하고 `ci-check` 브랜치를 판다 — 작업 폴더에서 하지 않는다
2. [github.yml](github.yml)을 `.github/workflows/clean-install.yml`로 얹어 커밋·push
3. push 직후엔 run이 아직 등록 전일 수 있다. `gh run list -b ci-check -L 1 --json databaseId,headSha`를 `headSha`가 방금 push한 커밋과 같아질 때까지 다시 조회하고, 그 id로 `gh run watch <id> --exit-status`
4. 정리 — 브랜치·run·secret(넣었으면)을 지운다
   - `git push origin --delete ci-check`
   - `gh run list -b ci-check --json databaseId -q '.[].databaseId'`의 run마다 `gh run delete` (브랜치를 지워도 run은 남는다)
   - `gh secret delete ENV_LOCAL`

## zip 제출

제출할 zip **파일 그대로**를 임시 private 레포에 올리고 러너 안에서 푼다. zip을 풀어 그 내용을 커밋하는 방식은 쓰지 않는다 — `git add`가 zip 안의 `.gitignore`를 적용해, zip엔 들었지만 무시 대상인 파일이 리뷰어가 받는 것과 달리 빠진다.

1. 스크래치 폴더에 제출할 zip을 `submission.zip`으로 두고 [zip.yml](zip.yml)을 `.github/workflows/clean-install.yml`로 얹는다. zip 최상위에 `package.json`이 없고 폴더 하나로 감싸져 있으면 워크플로의 `working-directory`를 `app/<그 폴더>`로 고친다
2. `gh repo create <임시이름> --private` → 그 레포에 push → 위 3번처럼 watch
3. `gh repo delete <임시이름> --yes` — `gh` 토큰에 `delete_repo` scope가 없으면 사용자에게 `gh auth refresh -s delete_repo`를 요청한다

## 환경변수가 필요한 과제

메일로 따로 보낼 값을 그 파일 내용 그대로 repo secret `ENV_LOCAL`에 넣는다(`gh secret set ENV_LOCAL --body-file <파일>`). 워크플로가 그 값을 `.env.local`로 써 준 뒤 돌리므로, "메일로 받은 파일만 넣으면 돈다"를 재현한다. 메일로 보낼 파일명이 `.env.local`이 아니면(Vite의 `.env` 등) 워크플로의 `.env.local`을 그 이름으로 고친다.
