# Environment Sync

현재 머신의 사용자 환경을 AC 기준으로 맞춥니다.

```bash
npm run sync:environment
```

## 수행 작업

- Windows에서 PowerShell 7 존재 여부를 확인하고, 없으면 `winget`으로 `Microsoft.PowerShell`을 설치합니다.
- Windows PowerShell과 PowerShell 7의 실제 `$PROFILE` 경로를 확인해 UTF-8 설정 block을 삽입 또는 갱신합니다.
- `~/.gitignore_global`에 AC 관리 block으로 `backlog/` 패턴을 추가합니다.
- `core.excludesFile`이 비어 있으면 `~/.gitignore_global`을 등록합니다.
- Windows에서 `~/autorun.cmd`를 AC 내용으로 생성·갱신하고, `HKCU\Software\Microsoft\Command Processor`의 `AutoRun`을 `@~/autorun.cmd`로 등록합니다. 대화형 cmd 창을 홈 디렉토리에서 열면 `~/WebstormProjects/main`으로 이동시킵니다. `AutoRun`이 다른 값으로 이미 설정돼 있으면 사용자 설정 보호를 위해 건너뜁니다.
- `~/WebstormProjects/<group>/<repo>` 중 `.githooks`가 추적되는 레포마다, 그 훅들을 git 설정 훅(`hook.repo-<이름>.command`)으로 멱등하게 등록합니다. 설정은 `.git/config`에 들어가고 그 파일은 워크트리끼리 공유되므로, 레포당 한 번 등록하면 이후 만드는 워크트리에는 아무것도 갖다 놓지 않아도 훅이 발동합니다. 남아 있는 `core.hooksPath`는 해제합니다 — 파일 훅과 설정 훅이 둘 다 돌아 같은 검사가 두 번 실행되는 것을 막습니다.
- **git 2.54 이상이 필요합니다.** 낮은 버전은 설정 훅을 경고 없이 무시하므로, 등록하지 않고 중단합니다 (`winget upgrade --id Git.Git -e`).
- `scripts/hooks/check-count-hardcoding.mjs`를 `~/.ai-contexts/check-count-hardcoding.mjs`로 복사하고, `--global` pre-commit 훅(`hook.ai-contexts-count-hardcode.*`)으로 멱등하게 등록합니다. 스테이징된 프롬프트 md(`/skills/`·`/rules/`·`/contexts/`·`meta/guides/`·`CLAUDE|AGENTS|GEMINI.md`)를 통째로 훑어 개수 하드코딩(글로벌 룰 「구체적인 개수를 본문에 하드코딩하지 않는다」)을 감지해 경고합니다 — 어느 레포·어느 도구로 커밋하든 발동하지만 커밋을 막지는 않습니다.
  - 이번 커밋이 고친 줄이 아니라 **건드린 파일 전체**를 봅니다. 추가분만 보면 옛 위반이 그 줄을 직접 건드리기 전까지 남고, 그렇다고 규칙마다 전 파일을 훑으면 규칙 수만큼 비용이 곱해집니다. 건드린 파일만 통째로 보면 손대는 김에 걷히면서 커밋당 비용은 안 늡니다.
  - 등록하는 명령은 `|| true`로 감쌉니다. 전역 훅이라 실패하면 모든 레포의 모든 커밋이 막히는데, 스크립트 파일이 사라지거나 node가 없으면 스크립트가 자기 오류를 삼킬 기회조차 없이 non-zero로 죽기 때문입니다.
  - backlog 레포의 백로그 데이터(`projects/`·`articles/`·`roadmaps/`·`archives/`·`side-income/`·`finance/`)는 제외합니다. `projects/{repo}/active/rules/`처럼 경로에 `/rules/`가 들어가 프롬프트 문서로 오인되지만, 거기 적히는 개수는 측정값이라 일반화하면 기록이 망가집니다. 같은 레포의 `local/skills/`는 진짜 프롬프트 문서이므로 계속 검사합니다.
- AC가 설치하거나 등록한 상태는 `~/.ai-contexts/environment-state.json`에 기록합니다.

## 제거

```bash
npm run unsync:environment
```

제거 명령은 AC marker block만 제거합니다. PowerShell 7은 `sync:environment`가 직접 설치했다고 상태 파일에 기록된 경우에만 제거를 시도합니다. `~/autorun.cmd`는 내용이 AC가 쓴 것과 동일할 때만 삭제하고, `AutoRun` 레지스트리는 상태 파일에 AC 등록 기록이 있고 현재 값이 `@~/autorun.cmd`일 때만 제거합니다.

레포 로컬 설정 훅 등록(`hook.repo-*`)은 `unsync:environment`가 **되돌리지 않습니다** — 되돌리면 그 레포의 훅이 통째로 꺼져 커밋 검사가 조용히 사라집니다. 되돌릴 환경 오염이 아니라 그 레포가 동작하기 위한 배선으로 봅니다.

전역 개수 하드코딩 훅(`hook.ai-contexts-count-hardcode.*`)은 다른 레포의 자체 기능을 켜는 배선이 아니라 AC가 얹은 독립 기능이므로, `unsync:environment`가 등록을 해제하고 `~/.ai-contexts/check-count-hardcoding.mjs`도 제거합니다(AC가 쓴 내용과 동일할 때만 — 사용자가 직접 고쳤으면 남겨둡니다).

## 반복 실행 기준

`sync:environment`는 여러 번 실행해도 PowerShell profile block이나 global gitignore pattern을 중복 추가하지 않아야 합니다. 기존 `ai-contexts` 또는 `test-playground` marker는 새 AC marker로 이관합니다. `~/autorun.cmd`와 `AutoRun` 레지스트리도 같은 값으로 수렴하며 중복 등록하지 않습니다.

## 새 머신 기준

새 머신에서는 의존성 설치 후 가장 먼저 실행합니다.

```bash
npm ci
npm run sync:environment
```

이 명령은 사용자 환경을 바꾸므로 `unsync:environment`가 되돌릴 수 있는 대상과 되돌리지 않을 대상을 가이드에 함께 기록해야 합니다.
