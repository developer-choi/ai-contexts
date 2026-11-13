# inspect-blocks.mjs 사용법

`node <workflow 스킬 폴더>/session-timeline/scripts/inspect-blocks.mjs <타임라인.md> [--over <글자 수>] [--against <원본.md>]`
`node <workflow 스킬 폴더>/session-timeline/scripts/inspect-blocks.mjs <타임라인.md> --stamps`

타임라인 md의 블록(`**M/DD HH:MM · 사용자|AI|시스템**` 헤더 + 다음 헤더 전까지의 본문)을 읽는다. 블록 길이는 본문 글자 수이고 `---` 구분선과 `## ` 헤딩 줄은 세지 않는다.

블록 이름은 시각이고, 같은 분의 두 번째 블록부터 ` #n`이 붙는다(`8/16 15:31 #2`). `insert-headings.mjs`의 구간 `start`가 이 이름을 받는다.

## 출력

- `--stamps` 블록마다 `<이름> · <화자> (N자)`를 내고 exit 0. 다른 옵션은 보지 않는다
- 그 밖에는 먼저 `blocks=N 사용자=N AI=N 시스템=N`을 출력한다
- `--over <글자 수>` `[N자 초과 AI 블록] N건 — 치환 대상` 아래 그 길이를 넘는 AI 블록의 이름과 길이
- `--against <원본.md>` 원본과 블록 헤더(시각·화자) 열을 순서까지 대조한다. `[보존 대조] 기준 N블록 vs 현재 N블록` 아래 `차이 없음`, 또는 사라진 블록·늘어난 블록 목록. 차이가 있으면 exit 1. 자리가 바뀐 블록은 사라진 쪽과 늘어난 쪽에 함께 찍힌다

`--over`와 `--against`는 함께 줄 수 있다.

## 인자 오류

타임라인 md 경로가 없으면 사유와 이 문서 경로를 stderr에 내고 exit 1.
