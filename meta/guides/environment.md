# Environment Sync

현재 머신의 사용자 환경을 AC 기준으로 맞춥니다. 여러 번 실행해도 중복 없이 같은 상태로 수렴합니다.

```bash
npm run sync:environment
```

## 수행 작업

**git 2.54 이상이 필요합니다.** 낮은 버전은 설정 훅을 경고 없이 무시하므로, sync는 맨 앞에서 버전을 검사해 아무것도 바꾸지 않고(상태 파일도 기록하지 않고) 오류로 중단합니다.
올리는 법: `winget upgrade --id Git.Git -e`

sync·unsync 모두 프로필·gitignore·`~/autorun.cmd`·`~/.ai-contexts/`의 훅 사본을 고치거나 지울 때는 원본을 `<파일>.bak-<시각>`으로 남기고, 이 `.bak` 파일은 지우지 않습니다.

- Windows에서 PowerShell 7 존재 여부를 확인하고, 없으면 `winget`으로 `Microsoft.PowerShell`을 설치합니다. `winget`이 없으면 경고만 하고 넘어가고, 설치가 실패하면 오류로 중단합니다.
- Windows에서 Windows PowerShell과 PowerShell 7의 실제 `$PROFILE` 경로를 확인해 UTF-8 설정 block을 삽입 또는 갱신합니다.
  옛 marker block은 새 marker로 이관합니다. 옛 marker 목록은 `scripts/environment/sync-environment.mjs`의 `legacyPatterns`가 정본입니다.
- `~/.gitignore_global`에 AC 관리 block으로 `plan/` 패턴을 추가합니다.
  block을 새로 만들 때는 옛 AC 단독 줄을 함께 지우고 파일의 CRLF 줄바꿈을 LF로 바꿉니다.
  지우는 줄은 `sync-environment.mjs`의 `legacyLinePatterns`, 동작은 `scripts/environment/environment-lib.mjs`의 `upsertManagedBlock`이 정본입니다.
- `core.excludesFile`이 비어 있으면 `~/.gitignore_global`을 등록합니다. 다른 파일이 이미 지정돼 있으면 경고만 하고 등록하지 않으며, 이 경우 위 block은 git이 읽지 않는 파일에 들어갑니다.
- Windows에서 `~/autorun.cmd`를 AC 내용으로 생성·갱신하고, `HKCU\Software\Microsoft\Command Processor`의 `AutoRun`을 `@<홈 절대 경로>\autorun.cmd`로 등록합니다.
  대화형 cmd 창을 홈 디렉토리에서 열면 `~/WebstormProjects/main`으로 이동시킵니다. `AutoRun`이 다른 값으로 이미 설정돼 있으면 사용자 설정 보호를 위해 `AutoRun` 등록만 건너뜁니다.
- `.githooks/<이벤트>`가 있으면 실행하는 훅을 **기기 전역**(`hook.ai-contexts-githooks-<이벤트>.*`)에 이벤트마다 등록합니다. 레포별 등록은 `.git/config`에 살아 clone이 안 가져오므로, 전역에 걸어 새로 클론한 레포·워크트리에서도 바로 발동하게 합니다. `.githooks/`가 없는 레포는 조용히 통과합니다.
  대상 이벤트는 `scripts/lib/git-hooks.mjs`의 `HOOK_EVENTS`이고, 그 밖의 이벤트 파일은 걸리지 않습니다.
  - `~/WebstormProjects/<그룹>/<레포>`의 기본 워크트리에 남은 옛 레포별 등록(`hook.repo-*`)은 걷어냅니다(unsync는 하지 않습니다). 그 밖의 경로에 둔 레포는 정리하지 않습니다.
    `core.hooksPath`는 사용자가 직접 건 값일 수 있어 지우지 않고 보고만 합니다.
- 아래 전역 검사 훅을 등록합니다. 훅마다 원본을 `~/.ai-contexts/<파일>`로 복사하고 `--global` 설정 훅으로 등록합니다.
  - 목록은 `scripts/environment/precommit-hooks.mjs`의 `PRECOMMIT_HOOKS`가 정본이고, 무엇을 어떤 범위로 왜 그렇게 검사하는지는 각 스크립트 머리 주석이 정본입니다.
  - 채용 레포 커밋 검사를 뺀 훅은 어느 레포에서 커밋하든 돌며 **커밋을 막지 않고 경고만** 합니다.
  - 사본은 sync를 돌린 위치(워크트리·브랜치)의 원본을 그 시점에 복사한 것입니다. AC 원본이 바뀌면 sync를 다시 돌려야 반영됩니다.

| 훅 파일 | 검사 이름 | 사용법 |
|---|---|---|
| `scripts/hooks/check-count-hardcoding.mjs` | 개수 하드코딩 검사 훅 | [check-count-hardcoding.md](../../scripts/hooks/check-count-hardcoding.md) |
| `scripts/hooks/check-wording.mjs` | 낱말 검사 훅 | [check-wording.md](../../scripts/hooks/check-wording.md) |
| `scripts/hooks/check-coupling-patterns.mjs` | 짝꿍 등록부 검사 훅 | 스크립트 머리 주석 |
| `scripts/hooks/check-md-size.mjs` | 문서 크기 검사 훅 | [check-md-size.md](../../scripts/hooks/check-md-size.md) |
| `scripts/hooks/check-orphan-md.mjs` | 고아 md 검사 훅 | 스크립트 머리 주석 |
| `scripts/hooks/check-guide-post-pair.mjs` | 가이드-포스트 짝 검사 훅 | 스크립트 머리 주석 |
| `scripts/hooks/verify-cli-usage.mjs` | CLI 사용법 짝 md 검사 훅 | [verify-cli-usage.md](../../scripts/hooks/verify-cli-usage.md) |
| `deploy/hooks/recruitment-commit-guard.mjs` | 채용 레포 커밋 메시지 검사 훅 | 스크립트 머리 주석 |
| `deploy/hooks/recruitment-commit-guard.mjs` | 채용 레포 staged 변경 검사 훅 | 스크립트 머리 주석 |

- **낱말 검사 훅**이 읽는 금지 표현 목록 `scripts/hooks/blocked-expressions.json`도 `~/.ai-contexts/`로 복사합니다. 사본이 없으면 금지 표현 범주만 건너뜁니다. 목록 고치는 법은 [사용법](../../scripts/hooks/blocked-expressions.md)에 있습니다.
- **문서 크기 검사 훅**은 `backlog` 레포가 없는 기기에서는 아무것도 하지 않습니다. 설정 파일 위치는 위 표의 사용법에 있습니다.
- **채용 레포 커밋 검사 훅** 둘은 `~/WebstormProjects/recruitment/` 아래 레포에서만 돌며 경고가 아니라 **커밋을 막습니다**. 무엇을 막는지는 `deploy/hooks/recruitment-commit-guard.mjs`가 정본입니다.
- PowerShell 7 설치, `core.excludesFile`·`AutoRun` 등록, 전역 검사 훅 등록은 `~/.ai-contexts/environment-state.json`에 기록합니다(`.githooks` 배선은 기록하지 않습니다). sync가 중간에 오류로 멈춰도 그때까지 설치·등록한 것은 기록합니다.

## 제거

```bash
npm run unsync:environment
```

제거 명령은 AC가 넣은 것만 되돌립니다.

- 프로필·gitignore의 AC marker block은 지웁니다.
- PowerShell 7 설치와 전역 검사 훅 등록은 상태 파일에 AC 기록이 있을 때만 되돌립니다. PowerShell 7은 `winget`으로 제거합니다.
- `core.excludesFile`·`AutoRun`은 상태 파일에 AC 기록이 있고 현재 값이 sync가 넣은 값 그대로일 때만 되돌립니다.
- `~/autorun.cmd`와 `~/.ai-contexts/`의 훅 사본은 내용이 sync가 만든 것과 같을 때만 지웁니다. 훅 곁의 데이터 사본과 훅이 스스로 만든 상태 파일은 동일성 비교 없이, `.bak`도 남기지 않고 지웁니다.

`.githooks` 배선(`hook.ai-contexts-githooks-*`)은 `unsync:environment`가 **되돌리지 않습니다**: 되돌리면 이 기기의 모든 레포에서 훅이 통째로 꺼져 커밋 검사가 조용히 사라집니다.

상태 파일에 기록이 없으면 전역 검사 훅 등록이 남습니다.
`git config --global --get-regexp "^hook.ai-contexts-"`로 확인하고 `git config --global --remove-section hook.ai-contexts-<이름>`으로 지웁니다.
`<이름>`은 확인 출력의 키에서 가져옵니다. 출력에 섞인 `hook.ai-contexts-githooks-*`는 위의 남기는 배선입니다.
