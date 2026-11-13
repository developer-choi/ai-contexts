# unsync-system.mjs 사용법

`node scripts/system/unsync-system.mjs [<타겟 폴더>]` 또는 `npm run unsync:system` — ai-contexts 레포 루트 기준 경로다.

`sync-system.mjs`가 배포한 자산을 타겟에서 지운다.

## 인자

- `<타겟 폴더>` 지울 곳. `~`로 시작하면 홈으로 푼다
- 생략하면 stdin으로 `타겟 경로 [~/.claude의 절대경로]:`를 묻는다. 빈 줄이면 `~/.claude`다. 비대화형으로 돌릴 때는 타겟을 준다

## 출력

`타겟:` 다음에 지운 항목, 끝 줄 `완료: N개 제거`.

## exit code

오류가 나면 stderr에 메시지를 내고 1, 아니면 0.
