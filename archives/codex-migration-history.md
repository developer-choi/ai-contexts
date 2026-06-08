# Codex Migration History

## 목적

AC의 Claude Code 중심 컨텍스트 자산을 Codex에서도 같은 원본으로 배포하고 검증할 수 있게 만든 기록이다. 이후 Claude/Codex 외 다른 런타임을 추가할 때, 무엇을 공통화했고 무엇을 런타임별 어댑터로 분리했는지 판단 기준으로 사용한다.

## 핵심 결정

- 전역 자산의 원본은 `deploy/` 한 벌로 유지한다.
- Claude 전역 배포 대상은 `~/.claude`, Codex 전역 배포 대상은 `~/.codex`로 분리하되, 배포 스크립트는 같은 정책 파일을 사용한다.
- Codex 전역 지시문은 `deploy/CLAUDE.md`와 `deploy/rules/global.md`를 합성한 `~/.codex/AGENTS.md`로 배포한다.
- Codex 전역 스킬은 `deploy/skills/`를 `~/.codex/skills/`로 복사한다. Codex가 관리하는 `~/.codex/skills/.system`은 보존한다.
- Codex 공통 컨텍스트는 `deploy/contexts/`를 `~/.codex/contexts/`로 복사한다.
- Codex hook 원본은 `deploy/codex-hooks.json`, hook 구현 원본은 `deploy/hooks/`로 둔다.
- Claude 설정 파일인 `deploy/claude-settings.json`은 Claude 전용으로 유지하고 Codex 설정에 그대로 merge하지 않는다.
- 프로젝트 로컬 스킬 원본은 `.claude/skills`이고, Codex용 `.agents/skills`는 배포 산출물로만 다룬다.
- 프로젝트 루트 `CLAUDE.md`는 Codex용 루트 `AGENTS.md`로 복사한다. `.claude/CLAUDE.md`는 로컬 Codex 지시문 원본으로 쓰지 않는다.

## 배포 스크립트 정리

- `npm run sync:system`과 `npm run unsync:system`을 shell script 기반에서 Node 엔트리포인트로 전환했다.
- Windows/PowerShell/CRLF/WSL 경로 차이 때문에 표준 배포 명령이 실패하던 문제를 제거했다.
- `.gitattributes`와 `.editorconfig`로 텍스트 파일의 UTF-8/LF 정책을 고정했다.
- `scripts/sync-system.js`가 Claude와 Codex 전역 자산을 함께 배포하고 검증한다.
- `scripts/unsync-system.js`가 sync와 같은 기준으로 Claude/Codex 전역 자산을 제거한다.
- `npm run sync:local-system`을 추가해 각 레포의 `.claude/skills`를 `.agents/skills`로, 루트 `CLAUDE.md`를 루트 `AGENTS.md`로 배포하고, AC 전용으로 `local/`을 `.claude/settings.json`·`.codex/hooks.json`에 projection한다.
- `repo-sync` 후속 단계에서 `npm run sync:system`과 `npm run sync:local-system`을 모두 실행하도록 정리했다.
- `git wt-add` alias가 새 worktree 생성 후 `npm ci`까지 실행하게 해 husky shim 누락을 줄였다.

## Codex 전역 자산

- `deploy/skills/`는 `~/.codex/skills/`로 배포한다.
- `deploy/contexts/`는 `~/.codex/contexts/`로 배포한다.
- `deploy/hooks/`는 `~/.codex/hooks/`로 배포한다.
- `deploy/codex-hooks.json`은 `~/.codex/hooks.json`으로 배포한다.
- `deploy/CLAUDE.md`와 `deploy/rules/global.md`는 `~/.codex/AGENTS.md`로 합성한다.
- 기존 `~/.codex/hooks.json`과 `~/.codex/AGENTS.md`는 AC가 전체 소유하므로 통째 덮어쓴다.
- `~/.codex/skills/.system`은 Codex 런타임 소유이므로 sync/unsync 대상에서 제외한다.

## Hook 정책

- Claude/Codex hook 설정은 JSON 안에 정책 구현을 inline으로 넣지 않고 `deploy/hooks/`의 공통 정책 파일을 호출한다.
- auto-stage, shell, git staging, git commit, git push, team message 정책을 파일별로 분리했다.
- Codex hook 배포 후 Codex app-server `hooks/list`의 `currentHash`를 읽어 `~/.codex/config.toml`의 `[hooks.state] trusted_hash`를 갱신한다.
- Codex non-managed hook은 trusted 상태가 아니면 실행되지 않으므로, 신뢰 갱신까지 sync 검증 범위에 포함했다.
- reset 계열, staging 우회, commit 우회, package runner 우회, mojibake commit, protected branch push, force push code diff, SendMessage shutdown, PostToolUse auto-stage, 정상 허용 케이스를 Claude/Codex 양쪽에서 검증했다.
- `codex exec`와 app-server `turn/start`에서는 trusted `PreToolUse`가 호출되어 mixed reset을 차단함을 확인했다.
- 현재 Desktop thread의 개발자 도구 실행 경로는 `~/.codex/hooks.json`을 거치지 않으므로, 그 경로에서 hook이 안 보이는 현상은 배포 hook 실패 근거로 보지 않는다.

## Agent와 위임 구조

- 과거 전역 agent 배포 산출물인 `agents/`는 sync/unsync 과정에서 제거한다.
- 새 전역 `deploy/agents` 디렉터리는 배포하지 않는다.
- `deploy/agents/refine-writer.md` 역할은 `deploy/skills/write-refine/SKILL.md`에 내재화했다.
- `deploy/contexts/team-agent.md`를 런타임별 에이전트 어댑터 문서로 만들었다.
- Claude Code에서 Agent Teams를 사용할 수 있으면 `TeamCreate`와 `SendMessage`를 사용하되 `team_name`을 지정한다.
- Codex처럼 `TeamCreate`/`SendMessage`가 없는 환경에서는 현재 세션의 subagent 도구로 대체하고, 불가능하면 메인이 직접 수행한다.
- `write-refine`, `pre-exit`, `scw`, `full-refresh`, `pr-comment-write`의 Claude 전용 직접 지시를 제거하거나 런타임 중립 문구로 정리했다.
- `/workflow` 스킬은 이번 마이그레이션 정리 범위에서 제외했다.

## Skill Creator 검증

- Codex 시스템 스킬 `~/.codex/skills/.system/skill-creator/SKILL.md`가 제공됨을 확인했다.
- `init_skill.py`는 임시 스킬 생성 smoke를 통과했다.
- `generate_openai_yaml.py --name ...`는 PyYAML 없이도 smoke를 통과했다.
- `generate_openai_yaml.py`를 `--name` 없이 실행하면 SKILL.md frontmatter를 읽기 위해 PyYAML이 필요하다.
- `quick_validate.py`는 시작 시 `import yaml`을 수행하므로 PyYAML이 없으면 실패한다.
- 기본 Python과 Codex 번들 Python 모두 초기 상태에서는 PyYAML이 없었다.
- 같은 Python으로 `%TEMP%` 하위 target에 `python -m pip install --target <target> PyYAML`을 실행하고, 해당 명령 세션에서 `PYTHONPATH=<target>`를 지정하면 `quick_validate.py`와 `generate_openai_yaml.py`가 통과했다.
- `init_skill.py`가 만든 기본 `description: [TODO: ...]`는 YAML 리스트로 해석되어 validator가 실패한다. 실제 문자열 description으로 채운 뒤 검증해야 한다.
- 이 절차는 `.claude/skills/scw/guide.md`에 반영했다.

## Smoke와 검증

- `npm run sync:system`이 Claude/Codex 전역 자산 배포, 검증, Codex hook trust 갱신까지 통과했다.
- `npm run sync:local-system -- <worktree>`가 `.claude/skills`에서 `.agents/skills`로, `CLAUDE.md`에서 `AGENTS.md`로 배포를 통과했다.
- Codex 글로벌 스킬이 `~/.codex/contexts/` 아래 공통 컨텍스트를 상대경로로 읽을 수 있음을 확인했다.
- Codex가 `~/.codex/skills/<skill>/SKILL.md`와 `~/.codex/contexts/` 상대 참조를 함께 로드할 수 있음을 확인했다.
- `~/.codex/AGENTS.md`가 Codex 전역 지시문으로 새 세션에서 로드되는 것을 간접 프롬프트로 확인했다.
- `write-init`에서 `write-refine`으로 이어지는 흐름을 실제 임시 패키지로 smoke했다.
- Codex 세션에서 scw trigger eval 절차를 실행했다. `bench-trigger.py --help` 정상, `claude.exe` 감지, smoke eval 통과를 확인했다.

## 사고와 후속 조치

- Windows에서 `npm run sync:system`이 PowerShell 실행 정책, npm shim, CRLF bash 실행, WSL 경로 변환에 연쇄적으로 걸려 실패했다. 배포 진입점을 Node로 전환해 해결했다.
- Codex hook trust 갱신 중 `spawn EPERM`이 발생했다. 원인은 `resolveCodexCli()`가 WindowsApps 내부 `codex.exe` 파일 존재만 보고 실행 가능한 CLI로 오판한 것이다.
- `resolveCodexCli()`는 `CODEX_CLI`, PATH, Codex Desktop 로컬 bin, WindowsApps 후보 순으로 실제 `--version` 실행 검증을 통과한 CLI만 선택하도록 바꿨다.
- 세부 회고는 [windows-node-deploy-migration.md](windows-node-deploy-migration.md)에 남겼다.

## 다음 런타임을 추가할 때

- 먼저 런타임별 전역 지시문, 스킬, 컨텍스트, hook, 로컬 프로젝트 지시문의 로딩 위치를 분리해서 조사한다.
- 공통 원본을 늘리지 말고 기존 `deploy/` 자산을 새 런타임 산출물로 변환하는 배포 계층을 추가한다.
- 런타임 전용 설정 파일은 별도 원본으로 두되, 정책 구현은 가능한 한 `deploy/hooks/` 같은 공통 파일을 재사용한다.
- 시스템이 소유하는 디렉터리나 파일은 sync/unsync에서 보존한다.
- sync가 새 대상을 배포하면 unsync도 같은 기준으로 제거하게 만든다.
- 외부 CLI 경로는 파일 존재가 아니라 실제 최소 명령 실행으로 검증한다.
- 에이전트 기능명은 프롬프트 본문에 직접 흩뿌리지 말고 `deploy/contexts/team-agent.md` 같은 중앙 어댑터를 경유한다.
- 스킬 생성/검증 도구는 "스킬이 존재한다"와 "검증 스크립트 의존성이 갖춰졌다"를 분리해서 테스트한다.
- 완료 후 로드맵에는 잔여 작업만 남기고, 완료 이력은 `archives/`로 이관한다.
