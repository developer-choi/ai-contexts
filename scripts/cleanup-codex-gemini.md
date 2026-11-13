# cleanup-codex-gemini.mjs 사용법

`node scripts/cleanup-codex-gemini.mjs [--apply] [<스캔 루트>…]`로 실행한다. 경로는 ai-contexts 레포 루트 기준이다.

예전 sync가 Codex·Gemini 쪽에 배포한 AC 산출물을 걷는 일회용 스크립트다. 기기마다 한 번 돌린다. `--apply` 없이 실행하면 아무것도 지우지 않는다.

## 인자

- `--apply` 실제로 지운다. 없으면 지울 목록만 출력한다
- `<스캔 루트>…` 레포를 찾을 자리. 그 폴더가 git 레포(`.git`이 있음)면 그 레포 하나, 아니면 직속 하위 폴더 중 git 레포 전부. `~`는 풀지 않는다
- 생략하면 `~/WebstormProjects/main`·`~/WebstormProjects/my-else`
- 스캔 루트를 주든 안 주든 전역(`~/.codex`·`~/.gemini`)은 늘 본다
- `--apply` 밖의 `--옵션`이 있으면 stderr에 사유를 출력하고 exit 1

## 지우는 것

- `~/.codex`의 `contexts`·`hooks`·`hooks.json`·`AGENTS.md`, `~/.gemini`의 `contexts`·`hooks`·`GEMINI.md`
- `~/.codex/skills`·`~/.gemini/skills`에서 `SKILL.md`에 `deploy-anchor` 표식이 있는 스킬
- `~/.codex/config.toml`에서 `.codex` 아래 `hooks.json`을 가리키는 `[hooks.state.…]` 섹션
- `~/.gemini/settings.json`에서 `.settings.json.ac-keys`에 적힌 키, 그리고 그 매니페스트
- 레포마다 `.agents/<local 폴더>`의 배포본, `CLAUDE.md`와 내용이 같은 `AGENTS.md`·`GEMINI.md`, `.codex/hooks.json`·`.codex/hooks/`, 그 뒤 비게 된 `.agents/`·`.codex/` 하위 폴더

git이 추적하는 경로, 배포 표식이 없는 스킬, `CLAUDE.md`와 내용이 다른 `AGENTS.md`·`GEMINI.md`는 지우지 않고 `SKIP` 줄로 알린다.

## 출력

- `SKIP  <경로> (<사유>)` 지우지 않고 남긴 것. 읽는 쪽이 직접 확인한다
- `DEL   <경로>`·`EDIT  <경로> (…)`·`SPLIT <경로> (…)`·`RMDIR <경로> (비었으면)` 할 일 목록
- `--apply`가 없으면 끝에 `위 N건을 지우려면 --apply를 붙여 다시 돌린다.`
- `--apply`면 끝에 `완료: N건`. 실패한 건은 stderr에 `실패 N건:`과 건마다 사유
- 지울 것이 없으면 `지울 Codex·Gemini 산출물이 없다.`

## 돌린 뒤 확인

- `ls ~/.codex ~/.gemini`에 `contexts/`·`hooks/`·`hooks.json`·`AGENTS.md`·`GEMINI.md`가 없다
- `~/.codex/skills`·`~/.gemini/skills`에 AC 스킬(`SKILL.md`에 `deploy-anchor` 표식)이 없다
- `grep -n "hooks.state" ~/.codex/config.toml` 결과에 `.codex` 아래 `hooks.json`을 가리키는 줄이 없다
- 각 레포에 `.codex/hooks.json`·`.codex/hooks/`·`.agents/<local 폴더>`·(`CLAUDE.md` 사본인) `AGENTS.md`·`GEMINI.md`가 없다

## exit code

`--apply`에서 한 건이라도 실패하거나 모르는 옵션이 있으면 1, 아니면 0.
