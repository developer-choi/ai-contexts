# check-wording.mjs 사용법

`sync:environment`가 같은 폴더의 `check-wording.mjs`를 `~/.ai-contexts/`로(옆의 `blocked-expressions.json`도 함께) 복사하고 전역 git pre-commit 훅으로 등록한다.

## 수동 호출

- `node ~/.ai-contexts/check-wording.mjs --report <md 또는 폴더 경로>`: 커밋 없이 묻는다
  - 폴더면 그 아래 `.md`마다(`node_modules`·`.git` 제외) 본다
  - 작업 트리의 내용을 보고, 지목한 md면 경로와 무관하게 본다
  - 대상이 AC 체크아웃(워크트리 포함) 안이면 사본이 그 체크아웃의 같은 스크립트로 넘겨 돌린다
  - AC에서는 `node scripts/hooks/check-wording.mjs --report <경로>`도 같다

## exit code와 출력 계약

- `--report`는 정상 완료 시 적중 유무와 무관하게 0이다
- `--report`는 경로가 없거나(사유와 이 문서 위치를 stderr에), 파일이 없거나(`파일이 없다: <절대경로>`), 폴더 아래 md가 없으면(`md가 없다: <절대경로>`) 1이다
- AC 체크아웃 위임 실행이 실패하면 `체크아웃의 <경로>를 실행하지 못했다: <사유>`를 stderr에 찍고 1이다
- 그 밖의 내부 오류는 `[낱말 검사 훅 내부 오류, 건너뜀]`을 stderr에 찍고 0이다
- `--report`는 적중이 없는 파일마다 `<경로> — 적중 없음.`을 출력한다
