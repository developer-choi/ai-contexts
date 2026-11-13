# 배포 시스템 수정 규약

AC의 배포 시스템을 수정·추가할 때 따르는 규칙.

## 목적: 어느 레포·기기에서도 동일하게 동작

이 배포 시스템의 목적은 원본(`deploy/`·`plugins/ac/`·각 레포 `local/`·`.claude/skills/`)을 Claude Code가 읽게 해, 어느 레포·기기에서 작업해도 같은 규칙·스킬·hook이 동작하게 만드는 것이다.
공식 기능(plugin·`@` import)으로 원본을 그대로 읽게 할 수 있으면 그쪽을 사용하고, sync는 공식 기능이 받지 못하는 것(settings.json 생성, 스킬을 뺀 레포 로컬 자산)만 만든다.

- **자산마다 원본은 하나만 둔다.** 전역 자산은 `deploy/`(스킬·hook·contexts는 `plugins/ac/`), 레포 로컬 자산은 그 레포의 `local/`(스킬은 `.claude/skills/`)에 두고, 같은 로직(hook js·정책 목록·스킬)을 레포마다 따로 두지 않는다. 수정은 원본에서 하고, `local/` 자산은 `sync:*`로 배포한다.
- **배포 산출물은 직접 손대지 않는다.** 다음 sync에 덮여 사라진다. 막는 장치는 둘이고, 막는 대상이 달라 서로 대체하지 못한다:
  - **편집 차단**: 전역 `check-artifact-write-policy.mjs`가 AI의 Edit/Write에 `ask`를 띄운다. 모든 레포를 hook 하나가 덮지만 git 커밋은 못 막는다.
  - **커밋 차단**: 각 레포 `.gitignore`. 레포마다 적어야 한다.

## 전역 settings는 claude-settings.json 하나로 생성한다

sync는 `deploy/claude-settings.json`(model·env·permissions 등)을 `~/.claude/settings.json`에 top-level 키 단위로 합친다(`scripts/lib/deploy-lib.mjs`). hook은 여기 두지 않는다([hook 작성 위치](#hook-작성-위치)).

- **`permissions.allow`의 도구 이름은 괄호형(`"Bash(*)"`)으로 적는다.** 괄호 없는 `"Bash"`는 그 도구의 `ask`를 "이미 승인됨"으로 흡수한다. 허용 범위는 `"Bash(*)"`와 같은데 승인 창만 죽으므로, 얻는 것 없이 방어선만 잃는다.
  - 괄호 없는 `"Bash"` 아래서 `git push`가 승인 없이 나간 적이 있다.
  - 괄호 없이도 `ask`가 뜨는 경우가 있지만, 어느 `ask`가 흡수될지는 일정하지 않아 괄호 없는 이름을 안전하다고 보지 않는다.
- **git hook이 스스로 내는 명령(`post-commit`의 자동 `git push` 등)은 도구 호출이 아니라 `permissions.*`도 정책 hook도 관여하지 못한다.** 막으려면 그 레포의 git hook 자체를 고친다.
- settings 재료 파일을 새로 만들면 `SOURCE_ONLY_ROOT_FILES`에 넣어 raw 복사에서 뺀다.

## 로컬 settings projection (`local/` → repo-local)

레포 로컬 settings/hooks는 `local/base-settings.json`의 논리 hook 목록(`file`·`event`·`on`)을 `scripts/settings/settings-projection.mjs`로 투영해 배포한다. 소스는 각 레포의 `local/`, 타겟은 그 레포의 `.claude/settings.json`이다.
`local/base-settings.json`을 가진 모든 레포가 `sync:local-system`의 대상이다. 메커니즘은 `scripts/local-system/local-deploy-lib.mjs` 머리 주석이 정본이다.

- 새 로컬 hook은 `local/base-settings.json`에 논리 항목을 추가하고 `local/hooks/`에 `.mjs`를 둔다.

## 로컬 자산 배포 (`local/<X>` → `.claude/<X>`)

settings/hooks와 스킬을 뺀 repo-local 자산(contexts 등)은 `local/<X>`를 `.claude/<X>`에 동일 복사한다(`scripts/local-system/sync-local-assets.mjs`). 새 자산 종류는 `local/`에 디렉토리만 두면 된다.

## 레포 로컬 스킬 (`.claude/skills/` 커밋)

레포 로컬 스킬은 각 레포가 `.claude/skills/`에 원본을 커밋하고, Claude Code가 그 자리를 그대로 읽는다.

- `.gitignore`로 `.claude` 아래를 무시하는 레포는 `.claude/*` 다음 줄에 `!.claude/skills/`를 둔다. `.claude/`로 폴더째 제외하면 그 안을 다시 포함할 수 없다
- 자기 폴더의 스크립트는 `${CLAUDE_SKILL_DIR}`로 적는다(Claude Code가 채운다)
- plugin `ac`의 contexts 스크립트는 `"$HOME/WebstormProjects/main/ai-contexts/plugins/ac/contexts/<파일>"`로 적는다. `"$HOME/…"`은 Git Bash와 PowerShell 모두 펼친다

## plugin ac로 옮긴 스킬·hook·contexts

전역 스킬·hook·contexts는 모두 `plugins/ac/`(`skills/`·`hooks/`·`contexts/`)에 있고, Claude Code plugin(AC 루트 `.claude-plugin/marketplace.json`의 `ac`)으로 설치한다.
sync는 이것들을 배포하지 않는다([가이드](guides/system.md)). 스킬을 옮긴 결정 근거는 커밋 `0a55b232` 본문에 있다.

- marketplace는 directory 소스로 등록한다. Claude Code가 캐시가 아니라 원본 폴더를 읽어(hook의 `${CLAUDE_PLUGIN_ROOT}`도 원본 폴더다), 원본 수정이 sync·`plugin update` 없이 다음 세션에 반영된다
- 이 경로에는 렌더링이 없다. 스킬 md에 `${CLAUDE_SKILL_DIR}`를 적는다(Claude Code가 채운다).
  contexts는 md 링크면 그 파일 기준 상대 경로(`../../contexts/…`)로, 실행 명령이면 `${CLAUDE_SKILL_DIR}/../../contexts/…`로 적는다
- 스킬 스크립트·hook이 contexts나 다른 스킬 폴더를 읽을 때는 `import.meta.dirname` 기준 상대 경로로 찾는다. 셋이 같은 plugin 폴더 안에 있다
- sync는 settings.json에 `enabledPlugins`를 기록하지 않는다. `mergeSettings`가 top-level 키를 통째로 덮어 사용자가 켠 다른 plugin을 지우기 때문이다. 등록은 기기마다 [새 머신 초기화](INSTALLATION_GUIDE.md#새-머신-초기화)의 plugin 등록 명령으로 한다

## 배포 스크립트 변경 원칙

- `sync:*`의 대상·동작이 바뀌면 같은 커밋에서 대응 `unsync:*`와 `meta/guides/`의 해당 가이드를 함께 맞춘다.
  새 대상을 추가하면 `package.json`·`meta/guides/<target>.md`·`meta/guides/index.md`·`meta/INSTALLATION_GUIDE.md`도 맞추고, 가이드에는 수행 작업·제거 기준·반복 실행 기준을 적는다.
- `sync:*`·`unsync:*`가 지킬 수렴·제거 기준은 [명령 이름 기준](guides/index.md#명령-이름-기준)이 정본이다. 새 `sync:*` 구현은 2회 이상 실행과 `unsync:*` 후 잔여를 확인하는 검증을 포함한다.
- `unsync:*`가 사용자 파일을 지울 가능성이 있으면 marker block, 상태 파일, 동일성 비교, 또는 경로가 AC 전유 산출물 위치임이 보장되는 경우(gitignore된 투영 대상 디렉토리) 중 하나로 AC 관리 여부를 확인한 뒤 제거한다.
- 멱등·안전제거 메커니즘(`scripts/environment/environment-lib.mjs`, 전역 git 훅 등록은 `scripts/lib/git-hooks.mjs`)에 함수를 추가하면 `scripts/environment/verify-environment.mjs`에 그 계약 케이스를 추가한다.
  실제 `sync:environment`를 끝까지 도는 경로(winget 설치·실프로필·실레지스트리)는 이 검증 밖이다.

## AC worktree hook 준비

- 셸 도구로 `git worktree add`를 하거나 `EnterWorktree`를 호출하면 PostToolUse self-heal hook이 새 워크트리에 의존성과 gitignore된 env 파일을 primary에서 채운다. 맨 터미널에서 만든 워크트리는 그 안에서 `npm ci`를 실행한다.
- 레포에 `prepare`나 훅 설치 스크립트를 두지 않는다. 배선은 `sync:environment` 하나가 기기 전역에 건다(이유는 `scripts/lib/git-hooks.mjs` 머리 주석).

## 정책 hook 검증 원칙

`plugins/ac/hooks/`의 정책 hook을 수정·검증할 때:

- **등록·발동은 실제 도구 호출로 검증한다.** hook에 payload를 직접 흘리면 판정 로직만 확인되고 PreToolUse/PostToolUse로 실제 발동하는지는 모른다. git 상태와 무관한 정적 판정은 `scripts/verify/verify-hook-policies.mjs`에 케이스로 등록해 고정한다.
- **위험 케이스도 안전한 시나리오를 설계해서 실제 명령으로 검증한다.** 막는 경우와 함께, 막으면 안 되는 이웃 대상(같은 도구의 다른 대상)이 그대로 통과하는지도 확인한다.
- **검증용 임시 산출물(파일·커밋·팀·디버그 로그·임시 브랜치)은 보고 전에 정리한다.**
- **메인 워크트리에서 검증 작업을 수행하지 않는다.** fix 워크트리 또는 별도 임시 디렉토리에서 진행한다.
- **레포 등급(브랜치 정책 강도)은 `plugins/ac/hooks/repo-tiers.mjs` 한 곳에서만 정한다.** 등급별 동작과 판정 방식은 그 파일 주석이 정본이다.
- **새 git 정책 hook은 명령 문자열이 아니라 `plugins/ac/hooks/git-command-parser.mjs`의 파싱 결과로 판정한다.** 인접 정규식은 `git -C`·체인·값을 붙이거나 묶은 짧은 옵션을 놓친다(짧은 옵션은 `commitShortFlagChars`).

## hook 작성 위치

새 전역 hook은 본체를 `plugins/ac/hooks/`의 `.mjs` 파일 하나로 두고, `plugins/ac/hooks/hooks.json`에 `node "${CLAUDE_PLUGIN_ROOT}/hooks/<파일>.mjs"` 명령으로 등록한다.
셸 명령을 실행하는 도구에 거는 hook은 매처를 `Bash|PowerShell|Monitor`로 둔다.
등록 정합과 핵심 매처는 `verify:settings`가 고정한다.
