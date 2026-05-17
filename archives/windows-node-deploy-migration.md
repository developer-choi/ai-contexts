# Windows Node Deploy Migration

## 배경

2026-05-13 Codex가 Windows 환경에서 `npm run update`를 한 번에 성공시키지 못했다. 표준 배포 명령은 하나였지만 실제 실행 경로는 PowerShell, npm shim, bash, WSL, Git 줄바꿈 설정의 영향을 동시에 받았다.

실패 흐름은 다음과 같았다.

1. PowerShell 실행 정책 때문에 `npm.ps1` 호출이 막혔다.
2. `npm.cmd run update`로 우회했지만, `scripts/update.sh`의 CRLF 줄바꿈 때문에 bash 실행이 실패했다.
3. 임시 LF 사본을 만들어 실행하려 했으나 WSL 경로(`/mnt/c/...`) 변환과 helper script 복사 누락 때문에 추가 실패가 발생했다.
4. 결국 `scripts/` 전체를 임시 LF 사본으로 복사한 뒤에야 배포가 성공했다.

문제의 핵심은 사용자가 어떤 셸을 쓰는지가 아니었다. `npm run update`라는 표준 명령이 내부에서 `.sh` 실행과 줄바꿈 상태에 의존하고 있었고, Windows에서 Codex가 그 의존성을 안정적으로 진단하기 어려웠다는 점이다.

## 결정

배포의 진입점은 Node로 전환한다.

- `npm run update`는 `node scripts/update.js`를 실행한다.
- `npm run uninstall`은 `node scripts/uninstall.js`를 실행한다.
- 기존 `scripts/update.sh`, `scripts/uninstall.sh`는 제거한다. 표준 진입점은 `npm run update`와 `npm run uninstall`이며, 내부에서는 Node 스크립트만 호출한다.
- 레포에는 `.gitattributes`와 `.editorconfig`를 추가해 텍스트 파일의 UTF-8/LF 정책을 고정한다.

이 결정은 PowerShell을 쓰지 않겠다는 뜻이 아니다. 셸 종류와 줄바꿈 상태가 배포 성공 여부를 좌우하지 않게 만들겠다는 뜻이다.

## 보존해야 하는 기존 동작

Node 전환은 단순 포팅이 아니라 기존 배포 의미를 그대로 유지해야 한다.

- 배포 전 기존 배포 파일을 제거해 고아 파일을 방지한다.
- `deploy/rules`, `deploy/contexts`, `deploy/hooks`는 카테고리 단위로 복사한다.
- `deploy/skills`는 사용자 외부 스킬과 공존해야 하므로 항목 단위로 복사한다.
- `settings.json`은 통째 덮어쓰지 않고 얕게 머지해 `enabledPlugins` 같은 사용자 동적 필드를 보존한다.
- uninstall 시 `settings.json`은 통째 삭제하지 않고 deploy가 관리하는 top-level 키만 제거한다.
- 과거 전역 agent 배포 산출물인 `agents/`는 uninstall/update 과정에서 제거한다. 전역 작업자 지시문은 별도 `deploy/agents`로 배포하지 않고 필요한 스킬 본문에 내장한다.
- `git wt-add` 글로벌 alias 등록/제거 동작을 유지한다.

## 로컬 스킬 배포

Codex 로컬 스킬은 각 레포의 `.agents/skills`에 있어야 하지만, 이 저장소의 운영 원칙상 로컬 스킬의 원본은 `.claude/skills`다.

그래서 별도 명령을 추가했다.

```bash
npm run deploy-local-skills
```

이 명령은 기본으로 `~/WebstormProjects/main/`, `~/WebstormProjects/my-else/` 하위 1뎁스 git 레포를 순회하며, 각 레포의 `.claude/skills`를 `.agents/skills`로 생성/갱신한다.

로컬 스킬을 수정할 때는 `.agents/`를 직접 수정하지 말고 `.claude/`를 수정한 뒤 다시 배포한다.

## 후속 사고: Codex CLI 경로 탐색 실패

2026-05-17 Codex 마이그레이션 브랜치에서 `npm run update`를 실행했을 때 Claude/Codex 파일 복사와 검증은 통과했지만, Codex hook trust 갱신 단계에서 `spawn EPERM`이 발생했다.

실패 지점은 `trustCodexHooks()`가 `codex app-server --listen stdio://`를 실행하는 부분이었다. `resolveCodexCli()`는 PATH와 후보 경로에서 `codex.exe` 파일 존재 여부만 확인했고, WindowsApps 패키지 내부 경로를 실행 가능한 CLI로 오판했다.

문제 경로:

```text
C:\Program Files\WindowsApps\OpenAI.Codex_...\app\resources\codex.exe
```

이 파일은 존재하지만 PowerShell과 Node `child_process.spawn()` 양쪽에서 직접 실행하면 Access denied / `EPERM`이 발생했다. 반면 실제 실행 가능한 Codex CLI는 Codex Desktop이 사용자 로컬 영역에 둔 버전별 bin 경로에 있었다.

실행 가능 경로:

```text
C:\Users\forwo\AppData\Local\OpenAI\Codex\bin\<version-hash>\codex.exe
```

수정 원칙:

- Windows에서 "파일이 존재한다"는 "Node가 spawn할 수 있다"와 다르다.
- 외부 CLI 후보는 `fs.statSync().isFile()`만으로 확정하지 않고, 최소 명령(`--version`)을 실제 실행해 검증한다.
- Codex Desktop의 버전별 로컬 bin 디렉터리를 WindowsApps 후보보다 먼저 탐색한다.
- WindowsApps 내부 경로는 fallback 후보로 남기되, 실행 검증이 실패하면 사용하지 않는다.

처리 결과:

- `resolveCodexCli()`가 `CODEX_CLI`, PATH, Codex Desktop 버전별 로컬 bin, WindowsApps 후보 순서로 실행 가능한 CLI를 찾도록 변경했다.
- `npm run update` 재실행 결과 Codex 전역 자산 배포, `TRUST hooks.state`, Codex 검증이 모두 통과했다.
- `npm run deploy-local-skills -- <현재 워크트리>`로 로컬 `.claude/skills` → `.agents/skills`, `CLAUDE.md` → `AGENTS.md` 배포도 통과했다.

이 사고는 Node 전환 결정 자체의 실패가 아니라, Node 전환 이후 남은 Windows 실행 파일 탐색 문제였다. 배포 스크립트가 외부 CLI를 호출해야 한다면 경로 발견과 실행 가능성 검증을 분리하지 말아야 한다.
