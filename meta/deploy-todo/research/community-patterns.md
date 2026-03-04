# 리서치: 커뮤니티 공통 패턴

> 조사일: 2026-03-02

Claude Code 설정을 관리하는 커뮤니티에서 반복적으로 나타나는 패턴을 정리.

---

## 수렴하는 패턴

### 1. dotfiles 레포에 Claude 설정 포함

대부분 기존 dotfiles 레포에 `.claude/` 디렉토리를 추가하거나, Claude 전용 레포를 만든다.

- [hsablonniere/dotfiles](https://github.com/hsablonniere/dotfiles) — Stow 기반
- [freekmurze/dotfiles](https://github.com/freekmurze/dotfiles) — 커스텀 스크립트
- [stevenmays/dotfiles](https://github.com/stevenmays/dotfiles/tree/master/ai/claude) — 커스텀 스크립트
- [ooloth/dotfiles](https://github.com/ooloth/dotfiles) — 커스텀 스크립트
- [mizchi/chezmoi-dotfiles](https://github.com/mizchi/chezmoi-dotfiles) — chezmoi

### 2. `~/.claude/CLAUDE.md`를 전역 개인 규칙으로 사용

프로젝트와 무관하게 적용할 개인 선호(톤, 언어, 스타일)를 전역 CLAUDE.md에 작성.

- [Claude Code Memory 공식 문서](https://code.claude.com/docs/en/memory)
- [Freek: My Claude Code Setup](https://freek.dev/3026-my-claude-code-setup)

### 3. `~/.claude/rules/`에 전역 규칙 파일 배치

주제별로 `.md` 파일을 나눠서 rules/ 폴더에 넣는다.

- [Claude Code Settings 공식 문서](https://code.claude.com/docs/en/settings)

### 4. `~/.claude/skills/`에 개인 스킬 배치

반복 워크플로를 스킬로 정의하여 재사용.

- [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills)
- [zircote/.claude](https://github.com/zircote/.claude) — 에이전트, 스킬, 커맨드, 문서 포함

### 5. 프로젝트별 공유 규칙은 심링크로 연결

프로젝트의 `.claude/rules/`에 공통 레포의 규칙을 심링크로 가져온다.

- [waki285: AI 에이전트 지시문 표준화](https://zenn.dev/waki285/articles/chezmoi-dotfiles?locale=en) — 여러 에이전트를 하나의 소스에서 관리

### 6. `CLAUDE.local.md`를 개인 프로젝트별 설정으로 사용

`.gitignore`에 추가하여 개인 설정을 프로젝트에 넣되 공유하지 않는다.

- [Claude Code Memory 공식 문서](https://code.claude.com/docs/en/memory)

---

## 관련 글

- [Hubert Sablonniere: Dotfiles + Claude Code](https://www.hsablonniere.com/dotfiles-claude-code-my-tiny-config-workshop--95d5fr/)
- [Dylan Bochman: Dotfiles for AI-Assisted Development](https://dylanbochman.com/blog/2026-01-25-dotfiles-for-ai-assisted-development/)
- [NovaAI: Dotfiles Sync Guide](https://github.com/NovaAI-innovation/claude-code-mastery/blob/main/docs/guides/dotfiles-sync.md)
