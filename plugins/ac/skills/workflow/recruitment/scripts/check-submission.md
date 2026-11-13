# check-submission.mjs 사용법

`node <workflow 스킬 폴더>/recruitment/scripts/check-submission.mjs time-pressure <디렉토리>`
`node <workflow 스킬 폴더>/recruitment/scripts/check-submission.mjs submission <레포 경로>`
`node <workflow 스킬 폴더>/recruitment/scripts/check-submission.mjs pr-body <본문.md> [--submit-remote <제출 레포 URL>] [--check-urls]`

걸린 줄을 어떻게 고칠지는 호출한 쪽이 정한다. `pr-body`·`submission`은 걸린 것이 있으면 출력 끝에 사유 목록을 stderr로 내고 exit 1.

## time-pressure

`<디렉토리>`는 원본 자료를 저장한 폴더다(보통 `plan/background/persistent`). 그 아래 md·txt를 훑어 시간 압박 정보 후보를 출력한다.

- 걸린 줄마다 `<파일>:<줄> [종류] 내용`. 종류는 넷이다
  - `기한·마감`
  - `시간 압박 표현`: 같은 줄에 제출·마감 맥락이 있을 때만
  - `메일 수신 일자`
  - `메일 타임스탬프`: 파일 이름에 mail·메일·메시지가 든 파일만
- 끝에 `[시간 압박 정보] N개 파일에서 N건`, 걸린 것이 있으면 지울지는 사람이 정한다는 안내 줄

후보일 뿐이라 걸려도 exit 0.

## submission

`<레포 경로>`는 제출할 작업 레포 루트다. git이 추적하는 파일 중 섞이면 안 되는 것을 센다.

- `[환경변수 파일] N건`: `.env`·`.env.*`. `.example`·`.sample`·`.template`·`.dist`로 끝나는 견본은 뺀다
- `[AI 산출물] N건`: 레포 루트의 `plan/` 아래
- 끝에 `추적 파일 N개 기준. 빌드 통과 여부는 별도로 확인한다.`

`git ls-files`가 실패하면 exit 1.

## pr-body

`<본문.md>`는 점검할 PR 본문·README 파일이다.

- `[플레이스홀더 잔존] N건`: `[…이미지…]`·`[스크린샷…]`·`[TODO…]`처럼 대괄호 안에 캡처 전 임시 낱말이 있고 뒤에 `(`·`[`가 없는 줄
- `[내부 문서 링크] N건`: `http`로 시작하지 않는 `docs/….md` 링크
- `--submit-remote <제출 레포 URL>` 주면 `[제출 레포를 가리키는 링크] N건`도 출력한다. 값은 `github.com/owner/repo` 꼴이고 대소문자를 안 가린다
- `--check-urls` 주면 본문의 http(s) 이미지·링크마다 HEAD 요청을 보내 `OK`·`깨짐`을 출력한다

## 인자 오류

하위 명령이 위 셋이 아니거나 대상이 없으면 사유와 이 문서 경로를 stderr에 내고 exit 1.
