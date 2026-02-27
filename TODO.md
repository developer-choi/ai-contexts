# TODO: ~/.claude 배포 구조 만들기

이 프로젝트의 instructions를 `~/.claude/`에 배포 가능한 형태로 변환하는 계획.

## 목표

- 여러 컴퓨터에서 동일한 Claude Code 환경을 유지
- `install.js` 하나로 `~/.claude/`에 배포

## 배포 구조

```
deploy/.claude/               # → ~/.claude/ 에 그대로 복사
├── CLAUDE.md                 # 항상 로드되는 전역 규칙
├── rules/                    # 항상 로드되는 모듈화된 규칙
│   └── (필요 시 추가)
└── skills/                   # /skill-name 으로 호출 시에만 로드
    └── (기타 필요 시 추가)
```

## 작업 목록

### Phase 1: 기반 구조
- [x] `deploy/.claude/` 디렉토리 생성
- [ ] `deploy/.claude/CLAUDE.md` 작성 (ai-global-context.md + essentials 기반)
- [ ] `install.sh` 작성 (deploy/ 내용을 ~/ 에 복사)

### Phase 2: Skills 변환
- [ ] `/conventions` — conventions/coding/ 기반
- [ ] `/review` — conventions/review/ 기반
- [ ] `/testing` — conventions/testing/ 기반
- [ ] `/workflow` — workflow/ 기반
- [ ] `/code-quality` — code-quality/ 기반
- [ ] `/simplify` — simplify/ 기반

### Phase 3: 추가 검토
- [ ] 기존 instructions/ 구조와의 관계 정리 (공존 vs 대체)
- [ ] install.sh에 백업/충돌 처리 로직 추가
- [ ] 다른 skills 추가 필요 여부 검토

## 원본 매핑

| deploy/.claude/ 경로 | 원본 (instructions/) |
|---|---|
| `CLAUDE.md` | `archives/ai-global-context.md` + `conventions/essentials/` |
| `skills/conventions/` | `conventions/coding/` |
| `skills/review/` | `conventions/review/` |
| `skills/testing/` | `conventions/testing/` |
| `skills/workflow/` | `workflow/` |
| `skills/code-quality/` | `code-quality/` |
| `skills/simplify/` | `simplify/` |
