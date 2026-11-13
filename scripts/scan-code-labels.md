# scan-code-labels.mjs 사용법

`node scripts/scan-code-labels.mjs [<레포경로>…]` 또는 `npm run scan:code-labels [-- <레포경로>…]` — ai-contexts 레포 루트 기준 경로다.

## 인자

- `<레포경로>…` 그 아래 `.md`를 전부 훑는다(`node_modules`·`.git`·`.claude`(커밋된 `.claude/skills`는 훑는다)·`.agents`·`.codex`·`.gemini`·`dist`·`build`·`coverage` 폴더 제외). 없는 경로는 0개로 넘어간다
- 생략하면 이 레포의 형제 폴더 중 `.git`이 폴더인 레포(워크트리 제외)를 전부 훑는다

## 출력

- 첫 줄 `md N개 훑음 — 알림이 뜨는 토큰 M종`
- 토큰마다 세 줄: `<토큰> <횟수>회  <파일 수>개 파일`, 처음 걸린 줄(90자까지), 처음 걸린 파일
- 끝의 안내는 읽는 쪽에게 시키는 것이다 — 기본은 문서를 고치고, 여러 문서에서 계속 쓸 실존 용어만 `plugins/ac/hooks/check-md-code-labels.mjs`의 `KNOWN_TERMS`에 넣는다

판정은 `check-md-code-labels` 훅을 파일마다 실제로 실행해 받는다. 늘 exit 0.
