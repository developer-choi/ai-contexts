## 의사결정 과정

### 목표

여러 프로젝트에서 공통으로 사용하는 AI 컨텍스트(instructions)를 중앙에서 관리하고, 어떤 PC에서든 동일한 Claude Code 환경을 유지한다.

### 결정 1: 어디에 둘 것인가?

| 선택지 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **A. 각 프로젝트 레포에 복사** | 프로젝트마다 instructions/ 폴더를 둠 | 프로젝트 독립적 | 중복, 동기화 지옥 |
| **B. `~/.claude/`에 전역으로** | 한 번 설치하면 모든 프로젝트에 적용 | 한 곳에서 관리 | 프로젝트별 커스텀 어려움 |

**결정: B** — 공통 규칙은 전역으로, 프로젝트별 규칙은 프로젝트 CLAUDE.md에서 처리. 커뮤니티도 동일한 패턴 → [community-patterns.md](research/community-patterns.md) 패턴 2, 6

### 결정 2: 어떤 레포 구조로 관리할 것인가?

| 선택지 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **A. 기존 모노레포에 패키지로 추가** | 서비스 레포 안에 패키지로 | 레포 하나로 관리 | 배포 대상이 완전히 다름 |
| **B. 별도 레포** | ai-contexts 전용 레포 | 배포 대상에 맞는 독립 관리 | 레포가 하나 늘어남 |

**결정: B** — ai-contexts는 서버/앱이 아니라 `~/.claude/`에 배포되므로 독립 레포가 자연스러움

### 결정 3: 어떻게 `~/.claude/`에 배포할 것인가?

레포를 아무 경로에 clone한 뒤, `~/.claude/`에 어떤 메커니즘으로 배포할 것인가?

| 선택지 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **A. 심링크** | 레포 내 파일을 `~/.claude/`에서 심링크로 가리킴 | 레포 수정 즉시 반영, 원본 하나. 레포에서 파일 삭제 시 심링크도 무효화 (잔존 문제 없음) | 심링크 깨질 가능성, [#764](https://github.com/anthropics/claude-code/issues/764) 버그 보고, 개인 파일 배치에 제약 (→ 결정 5) |
| **B. 복사** | 레포에서 `~/.claude/`로 파일 복사 | 심링크 이슈 없음, 개인 파일 자유 | 수정 시 재실행 필요. (1) 잔존: 레포에서 파일 삭제/이름 변경 시 옛날 파일이 타겟에 남아 계속 로드됨 — 갱신 전 기존 항목 삭제 필요. (2) 덮어쓰기: 개인 파일과 배포 파일 이름이 우연히 겹치면 개인 파일이 덮어써짐. 접두사로 완화 가능하나, 접두사를 붙이면 상대경로가 깨져서 접두사 없이 배포해야 하는 카테고리(contexts)에서는 충돌 위험 존재 |

도구 비교 (Stow, chezmoi, Nix, 커스텀 스크립트 등) → [meta/research/deployment.md](research/deployment.md)

**결정: A (심링크)** — 복사 방식은 레포에서 삭제한 파일이 배포처에 잔존하는 구조적 문제가 있음. 심링크는 원본 삭제 시 자연스럽게 무효화되어 이 문제가 발생하지 않음

### 결정 4: 배포 파일을 레포 어디에 둘 것인가?

`~/.claude/`에 배포할 파일(rules, skills, contexts)을 레포의 어디에 둘 것인가?

| 선택지 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **A. `.claude/`에** | 프로젝트 루트의 `.claude/` 안에 | `~/.claude/`와 구조 동일, 직관적 | **프로젝트 자체의 `.claude/` 설정과 혼동** — `.claude/rules/`가 이 프로젝트용인지 배포용인지 구분 불가 |
| **B. `deploy/`에** | 별도 배포 전용 폴더 | 역할이 명확. `.claude/`는 이 프로젝트 전용으로 유지 | 폴더가 하나 더 생김 |

**결정: ~~A~~ → B (`deploy/`)로 변경 (2026-03-04)**

프로젝트의 `.claude/`에 공용 배포 파일이 있을 거라고 기대하는 사람은 없다. `.claude/`를 보면 **이 프로젝트의 규칙**이 있을 거라고 생각하지, 다른 PC에 배포할 공용 파일이 있을 거라고 생각하지 않는다.

### 결정 5: 심링크 단위는?

`~/.claude/` 통째로 심링크하면 개인 CLAUDE.md, 개인 스킬, 개인 규칙을 넣을 수 없다. `rules/`, `skills/` 폴더 단위로 해도 개인 스킬/규칙 추가가 불가능하다. 따라서 **폴더 안의 항목 단위**로 심링크해야 한다.

| 대상 | 심링크 단위 | 근거 |
|---|---|---|
| `skills/` | 스킬 폴더 단위 (`deploy/skills/git-commit/` → `~/.claude/skills/git-commit/`) | 공식 구조가 `skills/<name>/SKILL.md`로 폴더 단위 ([공식 문서](https://code.claude.com/docs/en/skills)) |
| `rules/` | 파일 또는 하위 폴더 단위 (`deploy/rules/shared/` → `~/.claude/rules/shared/`) | 공식적으로 재귀 탐색 + 심링크 지원 ([공식 문서](https://code.claude.com/docs/en/memory)) |
| `CLAUDE.md` | 심링크 대상 아님 | 개인 전역 설정이므로 레포에 넣지 않음. 공유할 내용은 `rules/`에 넣으면 동일하게 매 세션 로드됨 |

```
~/.claude/
├── CLAUDE.md                      ← 개인 (심링크 X)
├── skills/
│   ├── git-commit/                ← 심링크 → 레포/deploy/skills/git-commit/
│   ├── pr-review/                 ← 심링크 → 레포/deploy/skills/pr-review/
│   └── my-personal-skill/         ← 개인 (심링크 X)
└── rules/
    ├── shared/                    ← 심링크 → 레포/deploy/rules/shared/
    └── my-personal-rule.md        ← 개인 (심링크 X)
```

참고: `CLAUDE.md`에 공유하고 싶은 내용이 있다면 `rules/`에 넣으면 된다. paths 프론트매터 없는 rules 파일은 CLAUDE.md와 동일하게 매 세션 시작 시 자동 로드된다 ([공식 문서](https://code.claude.com/docs/en/memory)). 즉, `CLAUDE.md`는 순수 개인용으로 두고, 공유 지시문은 전부 `rules/`로 관리.

커뮤니티에서도 동일한 패턴 → [community-patterns.md](research/community-patterns.md) 패턴 3, 4

**결정: 항목 단위 심링크** — 복사 방식이면 이 결정 자체가 불필요해짐

### 결정 6: 심링크 도구는?

| 선택지 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **A. GNU Stow** | 심링크 매니저. `stow -t ~ claude` 한 줄로 배포 | 파일 추가/삭제 시 `stow` 재실행만 하면 자동 반영. 직접 `ln -sf` 관리 불필요 | Perl 의존 (사실상 어디나 있음), [심링크 버그 #764](https://github.com/anthropics/claude-code/issues/764) 보고 |
| **B. 커스텀 스크립트** | `scripts/update.sh`에서 직접 `ln -s` | 의존성 없음, 완전한 통제 | 파일 추가/삭제마다 스크립트 수정 필요. Stow가 해주는 걸 수동으로 재구현하는 셈 |

**결정: ~~A (GNU Stow)~~ → B (커스텀 스크립트)로 변경 (2026-03-04)**

변경 이유: Stow는 Windows에서 사용 불가 (Unix 전용). Windows에서는 개발자 모드 + Git Bash의 `ln -s`로 심링크 생성 가능하나 Stow 자체가 동작하지 않음. 커스텀 스크립트(`scripts/update.sh`)가 `deploy/` 하위 카테고리(rules, skills, contexts)의 항목을 자동 탐색하여 심링크하므로, 파일 추가/삭제 시 스크립트 수정 불필요 (Stow의 장점을 유지). 초기 설정은 `scripts/install.sh`, 언인스톨은 `scripts/uninstall.sh`로 분리. Stow는 Unix 환경 통일 시 재검토 예정.

Windows 요구사항: 설정 > 시스템 > 개발자용 > 개발자 모드 ON (일회성).

### 결정 7: supporting files 폴더명은?

결정 4에서 "supporting files는 프로젝트 루트에 주제별로"까지 정했다. 그 폴더의 이름을 정한다.

도메인 폴더를 루트에 직접 나열(A안)할지, 하나의 폴더로 묶을지(B안)도 함께 결정.

| 선택지 | 장점 | 단점 |
|---|---|---|
| A. 루트에 직접 나열 (`coding-standards/`, `workflow/`, ...) | 한 단계 얕음 | 도메인이 늘면 루트 노이즈 |
| **B. `contexts/`로 묶기** | 루트 깔끔, 레포명(ai-contexts)과 일관 | 한 단계 깊어짐 |

폴더명 후보 검토:

| 후보 | 판단 | 이유 |
|---|---|---|
| `docs/` | 기각 | "순수한 문서"가 아님 — 체크리스트, 템플릿, 코딩 규칙, 예시 코드 등 혼재 |
| `sources/` | 기각 | "출처"나 "소스코드"를 연상시킴 |
| `references/` | 탈락 | 역할은 정확하지만 길고 일반적이지 않음 |
| **`contexts/`** | **채택** | 레포명(ai-contexts)과 일관, "AI에게 주입하는 컨텍스트 자료"라는 역할이 드러남 |

**결정: B (`contexts/`)** — 도메인 폴더를 `deploy/contexts/` 아래에 묶는다. 레포명과 일관되고 루트를 깔끔하게 유지함
