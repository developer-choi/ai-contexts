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
- `deploy/rules`, `deploy/contexts`, `deploy/agents`, `deploy/hooks`는 카테고리 단위로 복사한다.
- `deploy/skills`는 사용자 외부 스킬과 공존해야 하므로 항목 단위로 복사한다.
- `settings.json`은 통째 덮어쓰지 않고 얕게 머지해 `enabledPlugins` 같은 사용자 동적 필드를 보존한다.
- uninstall 시 `settings.json`은 통째 삭제하지 않고 deploy가 관리하는 top-level 키만 제거한다.
- `git wt-add` 글로벌 alias 등록/제거 동작을 유지한다.

## 로컬 스킬 배포

Codex 로컬 스킬은 각 레포의 `.agents/skills`에 있어야 하지만, 이 저장소의 운영 원칙상 로컬 스킬의 원본은 `.claude/skills`다.

그래서 별도 명령을 추가했다.

```bash
npm run deploy-local-skills
```

이 명령은 기본으로 `~/WebstormProjects/main/`, `~/WebstormProjects/my-else/` 하위 1뎁스 git 레포를 순회하며, 각 레포의 `.claude/skills`를 `.agents/skills`로 생성/갱신한다.

로컬 스킬을 수정할 때는 `.agents/`를 직접 수정하지 말고 `.claude/`를 수정한 뒤 다시 배포한다.
