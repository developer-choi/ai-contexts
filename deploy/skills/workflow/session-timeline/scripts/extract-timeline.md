# extract-timeline.mjs 사용법

`node <workflow 스킬 폴더>/session-timeline/scripts/extract-timeline.mjs --list <cwd 경로> [--tz <IANA 타임존>]`
`node <workflow 스킬 폴더>/session-timeline/scripts/extract-timeline.mjs <session.jsonl> [--out <파일>] [--tz <IANA 타임존>]`

`--tz` 기본값은 `Asia/Seoul`이다. 시각은 그 타임존의 `M/DD HH:MM`으로 찍는다.

## --list

그 cwd의 세션 로그 폴더(`~/.claude/projects/<cwd의 영숫자 아닌 글자를 -로 바꾼 이름>`)에 있는 jsonl을 시작 시각 순으로 출력한다. 세션마다 파일 이름, `시작 ~ 종료 (N분) · N블록`, `첫 발화: …`(사용자 첫 발화 60자)를 출력한다. 발화가 없는 세션은 `(발화 0건)`으로만 출력한다.

폴더가 없으면 그 경로와 슬러그를 stderr에 내고 exit 1. 있으면 exit 0. `--list`를 넘기면 jsonl 인자는 무시한다.

## 타임라인 뽑기

jsonl을 평면 타임라인 md로 바꾼다. 블록마다 `**M/DD HH:MM · 화자**` 헤더, 본문, `---` 구분선이다. 화자는 `사용자`·`AI`·`시스템`이다. 입력창 재전송을 합친 사용자 블록은 헤더 뒤에 `(입력 수정 ×N)`이 붙는다.

- `--out`이 있으면 그 파일에 기록하고, 없으면 stdout에 출력한다
- 어느 쪽이든 stderr에 `blocks=N 사용자=N AI=N 시스템=N` 한 줄을 출력한다. 후처리 단계가 보존을 검증할 기준선이다

## 인자 오류

jsonl 경로와 `--list`가 모두 없으면 사유와 이 문서 경로를 stderr에 내고 exit 1.
