# verify-cli-usage.mjs 사용법

`node scripts/verify/verify-cli-usage.mjs <폴더|파일>… | --staged [--list]` — ai-contexts 레포 루트 기준 경로다.

`process.argv`를 `[0]`·`[1]` 말고 읽는 `.mjs`를 인자 받는 스크립트로 보고, 각각 아래를 본다. 스크립트는 실행하지 않는다.

- 같은 폴더에 같은 이름의 `.md`가 있다
- 머리 주석(shebang 다음 `//` 줄들) 첫 줄이 `// 사용법: <이름>.md (같은 폴더)`다
- 머리 주석의 나머지 줄에 `node …x.mjs`·줄머리 `node …` 호출 꼴이나 줄머리 옵션(`//   --foo …`)이 없다
- `USAGE`·`…_USAGE` 사용법 상수와 문자열 속 `사용:\n`·`사용법:\n` 블록이 없다

## 인자

- `<폴더|파일>…` 그 아래 `.mjs`를 전부 본다(`node_modules`·`.git`·`.claude` 제외). 인자 받는 스크립트를 하나도 못 찾으면 exit 1
- `--staged` 커밋에 오른 `.mjs`와, 커밋에서 바뀌거나 지워진 `.md`의 짝 `.mjs`만 본다. pre-commit이 쓴다. 볼 것이 없으면 아무것도 출력하지 않고 exit 0
- `--list` 검사 대상 경로만 한 줄씩 내고 exit 0

## 출력

- 위반이 있으면 stderr에 파일마다 위반 사유를 내고 끝에 `CLI 스크립트 N개 중 위반 M개 (면제 K개)`, exit 1
- 없으면 stdout에 같은 요약 한 줄, exit 0
- 면제는 스크립트에 사유와 함께 박힌 목록이다(git·자기 자신이 실행하는 hook 등). 개수는 요약에 늘 나온다
