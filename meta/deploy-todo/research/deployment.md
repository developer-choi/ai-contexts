# 리서치: 배포 방식

> 조사일: 2026-03-02

`~/.claude/`에 설정을 배포하는 메커니즘과 도구별 정리.

---

## 메커니즘: 심링크 vs 복사

모든 도구는 결국 두 메커니즘 중 하나를 사용한다:

- **심링크**: `~/.claude/` 안의 파일이 레포를 가리킴 (Stow, 커스텀 `ln -sf`)
- **복사**: 레포에서 `~/.claude/`로 파일을 복사 (chezmoi, 커스텀 `cp -r`)

---

## 도구별 상세

### GNU Stow (심링크)

dotfiles 레포에서 `stow -t ~ claude` 한 줄로 `~/.claude/` 심링크 생성.

- **장점**: 단순, 의존성 거의 없음 (Perl만), 1993년부터 검증됨
- **단점**: 머신별 분기 불가, 시크릿 암호화 없음, [심링크 탐색 버그 #764](https://github.com/anthropics/claude-code/issues/764) 보고됨
- **사례**:
  - [hsablonniere/dotfiles](https://github.com/hsablonniere/dotfiles)
  - [Mark Biek 블로그](https://mark.biek.org/2025/08/revamping-my-dotfiles-setup/)

### chezmoi (복사)

템플릿(머신별 분기) + age/gpg 암호화 + 원커맨드 부트스트랩.

- **장점**: 머신별 차이 처리, 시크릿 암호화, 새 머신에서 한 줄 설치
- **단점**: 템플릿 문법 학습 필요, Stow보다 복잡
- **판단**: 제외 — `.claude/` 하나만 관리하는 구조에서 머신별 분기나 암호화는 불필요
- **사례**:
  - [mizchi/chezmoi-dotfiles](https://github.com/mizchi/chezmoi-dotfiles)
  - [Arun's blog: chezmoi + age로 Claude Code 동기화](https://www.arun.blog/sync-claude-code-with-chezmoi-and-age/)
  - [waki285: chezmoi로 AI 에이전트 지시문 표준화](https://zenn.dev/waki285/articles/chezmoi-dotfiles?locale=en)

### Nix / home-manager (복사)

선언적으로 전체 시스템 설정을 관리.

- **장점**: 완전 재현 가능, 원자적 롤백
- **단점**: 학습곡선 매우 높음, Nix 안 쓰면 오버킬
- **판단**: 제외 — Nix를 쓰지 않는 환경
- **사례**:
  - [ryoppippi/dotfiles](https://github.com/ryoppippi/dotfiles/blob/main/CLAUDE.md)
  - [i9wa4/dotfiles](https://deepwiki.com/i9wa4/dotfiles/6.3-skills-agents-and-rules)

### 커스텀 스크립트 (심링크 or 복사)

직접 만든 스크립트(`scripts/update.sh` 등)나 Makefile로 복사/심링크.

- **장점**: 완전한 통제, 의존성 없음
- **단점**: 직접 유지보수, 템플릿/암호화 기능 없음
- **사례**:
  - [freekmurze/dotfiles](https://github.com/freekmurze/dotfiles) — [블로그](https://freek.dev/3026-my-claude-code-setup)
  - [stevenmays/dotfiles](https://github.com/stevenmays/dotfiles/tree/master/ai/claude)
  - [ooloth/dotfiles](https://github.com/ooloth/dotfiles)

### 전용 .claude 레포 (심링크)

`.claude/` 자체를 독립 레포로 관리. clone 후 심링크.

- **장점**: 관심사 분리 깔끔, fork/공유 쉬움
- **단점**: 레포 루트 = `~/.claude/`이므로 관리용 파일이 Claude 접근 범위에 들어감
- **판단**: 제외 — 레포 구조를 자유롭게 쓸 수 없음
- **사례**:
  - [zircote/.claude](https://github.com/zircote/.claude)
  - [centminmod/my-claude-code-setup](https://github.com/centminmod/my-claude-code-setup)

---

## 비교표

| 방식 | 메커니즘 | 크로스 머신 | 머신별 분기 | 시크릿 처리 | 복잡도 | 의존성 |
|---|---|---|---|---|---|---|
| GNU Stow | 심링크 | git push/pull | 없음 | 없음 | 낮음 | Perl |
| chezmoi | 복사 | git push/pull | 템플릿 | age/gpg | 중간 | chezmoi |
| Nix | 복사 | git push/pull | Nix 표현식 | sops-nix | 높음 | Nix |
| 커스텀 스크립트 | 둘 다 | git push/pull | 수동 분기 | 수동 | 낮음 | 없음 |
| 전용 .claude 레포 | 심링크 | git push/pull | 없음 | 수동 | 낮음 | 없음 |

---

## 참고 링크

- [Claude Code Memory 공식 문서](https://code.claude.com/docs/en/memory) — CLAUDE.md 계층 구조
- [Claude Code Settings 공식 문서](https://code.claude.com/docs/en/settings) — settings.json 계층
- [심링크 탐색 버그 #764](https://github.com/anthropics/claude-code/issues/764)
- [계정 수준 설정 동기화 요청 #22648](https://github.com/anthropics/claude-code/issues/22648)
- [Hubert Sablonniere: Dotfiles + Claude Code](https://www.hsablonniere.com/dotfiles-claude-code-my-tiny-config-workshop--95d5fr/)
- [Freek Van der Herten: My Claude Code Setup](https://freek.dev/3026-my-claude-code-setup)
- [Arun: Sync Claude Code with chezmoi and age](https://www.arun.blog/sync-claude-code-with-chezmoi-and-age/)
- [Mark Biek: Revamping My Dotfiles Setup](https://mark.biek.org/2025/08/revamping-my-dotfiles-setup/)
- [Dylan Bochman: Dotfiles for AI-Assisted Development](https://dylanbochman.com/blog/2026-01-25-dotfiles-for-ai-assisted-development/)
- [NovaAI: Dotfiles Sync Guide](https://github.com/NovaAI-innovation/claude-code-mastery/blob/main/docs/guides/dotfiles-sync.md)
- [Sync Claude Code Sessions Across Devices (Medium)](https://medium.com/codex/sync-your-claude-code-sessions-across-all-devices-2e407c2eb160)
