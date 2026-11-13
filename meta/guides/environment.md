# Environment Sync

현재 머신의 사용자 환경을 AC 기준으로 맞춥니다. 여러 번 실행해도 중복 없이 같은 상태로 수렴합니다.

```bash
npm run sync:environment
```

## 수행 작업

- Windows에서 PowerShell 7 존재 여부를 확인하고, 없으면 `winget`으로 `Microsoft.PowerShell`을 설치합니다.
- Windows PowerShell과 PowerShell 7의 실제 `$PROFILE` 경로를 확인해 UTF-8 설정 block을 삽입 또는 갱신합니다. 기존 `ai-contexts`·`test-playground` marker는 새 AC marker로 이관합니다.
- `~/.gitignore_global`에 AC 관리 block으로 `backlog/` 패턴을 추가합니다.
- `core.excludesFile`이 비어 있으면 `~/.gitignore_global`을 등록합니다.
- Windows에서 `~/autorun.cmd`를 AC 내용으로 생성·갱신하고, `HKCU\Software\Microsoft\Command Processor`의 `AutoRun`을 `@~/autorun.cmd`로 등록합니다.
  대화형 cmd 창을 홈 디렉토리에서 열면 `~/WebstormProjects/main`으로 이동시킵니다. `AutoRun`이 다른 값으로 이미 설정돼 있으면 사용자 설정 보호를 위해 건너뜁니다.
- `.githooks/<이벤트>`가 있으면 실행하는 훅을 **기기 전역**(`hook.ai-contexts-githooks-<이벤트>.*`)에 이벤트마다 등록합니다. 레포별 등록은 `.git/config`에 살아 clone이 안 가져오므로, 전역에 걸어 새로 클론한 레포·워크트리에서도 바로 발동하게 합니다. `.githooks/`가 없는 레포는 조용히 통과합니다.
  - 옛 레포별 등록(`hook.repo-*`)은 걷어냅니다. `core.hooksPath`는 지우지 않고 보고만 합니다. 이유는 `scripts/lib/git-hooks.mjs`의 `clearLegacyRepoHooks` 주석에 있습니다.
  - **git 2.54 이상이 필요합니다.** 낮은 버전은 설정 훅을 경고 없이 무시하므로, 훅을 등록하지 않고 sync가 오류로 중단합니다 (`winget upgrade --id Git.Git -e`).
- 아래 전역 검사 훅을 등록합니다. 훅마다 원본을 `~/.ai-contexts/<파일>`로 복사하고 `--global` 설정 훅으로 등록합니다.
  - 목록은 `scripts/environment/precommit-hooks.mjs`의 `PRECOMMIT_HOOKS`가 정본이고, 무엇을 어떤 범위로 왜 그렇게 검사하는지는 각 스크립트 머리 주석이 정본입니다.
  - 표 마지막 행(채용 레포 커밋 검사)을 뺀 훅은 어느 레포에서 커밋하든 돌며 **커밋을 막지 않고 경고만** 합니다.

| 훅 파일 | 등록 이름 | 검사 | 손으로 묻는 출구 |
|---|---|---|---|
| `scripts/hooks/check-count-hardcoding.mjs` | `hook.ai-contexts-count-hardcode.*` | 프롬프트 md의 개수 하드코딩·스텝 번호 범위 호명 | `node ~/.ai-contexts/check-count-hardcoding.mjs --report <md>` ([사용법](../../scripts/hooks/check-count-hardcoding.md)) |
| `scripts/hooks/check-wording.mjs` | `hook.ai-contexts-wording.*` | 프롬프트 md의 강조 라벨·약한 어휘·금지 표현·긴 줄 등 | `node ~/.ai-contexts/check-wording.mjs --report <md 또는 폴더>` ([사용법](../../scripts/hooks/check-wording.md)) |
| `scripts/hooks/check-coupling-patterns.mjs` | `hook.ai-contexts-coupling-patterns.*` | `meta/coupling.json`의 짝꿍 패턴이 실물 파일을 가리키는지 | 없음 |
| `scripts/hooks/check-md-size.mjs` | `hook.ai-contexts-md-size.*` | 프롬프트·스킬 md가 [크기 선](../../deploy/contexts/prompt-standards/file-layout.md#바탕-정의)을 넘었는지 | `node ~/.ai-contexts/check-md-size.mjs --report <md 또는 폴더>` ([사용법](../../scripts/hooks/check-md-size.md)) |
| `scripts/hooks/check-orphan-md.mjs` | `hook.ai-contexts-orphan-md.*` | 이번 커밋으로 어디서도 이름이 나오지 않게 된 프롬프트 md | 없음 |
| `scripts/hooks/check-guide-post-pair.mjs` | `hook.ai-contexts-guide-post-pair.*` | MP 가이드 `step<N>.md`와 블로그 포스트 중 한쪽만 있는지 | 없음 |
| `scripts/hooks/verify-cli-usage.mjs` | `hook.ai-contexts-cli-usage.*` | 인자 받는 `.mjs`에 사용법 짝 md가 있고 사용법이 그 md에만 있는지 | `node ~/.ai-contexts/verify-cli-usage.mjs <폴더>` ([사용법](../../scripts/hooks/verify-cli-usage.md)) |
| `deploy/hooks/recruitment-commit-guard.mjs` | commit-msg `hook.ai-contexts-recruitment-guard-msg.*`, pre-commit `hook.ai-contexts-recruitment-guard-staged.*` | 아래 채용 레포 커밋 검사 | 없음 |

- **낱말 훅**이 읽는 금지 표현 목록 `scripts/hooks/blocked-expressions.json`도 `~/.ai-contexts/`로 복사합니다. 사본이 없으면 금지 표현 범주만 건너뜁니다. 목록 고치는 법은 [사용법](../../scripts/hooks/blocked-expressions.md)에 있습니다.
- **문서 크기 훅**의 기준선·제외 설정은 `backlog` 레포의 `meta/md-size.json`에 있고, 그 파일이 없는 기기에서는 검사가 통째로 no-op 합니다.
- **채용 레포 커밋 검사**는 `~/WebstormProjects/recruitment/` 아래 레포에서만 돌며, 로컬 전용 맥락이 커밋에 실리거나 커밋 메시지 subject에 한글이 없으면 **커밋을 막습니다**. 판정 조건은 스크립트가 정본입니다.
- AC가 설치하거나 등록한 상태는 `~/.ai-contexts/environment-state.json`에 기록합니다.

## 제거

```bash
npm run unsync:environment
```

제거 명령은 AC marker block만 제거합니다.
PowerShell 7은 `sync:environment`가 직접 설치했다고 상태 파일에 기록된 경우에만 제거를 시도합니다. `~/autorun.cmd`는 내용이 AC가 쓴 것과 동일할 때만 삭제하고, `AutoRun` 레지스트리는 상태 파일에 AC 등록 기록이 있고 현재 값이 `@~/autorun.cmd`일 때만 제거합니다.

`.githooks` 배선(`hook.ai-contexts-githooks-*`)은 `unsync:environment`가 **되돌리지 않습니다**: 되돌리면 이 기기의 모든 레포에서 훅이 통째로 꺼져 커밋 검사가 조용히 사라집니다. 옛 레포별 등록(`hook.repo-*`) 정리도 `sync:environment`만 합니다.

전역 검사 훅("수행 작업"의 표)은 AC가 얹은 독립 기능이므로, `unsync:environment`가 등록을 해제하고 `~/.ai-contexts/`의 스크립트 사본도 제거합니다(AC가 쓴 내용과 동일할 때만: 사용자가 직접 고쳤으면 남겨둡니다).
훅 곁에 둔 데이터·상태 사본(`blocked-expressions.json`·`md-size-seen.json`)은 동일성 비교 없이 지웁니다.
