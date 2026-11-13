# verify-cli-usage.mjs 사용법

전역 git pre-commit 훅으로 돌며, 커밋 중인 레포(cwd의 git toplevel)를 기준으로 본다.

`process.argv`를 `[0]`·`[1]` 말고 읽는 줄이 있는 `.mjs`만 인자 받는 스크립트로 보고 검사한다. 줄 단위 문자열 검사라 주석·문자열 속 `process.argv`도 센다.

## 호출

- `node ~/.ai-contexts/verify-cli-usage.mjs`: 인자 없음. pre-commit 훅이 사용하는 모드라 스테이징된 변경만 본다. 레포 전체를 보려면 폴더 인자를 준다
- `node ~/.ai-contexts/verify-cli-usage.mjs <폴더|파일>…`: 그 아래 인자 받는 `.mjs`를 본다(`node_modules`·`.git`·`.claude` 제외. 커밋된 `.claude/skills`는 본다).
  입력 경로는 cwd 기준이고, 출력하는 파일 경로는 git toplevel 기준이다. AC에서는 `node scripts/hooks/verify-cli-usage.mjs <폴더>…`도 같다

## 출력·exit code

- 의심이 있으면 stderr에 `[CLI 사용법 짝 md 의심]` 아래 파일마다 사유를 출력하고, 이어서 `판단:` 줄에 고칠지 그대로 둘지 가르는 기준과 규칙 문서 위치를 출력한다
- 커밋 모드는 늘 exit 0이다. 검사기 자체가 죽으면 `[CLI 사용법 짝 md 훅 내부 오류, 건너뜀]`을 출력한다
- 폴더 모드는 stdout에 `CLI 스크립트 N개 중 의심 M개`(N은 인자 받는 스크립트 수, M은 의심이 걸린 파일 수)를 출력하고, 의심이 있으면 exit 1이다. 인자 받는 스크립트를 하나도 못 찾거나 없는 경로·모르는 옵션이면 사유와 이 문서 위치를 stderr에 출력하고 exit 1이다
