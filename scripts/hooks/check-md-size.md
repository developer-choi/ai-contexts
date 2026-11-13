# check-md-size.mjs 사용법

sync가 이 파일을 `~/.ai-contexts/check-md-size.mjs`로 복사하고 전역 git pre-commit 훅으로 등록한다. 아래 호출은 그 사본 기준이다. AC에서는 `node scripts/hooks/check-md-size.mjs …`도 같다.

- 잴 대상: 레포의 `CLAUDE.md`·`local/`·`deploy/` 아래 md와, 거기서 링크·`.md` 경로로 재귀로 닿는 md
- 선: SKILL.md 10000B, 닿는 곳이 4 이상이면 15000B, 아니면 20000B
- 기준선 목록(이미 넘은 파일)·제외 설정: `~/WebstormProjects/main/backlog/meta/md-size.json`

## 묻기 (읽기만 한다)

- `node ~/.ai-contexts/check-md-size.mjs --report <md 또는 폴더 경로>`
  - 선을 넘었는지와 무관하게 크기·선·닿는 곳 목록(직접/거쳐서)을 낸다. 폴더면 그 아래 `.md`마다
  - 크기는 작업 트리에서, 닿는 곳은 커밋 검사와 같은 계산(이 브랜치가 고친 파일은 git 인덱스, 안 건드린 파일은 기본 브랜치 끝)으로 잰다
  - 잴 대상 밖이면 `검사 대상 밖이다`, git 인덱스에 없으면 `잴 내용에 없다`를 낸다. CLAUDE.md면 자동 로드 범위를 함께 낸다
- `node ~/.ai-contexts/check-md-size.mjs --sections <md 경로>` — 절마다 시작 줄, 다음 헤딩 직전까지의 크기, 하위 절 포함 크기를 낸다
- `node ~/.ai-contexts/check-md-size.mjs --trace <md 경로>` — 그 md가 여는 문서 후보(링크·경로·`/스킬` 호출)를 줄마다, 이어서 대상별로 묶어 낸다
  - `지시?`는 그 줄에 읽기·실행 낱말이 있다는 표시다. 참고 링크인지는 읽는 쪽이 가른다

`--sections`·`--trace`는 디스크의 파일을 읽으므로 git 밖(옛 커밋을 풀어놓은 폴더 등)에서도 돈다.
`--sections --trace <md>`처럼 붙여 쓰면 둘 다 그 파일을 쓴다. `--report`와 함께 주면 `--report`를 먼저 낸다.
`--report`·`--trace`는 끝에 `한계:` 줄(못 잡는 참조)을 낸다.

## 기준선 목록 고치기 (설정 파일을 쓴다)

현재 폴더의 레포를 대상으로 한다. backlog 레포가 없는 기기에서는 실패한다.

- `node ~/.ai-contexts/check-md-size.mjs --write-baseline` — 지금 선을 넘은 파일 전부를 「크기 × 닿는 곳」 순으로 목록에 다시 쓴다. 사람이 적은 `exclude`는 그대로 둔다
- `node ~/.ai-contexts/check-md-size.mjs --settle` — 목록에 있는 파일 중 선 아래로 내려왔거나 잴 대상에서 빠진 줄을 걷는다

## 커밋 검사 (인자 없음)

`node ~/.ai-contexts/check-md-size.mjs` — pre-commit 훅으로 도는 모드다. backlog가 없으면 아무것도 안 한다.

- `[문서 크기] 선을 새로 넘은 …`·`이미 선을 넘은 md가 더 커졌다`·`선 아래로 내려왔거나 …`
  - 그 아래 안내 줄이 커밋하는 쪽에게 할 일을 시킨다(하던 작업을 마친 뒤 사용자에게 알림, `--write-baseline`·`--settle` 실행 등)
- `[문서 크기] 미등재 초과 N건 (알림 완료)` — 이미 알린, 목록에 없는 초과분이다. 한 줄만 낸다
- 같은 크기는 기기마다 한 번만 알린다(`~/.ai-contexts/md-size-seen.json`)

## exit code

- 커밋 검사는 늘 0이다. 내부 오류도 `[문서 크기 훅 내부 오류, 건너뜀]`만 찍고 0
- `--report`·`--sections`·`--trace` 뒤에 경로가 없으면 사유와 이 문서 위치를 stderr에 내고 1
- 파일이 없거나(`파일이 없다`), git 레포 밖이거나(`--report`만), 폴더 아래 md가 없어도 1
- `--write-baseline`·`--settle`이 git 레포 밖이거나 설정 파일을 못 열면 1
