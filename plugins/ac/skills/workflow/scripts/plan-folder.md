# plan-folder.mjs 사용법

`node <workflow 스킬 폴더>/scripts/plan-folder.mjs notice [<파일>]`
`node <workflow 스킬 폴더>/scripts/plan-folder.mjs left <plan 루트>`
`node <workflow 스킬 폴더>/scripts/plan-folder.mjs requirement-files <plan 루트>`

`<plan 루트>`는 보통 메인 레포의 `plan`, 개인 모드는 `plan/<접두어>`다.

## notice

consumable 산출물의 자가 정리 안내문 블록(`> 이 파일은 큐 모델로 운영됩니다.`로 시작)을 출력한다.

- 파일 없이 주면 블록을 stdout에 출력한다
- 파일을 넘기면 그 파일 맨 앞에 블록과 빈 줄을 붙이고 `안내문을 붙였다: <파일>`을 출력한다. 파일이 없으면 블록만 든 파일을 만든다
- 이미 안내문이 있으면 건드리지 않고 `이미 붙어 있다: <파일>`을 출력한다

exit 0.

## left

plan 루트 아래 경로에 `/consumable/`이 든 파일을 모두 출력한다.

- `[남은 consumable] N건` 아래 plan 루트 기준 경로. 남은 것이 아직 안 소비된 것인지 소비하고 안 지운 것인지는 호출한 쪽이 가른다
- `[안내문 누락] N건` 아래 안내문이 없는 md 경로

안내문 누락이 있으면 exit 1, 없으면 exit 0.

## requirement-files

requirement-review가 서브에이전트에 넘길 경로를 출력한다.

- `[requirement 산출물·원본] plan 루트: <plan 루트>`
- `[background]` 아래 `<plan 루트>/background` 아래 파일 전부(plan 루트 기준 경로)
- `[PR 폴더로 옮겨진 page.md] N건` 아래 `pr<N>/consumable/page.md`

`background` 폴더가 없으면 stderr에 알리고 exit 1.

## 인자 오류

명령이 없거나 모르는 명령이거나, `left`·`requirement-files`에 plan 루트가 없으면 사유와 이 문서 경로를 stderr에 내고 exit 1.
