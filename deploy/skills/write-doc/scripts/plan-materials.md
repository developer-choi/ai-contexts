# plan-materials.mjs 사용법

`node <write-doc 스킬 폴더>/scripts/plan-materials.mjs <대상 레포 안 아무 경로>`

대상 레포의 메인 체크아웃(`git worktree list`의 첫 항목)을 찾아, 그 `plan/` 아래를 stdout에 낸다. 워크트리 경로를 줘도 메인 체크아웃 쪽을 본다.

- `메인 체크아웃: <경로>` 한 줄
- `## plan/ 아래 이름 (N개)` — 파일·폴더 이름 목록. `node_modules`와 점으로 시작하는 폴더는 `<이름>/ (안 들어감)`으로만 낸다
- `## todo md` — 파일 이름에 `todo`가 든 md(대소문자 무시). 내용은 보지 않는다
- `plan/`이 없으면 `plan/ 없음 — 재료 자리 찾기를 건너뛴다`만 내고 exit 0

파일 내용은 내지 않는다. 인자가 없으면 사유와 이 문서 경로를 stderr에 내고 exit 1.
