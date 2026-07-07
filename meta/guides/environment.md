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
- `~/WebstormProjects/<group>/<repo>` 중 `.githooks`가 추적되는 레포마다 `core.hooksPath`를 `.githooks`로 멱등하게 세팅합니다. 각 레포의 `prepare`(= `git config core.hooksPath .githooks`)가 `npm install` 때 이미 박지만, install을 아직 안 한 클론(git pull만 한 다른 머신 등)의 훅이 조용히 꺼지는 창을 이 스윕이 닫습니다. 이미 `.githooks`면 건드리지 않습니다.
- AC가 설치하거나 등록한 상태는 `~/.ai-contexts/environment-state.json`에 기록합니다.

## 제거

```bash
npm run unsync:environment
```

제거 명령은 AC marker block만 제거합니다. PowerShell 7은 `sync:environment`가 직접 설치했다고 상태 파일에 기록된 경우에만 제거를 시도합니다. `~/autorun.cmd`는 내용이 AC가 쓴 것과 동일할 때만 삭제하고, `AutoRun` 레지스트리는 상태 파일에 AC 등록 기록이 있고 현재 값이 `@~/autorun.cmd`일 때만 제거합니다.

`.githooks` hooksPath 스윕은 `unsync:environment`가 **되돌리지 않습니다** — 그 값은 AC가 주입한 환경 오염이 아니라 각 레포가 스스로(각자의 `prepare`로도) 세팅하는 레포 고유 설정이라, 되돌리면 오히려 그 레포의 훅이 꺼집니다.

## 반복 실행 기준

`sync:environment`는 여러 번 실행해도 PowerShell profile block이나 global gitignore pattern을 중복 추가하지 않아야 합니다. 기존 `ai-contexts` 또는 `test-playground` marker는 새 AC marker로 이관합니다. `~/autorun.cmd`와 `AutoRun` 레지스트리도 같은 값으로 수렴하며 중복 등록하지 않습니다.

## 새 머신 기준

새 머신에서는 의존성 설치 후 가장 먼저 실행합니다.

```bash
npm ci
npm run sync:environment
```

이 명령은 사용자 환경을 바꾸므로 `unsync:environment`가 되돌릴 수 있는 대상과 되돌리지 않을 대상을 가이드에 함께 기록해야 합니다.
