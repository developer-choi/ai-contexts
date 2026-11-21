# check-md-size.mjs 사용법

`sync:environment`가 같은 폴더의 `check-md-size.mjs`를 `~/.ai-contexts/`로 복사하고 전역 git pre-commit 훅으로 등록한다.
아래 호출은 그 사본 기준이다. 단 `--report`·`--sections`·`--trace`의 대상이 AC 체크아웃(워크트리 포함) 안이면 사본이 그 체크아웃의 같은 스크립트로 넘겨 돌린다.
AC에서는 `node scripts/hooks/check-md-size.mjs …`도 같다.

기준선 목록(이미 선을 넘은 파일)·제외 설정은 `~/WebstormProjects/main/backlog/meta/md-size.json`에 있다.

## 묻기 (읽기만 한다)

- `node ~/.ai-contexts/check-md-size.mjs --report <md 또는 폴더 경로>`: 크기·선·닿는 곳. 폴더면 그 아래 `.md`마다
- `node ~/.ai-contexts/check-md-size.mjs --sections <md 경로>`: 절마다의 크기
- `node ~/.ai-contexts/check-md-size.mjs --trace <md 경로>`: 그 md가 여는 문서 후보

`--sections`·`--trace`는 디스크의 파일을 읽으므로 git 밖에서도 돈다.
`--sections --trace <md>`처럼 붙여 주면 둘 다 그 파일을 대상으로 한다. `--report`와 함께 주면 `--report`를 먼저 출력한다.

## 기준선 목록 고치기 (설정 파일을 쓴다)

현재 폴더의 레포를 대상으로 한다. backlog 레포가 없는 기기에서는 실패한다.
이 브랜치에서 고친 파일은 git 인덱스(`git add`된 내용), 안 건드린 파일은 기본 브랜치 끝 기준으로 측정한다.

- `node ~/.ai-contexts/check-md-size.mjs --write-baseline`: 지금 선을 넘은 파일 전부를 목록에 다시 적는다. 사람이 적은 `exclude`는 그대로 둔다
- `node ~/.ai-contexts/check-md-size.mjs --settle`: 목록에서 선 아래로 내려왔거나 측정 대상에서 빠진 줄을 걷는다

## 커밋 훅 (인자 없음)

설정 파일이 없거나 못 읽으면 건너뛴다. 출력이 할 일을 알려 준다. 상세 알림은 같은 크기에 기기마다 한 번만 출력하고(기준선 목록에 없는 초과분은 목록에 올리기 전까지 요약 한 줄이 남는다), 알린 기록은 `~/.ai-contexts/md-size-seen.json`에 있다.

## exit code

- 커밋 훅은 늘 0이다
- `--report`·`--sections`·`--trace` 뒤에 경로가 없으면 사유와 이 문서 위치를 stderr에 내고 1
- 파일이 없거나, git 레포 밖이거나(`--report`만), 폴더 아래 md가 없어도 1
- `--write-baseline`·`--settle`이 git 레포 밖이거나 설정 파일을 못 열면 1
- AC 체크아웃 위임 실행이 실패하면 `체크아웃의 <경로>를 실행하지 못했다: <사유>`를 stderr에 찍고 1
- 그 밖의 내부 오류는 어느 모드든 `[문서 크기 훅 내부 오류, 건너뜀]`을 stderr에 찍고 0
