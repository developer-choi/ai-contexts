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
- `.githooks/<이벤트>`가 있으면 실행하는 훅을 **기기 전역**(`hook.ai-contexts-githooks-<이벤트>.*`)에 이벤트마다 멱등하게 등록합니다. 레포별로 등록하지 않는 이유는 등록이 `.git/config`에 사는데 clone이 그 파일을 안 가져오기 때문입니다 — 전역이면 그 뒤로 클론하는 레포도, 새로 파는 워크트리도 아무것도 안 해도 훅이 발동합니다. `.githooks/`가 없는 레포는 조용히 통과하므로 모든 레포에 걸려도 무해합니다.
  - 옛 방식의 잔재(레포별 `hook.repo-*` 등록)를 발견하면 걷어냅니다 — 남겨두면 전역 훅과 둘 다 돌아 같은 검사가 두 번 실행됩니다. 이미 이관된 기기에서는 지울 것이 없어 읽기만 합니다. **`core.hooksPath`는 지우지 않고 보고만 합니다** — 우리가 안 건 값을 가진 레포(훅을 일부러 꺼둔 것, 옛 husky 과제 레포)가 섞여 있어, 지우면 꺼둔 훅이 되살아나거나 husky 배선이 끊깁니다.
  - `unsync:environment`로는 이 정리를 못 합니다. 그 명령은 레포별 훅 등록을 건드린 적이 없고 PowerShell 7 제거·gitignore·autorun 해제를 합니다.
- **git 2.54 이상이 필요합니다.** 낮은 버전은 설정 훅을 경고 없이 무시하므로, 등록하지 않고 중단합니다 (`winget upgrade --id Git.Git -e`).
- `scripts/hooks/check-count-hardcoding.mjs`를 `~/.ai-contexts/check-count-hardcoding.mjs`로 복사하고, `--global` pre-commit 훅(`hook.ai-contexts-count-hardcode.*`)으로 멱등하게 등록합니다. 스테이징된 프롬프트 md(`/skills/`·`/rules/`·`/contexts/`·`meta/guides/`·`CLAUDE|AGENTS|GEMINI.md`)를 통째로 훑어 개수 하드코딩(글로벌 룰 「구체적인 개수를 본문에 하드코딩하지 않는다」)을 감지해 경고합니다 — 어느 레포·어느 도구로 커밋하든 발동하지만 커밋을 막지는 않습니다.
  - 스텝 번호 범위 호명(`Step 1~3`)도 같은 훅이 별도 문구로 경고합니다. 지는 불변식이 같기 때문입니다 — 문서 구조에 묶인 숫자가 구조가 바뀔 때 조용히 낡습니다. 번호 매긴 단계를 헤딩으로 정의하는 파일은 자기 목차를 부르는 것이라 이 검사에서 제외합니다.
  - 이번 커밋이 고친 줄이 아니라 **건드린 파일 전체**를 봅니다. 추가분만 보면 옛 위반이 그 줄을 직접 건드리기 전까지 남고, 그렇다고 규칙마다 전 파일을 훑으면 규칙 수만큼 비용이 곱해집니다. 건드린 파일만 통째로 보면 손대는 김에 걷히면서 커밋당 비용은 안 늡니다.
  - 등록하는 명령은 `|| true`로 감쌉니다. 전역 훅이라 실패하면 모든 레포의 모든 커밋이 막히는데, 스크립트 파일이 사라지거나 node가 없으면 스크립트가 자기 오류를 삼킬 기회조차 없이 non-zero로 죽기 때문입니다.
  - backlog 레포의 백로그 데이터(`projects/`·`articles/`·`roadmaps/`·`archives/`·`side-income/`·`finance/`)는 제외합니다. `projects/{repo}/active/rules/`처럼 경로에 `/rules/`가 들어가 프롬프트 문서로 오인되지만, 거기 적히는 개수는 측정값이라 일반화하면 기록이 망가집니다. 같은 레포의 `local/skills/`는 진짜 프롬프트 문서이므로 계속 검사합니다.
- `scripts/hooks/check-coupling-patterns.mjs`를 `~/.ai-contexts/check-coupling-patterns.mjs`로 복사하고, `--global` pre-commit 훅(`hook.ai-contexts-coupling-patterns.*`)으로 멱등하게 등록합니다. 커밋하는 레포에 `meta/coupling.json`이 있으면 등록된 짝꿍 패턴 **하나하나**가 실물 파일을 가리키는지 확인해 경고합니다 — 커밋을 막지는 않습니다.
  - 왜 필요한가: 짝꿍을 띄우는 편집 시점 훅(`surface-coupling`)은 「편집 중인 파일이 어느 묶음에 드는가」만 봅니다. 묶음 쪽 패턴이 낡아 아무 파일도 안 가리키게 되면 그 훅에서는 「이 파일은 짝꿍이 아니다」와 똑같은 모양이 되어, 짝꿍 대조가 통째로 꺼진 상태가 매 편집마다 통과처럼 보입니다(`deploy/contexts/rules-as-code.md` 「대상 0개는 통과가 아니라 고장이다」).
  - 등록부를 건드린 커밋만이 아니라 **그 레포의 모든 커밋**에서 돕니다. 패턴이 죽는 계기는 등록부를 고칠 때가 아니라 다른 파일이 옮겨갈 때라, 등록부를 건드린 커밋만 보면 죽은 뒤 아무도 등록부를 안 여는 동안 계속 안 잡힙니다.
  - 아직 만들지 않은 짝을 자리만 잡아둔 경우는 그 묶음의 `pending`(패턴 → 사유)으로 면제합니다. 사유는 필수이며 너무 짧으면 형식 오류로 걸립니다. 면제한 패턴에 실물이 생기면 「면제 낡음」으로 걸려 걷을 자리를 알려줍니다.
  - **면제 건수는 출력할 때마다 함께 냅니다.** 면제가 늘어나는 것이 안 보이면 이 검사는 「죽은 패턴에 면제를 붙인다」로 우회되어 초록불인 채 꺼집니다. 면제가 늘어나는 계기는 등록부를 고치는 것뿐이라, 깨끗해도 `meta/coupling.json`이 스테이징된 커밋에서는 한 줄 요약(묶음·패턴·면제 건수)을 냅니다.
- AC가 설치하거나 등록한 상태는 `~/.ai-contexts/environment-state.json`에 기록합니다.

## 제거

```bash
npm run unsync:environment
```

제거 명령은 AC marker block만 제거합니다. PowerShell 7은 `sync:environment`가 직접 설치했다고 상태 파일에 기록된 경우에만 제거를 시도합니다. `~/autorun.cmd`는 내용이 AC가 쓴 것과 동일할 때만 삭제하고, `AutoRun` 레지스트리는 상태 파일에 AC 등록 기록이 있고 현재 값이 `@~/autorun.cmd`일 때만 제거합니다.

`.githooks` 배선(`hook.ai-contexts-githooks-*`)은 `unsync:environment`가 **되돌리지 않습니다** — 되돌리면 이 기기의 모든 레포에서 훅이 통째로 꺼져 커밋 검사가 조용히 사라집니다. 되돌릴 환경 오염이 아니라 레포들이 동작하기 위한 배선으로 봅니다.

전역 검사 훅(개수 하드코딩 `hook.ai-contexts-count-hardcode.*`, 짝꿍 등록부 `hook.ai-contexts-coupling-patterns.*`)은 다른 레포의 자체 기능을 켜는 배선이 아니라 AC가 얹은 독립 기능이므로, `unsync:environment`가 등록을 해제하고 `~/.ai-contexts/`의 스크립트 사본도 제거합니다(AC가 쓴 내용과 동일할 때만 — 사용자가 직접 고쳤으면 남겨둡니다). 어느 훅을 이렇게 다루는지는 `scripts/environment/precommit-hooks.mjs`의 `PRECOMMIT_HOOKS`가 정본이고, sync·unsync가 그 표를 함께 읽습니다.

## 반복 실행 기준

`sync:environment`는 여러 번 실행해도 PowerShell profile block이나 global gitignore pattern을 중복 추가하지 않아야 합니다. 기존 `ai-contexts` 또는 `test-playground` marker는 새 AC marker로 이관합니다. `~/autorun.cmd`와 `AutoRun` 레지스트리도 같은 값으로 수렴하며 중복 등록하지 않습니다.

## 새 머신 기준

새 머신에서는 의존성 설치 후 가장 먼저 실행합니다.

```bash
npm ci
npm run sync:environment
```

이 명령은 사용자 환경을 바꾸므로 `unsync:environment`가 되돌릴 수 있는 대상과 되돌리지 않을 대상을 가이드에 함께 기록해야 합니다.
