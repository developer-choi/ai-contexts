# check-pr-comments.mjs 사용법

`node <workflow 스킬 폴더>/scripts/check-pr-comments.mjs --base <기준 ref> [--plan <plan 루트>]`
`node <workflow 스킬 폴더>/scripts/check-pr-comments.mjs --paths <경로,경로> [--marker <마커>]`

코드 안에 남으면 안 되는 주석 마커를 센다. md·mdx 파일과 `.git`·`node_modules`·`dist`·`build`·`.next` 폴더는 보지 않는다.

## 인자

`--base`나 `--paths` 중 하나는 있어야 한다. 둘 다 주면 `--paths`를 사용한다.

- `--base <기준 ref>` PR diff 모드. `git diff <기준 ref>...HEAD`에서 추가된 줄만 본다. 현재 폴더의 레포를 사용한다
- `--paths <경로,경로>` 경로 모드. 쉼표로 연결한 파일·폴더의 지금 내용을 통째로 본다. 이 PR 전부터 있던 마커도 센다
- `--marker <마커>` 주면 `TODO [<마커>]`만 센다(구현 전 미검토 TODO 검사는 `USER_REVIEW`). 없으면 `TODO`·`FIXME`·`AI_IMPL` 전부를 센다(구현 종료 TODO 잔존 검사)
- `--plan <plan 루트>` 주면 미배정 blanket disable 고아도 본다

## 출력

stdout에 절마다 `[절 이름] N건`과 걸린 줄(`파일:줄: 내용`)을 출력한다.

- `[금지 주석 잔존]` 또는 `[TODO [<마커>] 잔존]`
- `[소멸 버킷을 인용한 마커]`: `TODO [AI_IMPL]`·`TODO [USER_REVIEW]`(상단 `/* … */` 블록 항목 포함)가 `…/consumable/`·`…/background/retained/` 경로를 출처로 든 줄. 모드와 무관하게 본다
- `[출처 없는 AI_IMPL]`: `TODO [AI_IMPL]` 줄에 `경로:줄` 꼴 출처가 없다. 모드와 무관하게 본다
- `[미배정 blanket disable]`: `--plan`일 때만. 추가된 줄에 격리 마커 `리팩토링 전 코드(정적 분석 도입 PR)`가 든 파일 중, `<plan>/background/consumable/todo.md`·`<plan>/pr<N>/persistent/overview.md` 어디에도 경로가 안 적힌 것

걸린 것이 있으면 stderr에 할 일 줄을 내고 exit 1. 할 일 줄은 호출한 세션에게 시키는 것이다.

- `--marker`로 걸렸으면 IMPL을 멈추고 사용자에게 보고한다
- 경로 모드에서 금지 주석이 걸렸으면 이 PR이 만든 것은 해소하고, 이 PR 전부터 있던 것은 지우지 않고 사용자에게 보고한다
- diff 모드에서 걸렸으면 고치고 다시 돌린다
- 고아가 걸렸으면 사용자가 배정할 PR을 정해 그 PR의 TODO에 등록한다

모르는 인자를 주거나 `--base`·`--paths`가 둘 다 없으면 사유와 이 문서 경로를 stderr에 내고 exit 1. `git diff`가 실패해도 exit 1.
