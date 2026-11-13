# archive-repo.mjs 사용법

`node <workflow 스킬 폴더>/recruitment/scripts/archive-repo.mjs <하위 명령> <대상 폴더> [인자]`

채용과제 보관용 아카이브 레포를 뜬다. 하위 명령은 아래 순서로 돌린다.

1. `collect <작업폴더>`
2. `create <작업폴더> <아카이브 이름> [--remote-url <url>]`
3. 출력된 `git remote -v`를 사용자가 확인한다
4. `push <복사본>`
5. `relink <복사본> [<파일>...]`
6. `recreate-prs <복사본> [--title <번호>=<제목>]... [--allow-number-gaps]`

`<작업폴더>`는 브랜치 전부가 든 원본 저장소 폴더, `<복사본>`은 `create`가 만든 폴더다. `gh`가 로그인돼 있어야 한다. 실패는 모두 사유를 stderr에 내고 exit 1.

## collect

origin(GitHub 제출 레포)의 PR을 상태와 무관하게 모두 회수한다.

- PR 본문을 `<작업폴더>/plan/archive/pr<N>.md`에, 번호·제목·상태·base/head 브랜치와 커밋을 `plan/archive/prs.json`에 기록한다
- PR head를 `refs/archive-pr/<N>`으로 받아 오고, PR마다 base·head 커밋이 로컬에 있는지 본다
- 출력: `[회수] <owner/repo> PR N건 → plan/archive/` 아래 PR마다 `#번호 상태 head 제목`

origin이 GitHub 레포가 아니거나, PR이 없거나, 커밋을 못 받아 오면 멈춘다.

## create

`<아카이브 이름>`은 `<작업폴더>` 바로 뒤에 준다. 꼴은 `recruitment-{slug}-{YYYYMMDD}`이고 slug는 영문 소문자·숫자·하이픈이다(한글 회사명은 로마자로).

- `<작업폴더>`와 같은 부모 폴더에 `<아카이브 이름>` 폴더로 복사한다. git이 추적하지 않는 재생성 폴더(`node_modules`·`.next`·`dist`·`build`·`out`·`.turbo`·`.vite`·`coverage`)는 뺀다
- 복사 전에 작업폴더와 그 워크트리를 붙잡은 프로세스(띄워 둔 서버 등)를 끈다
- 복사본의 origin을 새 레포로 바꾼다. `--remote-url`이 없으면 내 계정에 비공개 레포 `<아카이브 이름>`을 만들어 사용한다. 있으면 그 URL을 사용하고 레포를 만들지 않는다
- 출력: `[서버]`, `[복사] <복사본 경로>`와 뺀 폴더, `[원격]` 아래 `git remote -v`, 그리고 멈추라는 안내 줄. 안내 줄은 호출한 세션에게 origin이 새 아카이브 레포인지 사용자 확인을 받은 뒤 `push`, 그다음 `relink`를 돌리라고 시킨다

작업폴더가 워크트리이거나 git 저장소가 아닐 때, `collect` 산출물이 없을 때, 이름 꼴이 틀릴 때, 복사 대상 폴더나 같은 이름의 GitHub 레포가 이미 있을 때, 끈 뒤에도 프로세스가 남을 때 멈춘다.

## push

복사본의 브랜치·태그를 origin에 모두 올린다. 출력: `[push] <origin>` 아래 브랜치 목록.

`push`·`relink`·`recreate-prs`는 먼저 origin을 본다. `plan/archive/prs.json`이 없거나, origin이 없거나, 아직 제출 레포를 가리키거나, origin URL에 복사본 폴더 이름이 없으면 멈춘다.

## relink

회수한 PR 본문 파일과, 넘긴 `<파일>`들의 제출 레포 링크(`https://github.com/<제출 레포>`)를 아카이브 레포 링크로 바꾼다. `<파일>`은 복사본 기준 경로이고, `<복사본>` 뒤의 인자는 모두 파일로 받는다.

- 출력: 파일마다 `[치환] <파일> N건`
- 바꾼 뒤 `check-submission.mjs pr-body … --submit-remote`로 다시 보고, 제출 레포 링크가 남은 파일이 있으면 그 출력을 내고 멈춘다
- 끝 안내 줄: 바뀐 파일 중 추적되는 것(README 등)은 기본 브랜치에 커밋하고 `push`를 다시 돌린 뒤 `recreate-prs`를 돌린다

origin이 GitHub 레포가 아니면 멈춘다.

## recreate-prs

회수한 PR을 아카이브 레포에 같은 번호로 다시 만들고 닫는다. 본문은 회수 파일 그대로다.

- `--title <번호>=<제목>` 그 번호의 PR 제목을 바꾼다. 여러 번 줄 수 있다
- `--allow-number-gaps` 제출 레포 PR 번호가 1부터 이어지지 않아도 시작 전 검사를 넘긴다. 다만 PR을 만들다 아카이브 번호가 원본과 달라지는 첫 PR에서 멈춘다(그 앞 PR은 이미 만들어 닫힌 채 남는다)
- 앞 PR head 위에 쌓인 PR은 스택으로 복원하고, 아니면 게시 당시 base 커밋으로 base 브랜치를 만든다(첫 PR은 `starter`, 그 뒤는 `pr<N>-base`). 원격에 같은 이름이 다른 커밋으로 있으면 base는 `pr<N>-base-<커밋 앞 7자>`, head는 `pr<N>/<원래 head 이름>`을 사용한다
- 출력: `[PR 재생성] <owner/repo>` 아래 PR마다 `#번호 base <- head 일치` 또는 `불일치: head·base·body·closed 중 어긋난 것`

아카이브 레포에 이슈·PR이 이미 있거나, origin이 GitHub 레포가 아니거나, 불일치가 하나라도 있으면 멈춘다.

## 인자 오류

하위 명령이 없거나 위 다섯이 아니거나, 대상 폴더 인자가 없으면 사유와 이 문서 경로를 stderr에 내고 exit 1. 대상 폴더가 존재하지 않으면 `대상이 없다: <경로>`로 exit 1.
