# 배포 시스템 수정 규약

AC의 배포 시스템(`scripts/` 하위 sync·unsync 스크립트, `deploy/hooks/`, settings.json hook, AC worktree)을 수정·추가할 때 따르는 규칙.

## 목적: 어느 에이전트가 와도 동일하게 동작

이 배포 시스템의 목적은 **Claude·Codex·Gemini 중 어느 에이전트로 작업해도 같은 규칙·스킬·hook이 동일하게 동작하게** 만드는 것이다.

- **원본은 한 벌만 둔다.** 전역 자산은 `deploy/`, 레포 로컬 자산은 그 레포의 `local/`에 두고, 같은 로직(hook js·정책 목록·스킬)을 에이전트마다 따로 쓰지 않는다. 수정은 원본에서 하고 `sync:*`로 배포한다.
- **타겟별 형식은 어댑터가 투영한다.** `sync:*`가 원본 한 벌을 각 에이전트의 등록 형식(matcher·이벤트)으로 변환해 배포한다. 런타임에 없는 도구·이벤트의 hook은 그 타겟에 싣지 않는다 — gemini는 hook 러너가 없고, codex는 어댑터의 `supports`가 거른다.
- **배포 산출물은 직접 손대지 않는다.** 다음 sync에 덮이고 한 에이전트에만 반영된다. 막는 장치는 둘이고, 막는 대상이 달라 서로 대체하지 못한다:
  - **편집 차단** — 전역 `check-artifact-write-policy.mjs`가 AI의 Edit/Write에 `ask`를 띄운다. 모든 레포를 hook 하나가 덮지만 git 커밋은 못 막는다.
  - **커밋 차단** — 각 레포 `.gitignore`. 레포마다 적어야 하고 hook이 대신하지 못한다.

## settings는 base(공통) + 타겟 override로 생성한다

각 타겟 설정은 `deploy/base-settings.json`(공통)과 타겟 override 파일(`deploy/claude-settings.json` 등)을 합쳐 생성하고, 키가 겹치면 override가 이긴다(`scripts/settings/settings-projection.mjs`·`scripts/lib/deploy-lib.mjs`).

- **base에는 모든 타겟이 같이 쓰는 것(정책 hook의 논리 목록)만 두고, 타겟 전용 설정(model·env·permissions 등)은 그 타겟 override 파일에 둔다.**
- **`permissions.allow`의 도구 이름은 괄호형(`"Bash(*)"`)으로 적는다.** 괄호 없는 `"Bash"`는 그 도구의 `ask`를 "이미 승인됨"으로 흡수한다. 허용 범위는 `"Bash(*)"`와 같은데 승인 창만 죽으므로, 얻는 것 없이 방어선만 잃는다.
  - 괄호 없는 `"Bash"` 아래서 `git push`가 승인 없이 나간 적이 있다.
  - 어느 `ask`가 흡수될지는 일정하지 않다. `ask`로 방어선을 세우면 실제로 창이 뜨는지 한 번 확인한다.
- **git hook이 스스로 내는 명령(`post-commit`의 자동 `git push` 등)은 도구 호출이 아니라 `permissions.*`도 정책 hook도 관여하지 못한다.** 막으려면 그 레포의 git hook 자체를 고친다.
- override 파일을 새로 만들면 `SOURCE_ONLY_ROOT_FILES`에 넣어 raw 복사에서 뺀다.

## 로컬 settings projection (`local/` → repo-local)

settings/hooks는 위 전역 메커니즘을 그대로 미러링한 로컬판으로 배포한다. 소스는 각 레포의 `local/`, 타겟은 그 레포의 `.claude/settings.json`·`.codex/hooks.json`이며, `local/base-settings.json`을 가진 모든 레포가 `sync:local-system`의 대상이다. 메커니즘은 `scripts/local-system/local-deploy-lib.mjs` 머리 주석이 정본이다.

- 새 로컬 hook은 `local/base-settings.json`에 논리 항목을 추가하고 `local/hooks/`에 `.mjs`를 둔다. `unsync`·가이드(`meta/guides/local-system.md`) 정합은 전역과 같은 규칙을 따른다.

## 로컬 자산 배포 (`local/<X>` → `.claude/<X>`·`.agents/<X>`)

settings/hooks를 뺀 repo-local 자산(스킬 등)은 claude·codex 공통이라 `local/<X>`를 `.claude/<X>`·`.agents/<X>`에 동일 복사한다(`scripts/local-system/sync-local-skills.mjs`). 새 자산 종류는 `local/`에 디렉토리만 두면 된다.

- 예외로 스킬 폴더의 md는 렌더링해 배포한다(`deploy-lib.mjs`의 `renderSkillMd`·`renderSkillSubMd` — 전역 `sync:system`도 같다). 무엇을 바꾸는지와 그 이유는 그 함수 주석이 정본이고, 배포 검증은 렌더 결과와 대조한다.

## 스킬·규칙 md의 자리표시자 렌더링

배포가 스킬 md의 `{{skill_dir}}`·`{{contexts}}`와 규칙 md의 `{{contexts}}`를 타겟 절대 경로로 채운다(`deploy-lib.mjs`의 `withSkillDirPath`·`withSkillContextsPath`·`withContextsPath`). 자리표시자마다 왜 있고 어디로 채워지는지는 그 함수들과 `contextsDirForSkill` 위 주석이 정본이고, 계약은 `verify:skill-render`·`verify:skill-script-paths`·`compareRulePaths`가 고정한다. 렌더링을 바꾸면 그 검사와 [표기 규칙](../deploy/contexts/prompt-standards/cross-cli.md#읽는-문서와-실행하는-스크립트는-표기가-다르다)을 함께 맞춘다.

## 배포 스크립트 변경 원칙

- `sync:*`의 대상·동작이 바뀌면 같은 커밋에서 대응 `unsync:*`와 `meta/guides/`의 해당 가이드를 함께 맞춘다. 새 대상을 추가하면 `package.json`·`meta/guides/<target>.md`·`meta/guides/index.md`·`meta/INSTALLATION_GUIDE.md`도 맞추고, 가이드에는 수행 작업·제거 기준·반복 실행 기준을 적는다.
- `sync:*`는 반복 실행해도 중복·오염 없이 같은 상태로 수렴하고, `unsync:*` 뒤에는 AC 산출물이 남지 않아야 한다. 새 `sync:*` 구현은 2회 이상 실행과 `unsync:*` 후 잔여를 확인하는 검증을 포함한다.
- `unsync:*`는 AC가 만든 산출물만 제거해야 한다. 사용자 파일을 지울 가능성이 있으면 marker block, 상태 파일, 동일성 비교, 또는 경로가 AC 전유 산출물 위치임이 보장되는 경우(gitignore된 투영 대상 디렉토리) 중 하나로 AC 관리 여부를 확인한 뒤 제거한다.
- 멱등·안전제거 메커니즘(`scripts/environment/environment-lib.mjs`, 전역 git 훅 등록은 `scripts/lib/git-hooks.mjs`)에 함수를 더하면 `scripts/environment/verify-environment.mjs`에 그 계약 케이스를 더한다. 실제 `sync:environment`를 끝까지 도는 경로(winget 설치·실프로필·실레지스트리)는 이 검증 밖이다.

## AC worktree hook 준비

- 에이전트 도구로 `git worktree add`·`EnterWorktree`를 부르면 PostToolUse self-heal hook이 새 워크트리에 의존성과 gitignore된 env 파일을 primary에서 채운다. 맨 터미널에서 만든 워크트리는 그 안에서 `npm ci`를 실행한다.
- 커밋 전 hook 상태가 의심되면 `npm run verify:hooks`를 실행한다.
- 레포에 `prepare`나 훅 설치 스크립트를 두지 않는다 — 배선은 `sync:environment` 하나가 기기 전역에 건다(이유는 `scripts/lib/git-hooks.mjs` 머리 주석).

## deploy/hooks 검증 원칙

`deploy/hooks/`(또는 배포된 `~/.claude/hooks/`)의 정책 hook을 수정·검증할 때:

- **등록·발동은 실제 도구 호출로 검증한다.** hook에 payload를 직접 흘리면 판정 로직만 확인되고 PreToolUse/PostToolUse로 실제 발동하는지는 모른다. git 상태와 무관한 정적 판정은 `scripts/verify/verify-hook-policies.mjs`에 케이스로 등록해 고정한다.
- **위험 케이스도 안전한 시나리오를 설계해서 실제 명령으로 검증한다.** 막는 경우와 함께, 막으면 안 되는 이웃 대상(같은 도구의 다른 대상)이 그대로 통과하는지도 확인한다.
- **"검증 안 됨", "안전한 시뮬 어려움" 같은 회피 결론을 보고에 쓰지 않는다.** 회피 보고를 내기 전에 안전한 실제 명령 시나리오를 한 번 더 고민한다.
- **검증용 임시 산출물(파일·커밋·팀·디버그 로그·임시 브랜치)은 보고 전에 정리한다.**
- **메인 워크트리에서 검증 작업을 수행하지 않는다.** fix 워크트리 또는 별도 임시 디렉토리에서 진행한다. 부득이하면 사용자에게 먼저 알리고 끝나는 즉시 지운다.
- **레포 등급(브랜치 정책 강도)은 `deploy/hooks/repo-tiers.mjs` 한 곳에서만 정하고, 훅마다 레포 조건을 따로 적지 않는다.** 등급별 동작과 판정 방식은 그 파일 주석이 정본이다.
- **새 git 정책 hook은 명령 문자열이 아니라 `deploy/hooks/git-command-parser.mjs`의 파싱 결과로 판정한다.** 인접 정규식은 `git -C`·체인·값을 붙이거나 묶은 짧은 옵션을 놓친다(짧은 옵션은 `commitShortFlagChars`).

## settings.json hook 작성 위치

새 hook은 `deploy/base-settings.json`에 논리 항목(`file`·`event`·`on`)을 더하고 본체를 `deploy/hooks/`의 `.mjs` 파일 하나로 둔다. settings.json에 들어갈 명령 문자열은 `scripts/settings/settings-projection.mjs`가 만든다 — 손으로 적지 않는다.
