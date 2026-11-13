# check-count-hardcoding.mjs 사용법

sync가 이 파일을 `~/.ai-contexts/check-count-hardcoding.mjs`로 복사하고 전역 git pre-commit 훅으로 등록한다. 사람·AI가 손으로 실행하는 것은 `--report`다.

## 호출

- `node ~/.ai-contexts/check-count-hardcoding.mjs --report <md 경로>` — 파일 하나를 커밋 없이 묻는다
  - 작업 트리의 내용을 보고, 프롬프트 문서 범위(`/skills/`·`/rules/`·`/contexts/`·`meta/guides/`·`CLAUDE|AGENTS|GEMINI.md`) 밖의 파일이어도 본다
  - AC에서는 `node scripts/hooks/check-count-hardcoding.mjs --report <md 경로>`도 같다
- `node ~/.ai-contexts/check-count-hardcoding.mjs` — 인자 없음. pre-commit 훅으로 도는 모드다. 현재 레포에 스테이징된 프롬프트 md(삭제·내용 그대로인 이름 바꿈 제외)를 통째로 본다

## 출력

- `[개수 하드코딩 의심] …`·`[스텝 번호 호명 의심] …` 헤딩 아래 `<파일>:<줄>: <줄 내용>  (<걸린 꼴>)`. 범주마다 20건까지 내고 나머지는 `... 그 밖에 N건 더`
- `판단:`으로 시작하는 줄은 걸린 줄마다 일반화할지 그대로 둘지 가르는 기준이다
- 커밋 모드에서만 「이 커밋에서 함께 정리한다」 안내가 붙는다. 커밋하는 쪽이 줄마다 판정해 고칠 것은 고치고, 둔 것은 건수와 사유를 보고에 적는다
- `--report`는 적중이 없으면 `<경로> — 적중 없음.`을 내고, 끝에 `한계:` 줄(못 잡는 꼴)을 늘 낸다

## exit code

- 커밋 모드는 늘 0이다. 내부 오류도 `[개수 하드코딩 훅 내부 오류, 건너뜀]`만 찍고 0
- `--report` 뒤에 경로가 없으면 사유와 이 문서 위치를 stderr에 내고 1. 파일이 없으면 `파일이 없다: <절대경로>`와 1
