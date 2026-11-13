# review-ledger.mjs 사용법

`node <workflow 스킬 폴더>/scripts/review-ledger.mjs pending --plan <plan 루트>`
`node <workflow 스킬 폴더>/scripts/review-ledger.mjs mark --plan <plan 루트> <파일>...`

BG 산출물 중 사용자가 아직 리뷰하지 않은 것을 뽑고, 리뷰를 마친 파일을 기록한다. 기록은 `<plan 루트>/background/.reviewed/`(`ledger.json`과 리뷰 시점 사본)에 둔다.

볼 대상은 `<plan 루트>/background/` 아래 파일 전부(`persistent/`·`.reviewed/` 제외)와 `<plan 루트>/pr<N>/consumable/page.md`다. 같음은 경로가 아니라 내용으로 가린다. 리뷰한 내용과 같은 파일은 다른 경로로 옮겨져도 다시 뽑지 않는다.

## pending

- 리뷰할 것이 없으면 `[리뷰할 것 없음]`을 내고 exit 0
- 있으면 아래를 내고 exit 1
  - `[새 파일] N건 — 전체를 리뷰받는다` 아래 plan 루트 기준 경로
  - `[리뷰 뒤 바뀐 파일] N건 — 아래 바뀐 줄만 리뷰받는다` 아래 경로와 바뀐 줄(`- 옛 줄`·`+ 새 줄`)

## mark

`<파일>`은 plan 루트 기준 상대경로이고 하나 이상 준다. 파일마다 지금 내용을 리뷰 완료로 기록하고 `리뷰 완료로 기록: <경로>`를 출력한다. 없는 파일이 있으면 `없는 파일: <경로>`를 stderr에 내고 exit 1(그 앞 파일은 기록되지 않는다).

## 인자 오류

명령이 `pending`·`mark`가 아니거나, `--plan`이 없거나, `mark`에 파일이 없으면 사유와 이 문서 경로를 stderr에 내고 exit 1.
