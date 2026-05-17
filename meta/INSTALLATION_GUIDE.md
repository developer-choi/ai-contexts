# Installation Guide

> 이 가이드는 AI 에이전트가 읽고 따라 실행하는 것을 전제로 작성되었습니다.

## 프롬프트 가져가기

레포: https://github.com/developer-choi/ai-contexts

`deploy/` 폴더가 배포 소스입니다. 필요한 파일을 여기서 가져가세요.

> 현재 컴퓨터간 프롬프트 공유방법은 간단하게 마무리 해놓고, 공유 할 프롬프트 위주로 업데이트하고있는 단계여서 그렇습니다.

## 배포 (현재: 복사 방식)

Windows에서 배포 진입점을 Node로 바꾼 배경은 [Windows Node Deploy Migration](../archives/windows-node-deploy-migration.md)에 정리되어 있습니다.

### 갱신

```bash
npm run update
```

기본 타겟은 `~/.claude`입니다. 다른 경로로 배포하려면 `npm run update -- <타겟>`.

수행 작업 (순서):

1. 기존 배포 파일 삭제 (`scripts/uninstall.js` 로직 자동 호출)
2. `deploy/`의 카테고리 폴더(`rules/`, `contexts/`, `hooks/`)를 타겟에 통째로 복사
3. `deploy/skills/` 하위는 사용자가 보존하는 외부 스킬과 공존해야 하므로 항목 단위로 복사
4. `deploy/` 루트의 단독 파일과 Claude 설정을 타겟에 배포
   - `claude-settings.json`: `~/.claude/settings.json`에 얕은 머지 — `deploy/claude-settings.json`의 top-level 키만 타겟에 덮어쓰고, 그 외 키(예: `enabledPlugins` 같은 사용자/Claude UI 동적 필드)는 보존
   - 그 외 파일(`CLAUDE.md` 등): 통째 덮어쓰기
5. 검증 — 일반 파일은 `diff -rq`로 동일성, `settings.json`은 deploy의 top-level 키가 타겟에 deepEqual로 존재하는지 확인 (추가 키는 무시)
6. 글로벌 git alias `wt-add` 등록 — 모든 레포에서 `git wt-add <branch> <path> [base]`로 새 worktree 생성 + `npm ci`(package.json 있을 때) 자동 실행
7. 기본 타겟으로 실행한 경우 Codex 전역 자산도 함께 배포
   - `deploy/contexts/` → `~/.codex/contexts/`
   - `deploy/skills/` → `~/.codex/skills/` (`.system`은 보존)
   - `deploy/hooks/` → `~/.codex/hooks/`
   - `deploy/codex-hooks.json` → `~/.codex/hooks.json`
   - `deploy/CLAUDE.md` + `deploy/rules/global.md` → `~/.codex/AGENTS.md`
   - Codex hook 설정은 AC가 전체 소유하므로 기존 `~/.codex/hooks.json`은 보존하지 않고 통째 덮어씁니다.
   - Codex 전역 지시문은 AC가 전체 소유하므로 기존 `~/.codex/AGENTS.md`는 보존하지 않고 통째 덮어씁니다.
   - Codex non-managed hook은 trusted 상태가 아니면 실행되지 않으므로, 배포 후 가능하면 app-server `hooks/list`의 `currentHash`를 읽어 `~/.codex/config.toml`의 `[hooks.state] trusted_hash`를 함께 갱신합니다.
   - hook 신뢰 갱신에는 실행 가능한 Codex CLI가 필요합니다. 스크립트는 `CODEX_CLI`, PATH, Codex Desktop의 버전별 로컬 bin 경로 순서로 찾고, 최소 실행 검증에 실패하는 WindowsApps 패키지 내부 경로는 사용하지 않습니다.
   - Windows Desktop 설치에 따라 외부 `codex app-server` 실행이 막히면 이 단계는 경고만 출력하고 계속 진행합니다. 이 경우에도 `~/.codex` 자산 배포 자체는 성공합니다.

`npm run update`는 Node 스크립트(`scripts/update.js`)로 실행됩니다. Windows/PowerShell 환경에서 bash 실행 정책이나 `.sh` 줄바꿈에 의존하지 않습니다.

Claude/Codex hook 정책은 다음 명령으로 종류별 deny/pass matrix를 함께 검증합니다.

### 언인스톨

```bash
npm run uninstall
```

타겟 경로를 대화형으로 물어봅니다 (기본값 `~/.claude`). 인자로 지정하려면 `npm run uninstall -- <타겟>`.

수행 작업:

- 카테고리 폴더(`rules/`, `contexts/`, `hooks/`) 통째 삭제
- 과거 전역 agent 배포 산출물인 `agents/`도 함께 삭제
- `skills/` 하위에서 보존 목록(`vercel-composition-patterns`, `vercel-react-best-practices`, `web-design-guidelines`) 제외하고 모두 삭제
- `deploy/` 루트와 같은 이름의 파일 삭제
  - 단, `settings.json`은 통째 삭제하지 않고 `deploy/claude-settings.json`의 top-level 키만 타겟에서 제거. 사용자 동적 필드(`enabledPlugins` 등)는 보존. 남은 객체가 비면 파일 삭제
- 글로벌 git alias `wt-add` 제거
- 기본 타겟(`~/.claude`) 언인스톨 시 Codex 전역 자산도 함께 제거
  - `~/.codex/contexts/`
  - `~/.codex/hooks/`
  - `~/.codex/hooks.json`
  - `~/.codex/AGENTS.md`
  - `~/.codex/skills/` 하위에서 보존 목록 제외

### 로컬 스킬 배포

```bash
npm run deploy-local-skills
```

기본으로 `~/WebstormProjects/main/`, `~/WebstormProjects/my-else/` 하위 1뎁스 git 레포를 순회합니다.

각 레포에서 아래 로컬 Codex 산출물을 생성/갱신합니다.

- `.claude/skills`가 있으면 `.agents/skills`로 복사
- 레포 루트 `CLAUDE.md`가 있으면 레포 루트 `AGENTS.md`로 복사

특정 루트만 지정하려면:

```bash
npm run deploy-local-skills -- ~/WebstormProjects/main
```
