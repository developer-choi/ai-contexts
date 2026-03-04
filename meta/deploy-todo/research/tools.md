# 리서치: Claude Code 설정 관리 전용 도구

> 조사일: 2026-03-02

배포 방식(Stow, chezmoi 등)과는 별개로, Claude Code 설정 관리에 특화된 도구들.

---

## 도구 목록

| 도구 | 설명 | URL |
|---|---|---|
| **Shai CLI** | AI 설정의 npm. `shai install <name>`으로 커뮤니티 설정 설치 | [shaicli.dev](https://shaicli.dev/) |
| **ClaudeCTX** | `claudectx work` / `claudectx personal`로 프로필 전환 | [foxj77/claudectx](https://github.com/foxj77/claudectx) |
| **CCCS** | 데스크톱 앱 + 시스템 트레이로 프로필 전환 | [breakstring/cccs](https://github.com/breakstring/cccs) |
| **dot-claude-sync** | git worktree 간 `.claude/` 동기화 (Go CLI) | [yugo-ibuki/dot-claude-sync](https://github.com/yugo-ibuki/dot-claude-sync) |
| **Claude Sync** | age 암호화 + 클라우드 스토리지(S3, R2, GCS)로 크로스 머신 동기화 | — |

---

## 참고 링크

### Awesome 리스트

| 리소스 | URL | 설명 |
|---|---|---|
| awesome-claude-code (메인) | [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 스킬, 훅, 커맨드, 에이전트, 플러그인 |
| awesome-claude-code (2) | [jqueryscript/awesome-claude-code](https://github.com/jqueryscript/awesome-claude-code) | 도구, IDE 통합, 프레임워크 |
| awesome-claude-skills | [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) | 스킬, 워크플로 커스텀 |
| awesome-claude-skills (2) | [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | 스킬, 리소스, 도구 |
| awesome-claude-code-subagents | [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | 100+ 서브에이전트 |
| awesomeclaude.ai | [awesomeclaude.ai](https://awesomeclaude.ai/) | 시각적 디렉토리 |
| claude-hub.com | [claude-hub.com](https://www.claude-hub.com/) | 리소스 디렉토리 + 웹훅 서비스 |

### 관련 글

- [Shai CLI DEV 블로그](https://dev.to/sebasjimenezvel/i-got-mass-downvoted-for-sharing-my-claude-configuration-so-i-built-a-tool-to-fix-this-aij)
- [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills)
- [settings.json in Claude Code (eesel.ai)](https://www.eesel.ai/blog/settings-json-claude-code)
- [Global Instructions for Claude Code CLI (Medium)](https://naqeebali-shamsi.medium.com/the-complete-guide-to-setting-global-instructions-for-claude-code-cli-cec8407c99a0)
