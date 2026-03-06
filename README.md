# AI Contexts

Claude Code와 체계적으로 협업하기 위한 프롬프트(markdown) 저장소입니다.
규칙, 워크플로우, 검증 체크리스트를 구조화하여 `~/.claude/`에 배포합니다.

---

## 핵심 기능

### 1. Audit Skill — 프롬프트 검증 시스템

AI 프롬프트(md 파일)의 품질을 **체크리스트 기반으로 평가**하는 도구입니다.

```
/audit 파일경로
```

**예시** — 규칙과 AI 행동 가이드가 동일 내용을 반복하는 프롬프트를 검증하면:

```markdown
# AUDIT_RESULT — CONVENTIONS.md

### 지적 1 — 규칙과 AI 행동 가이드 중복
- 위치: CONVENTIONS.md:2-5
- 문제: "규칙"과 "AI 행동 가이드"가 동일한 내용을 반복.
        규칙을 그대로 복사한 검증은 토큰만 낭비한다.
- 권장: AI 행동 가이드를
        "위 규칙이 모두 반영되었는지 자가 검토하세요" 한 줄로 대체
```

**체크리스트:**

| # | 관점 | 검증 내용 |
|---|------|-----------|
| 0 | 내부 정합성 | 자기모순, 중복, 모호한 참조, 암묵적 전제가 없는가 |
| 1 | 명확성 | 행동 동사, 맥락, 출력 형식이 지정되어 있는가 |
| 2 | 예시 | Bad/Good 대비로 기대 출력을 보여주는가 |
| 3 | 구조화 | 긴 자료는 상단, 지시는 하단으로 배치했는가 |
| 4 | 파일 분리 | 지시와 참고자료가 적절히 나뉘어 있는가 |
| 5 | 역할 | AI의 전문성, 행동 패턴, 톤이 구체적으로 정의되어 있는가 |
| 6 | 순서 | 단계별로 설계되고 완료 조건이 있는가 |

**체크리스트 자가 개선** — 매 검증이 끝나면 AI가 자유 검토 & 회고를 통해 체크리스트 자체의 빈틈을 찾고 개선안을 함께 제안합니다. 사람이 승인하면 체크리스트가 강화되고, 다음 검증부터 같은 패턴을 더 잘 잡습니다.

자세한 내용: [deploy/skills/audit/README.md](deploy/skills/audit/README.md)

### 2. Workflow — 8단계 개발 프로세스

AI 주도의 구조화된 개발 워크플로우입니다.

**초기 설정 (1회)**
- Step 1: 배경 & 문제 정의
- Step 2: PR 분리 전략

**PR 단위 반복 (Step 3–8)**
- Step 3: 핵심 작업 정의 & 기술 전략
- Step 4: 상세 구현 계획
- Step 5: 구현
- Step 6: 최종 리뷰
- Step 7: PR 본문 작성
- Step 8: 워크플로우 회고

핵심 원칙: 기억 의존 금지(매 단계 산출물 재확인), 단계 간 사용자 승인 필수, Plan Mode 적용(Step 3–5)

자세한 내용: [deploy/skills/workflow/README.md](deploy/skills/workflow/README.md)

### 3. 배포 시스템

`deploy/` 폴더의 프롬프트 파일을 `~/.claude/`로 자동 복사합니다.

```bash
npm run update     # deploy/ → ~/.claude/ 배포 (대화형 경로 지정)
npm run uninstall  # 배포된 파일만 선택 제거
```

배포 대상:
- `deploy/rules/` — 전역 AI 행동 규칙
- `deploy/skills/` — Audit 등 스킬 정의
- `deploy/contexts/` — 문제 해결 로드맵 등 보조 문서

---

## 설계 원칙

### AI 주도 설계

- **AI가 주도적으로 안내** — 다음 단계 제안, 선택지 제시, 결정 지점마다 가이드
- **잘못된 요청 제지** — 비효율적 방향으로 가려 할 때 AI가 제지하고 대안 제시
- **사용자는 판단만** — AI가 제안하고, 사용자는 승인/거절/방향 수정만 하면 됨

---

## 프로젝트 구조

```
ai-contexts/
├── deploy/                  # 배포 대상 (→ ~/.claude/)
│   ├── rules/               #   전역 AI 행동 규칙
│   ├── skills/audit/        #   Audit 스킬 (체크리스트, 회고, 출력 포맷)
│   ├── skills/simplify/     #   라이브러리 소스 단순화 가이드
│   └── contexts/            #   보조 문서 (문제 해결 로드맵 등)
├── instructions/            # 레거시 폴더 (deploy/ 또는 archives/ 로 가기 이전 기존 폴더)
│   ├── workflow/            #   8단계 개발 프로세스
│   ├── coding-standards/    #   코딩 컨벤션, 품질, 테스트, 문체
│   └── self-help/           #   학습 & 성장
├── meta/                    # 프로젝트 관리 (설치 가이드, 아키텍처 결정)
├── scripts/                 # 배포 스크립트 (update.sh, uninstall.sh)
└── package.json             # npm run update / uninstall
```

---

## Getting Started

```bash
git clone https://github.com/langdy/ai-contexts.git
cd ai-contexts
npm run update   # 대화형으로 배포 경로 지정 (기본: ~/.claude)
```

자세한 설치 방법: [meta/INSTALLATION_GUIDE.md](meta/INSTALLATION_GUIDE.md)

---

## 가치관

### AI 협업 방향성: 자가 개선 루프

AI의 코딩 속도는 이미 사람을 한참 넘어섰습니다. 그래서 제가 하던 개발 작업을 AI에게 최대한 위임하고 있습니다. 다만 **"뭘 만들지"와 "이게 맞는지"는 사람이 결정할 영역**입니다.

이 프로젝트는 AI의 실행 품질을 끌어올리기 위해 만들었습니다. **AI가 실수하면 → 그 실수를 가이드에 반영 → 다음에는 안 함.** 실행력을 코드처럼 축적하는 구조입니다.

```
workflow 실행 → audit/retrospect로 자가 검진 → 가이드 개선 제안 → 더 나은 workflow → 반복
```

사람이 일일이 규칙을 만드는 게 아니라, AI가 세션 경험을 기반으로 개선점을 제안하고 가이드를 진화시킵니다. 이 루프를 반복하면 사람은 점점 **"뭘 만들지"와 "이게 맞는지"만 판단**하고, 나머지는 AI가 처리하는 구조로 수렴합니다.

참고: [자유 검토 및 프로세스 회고](deploy/skills/audit/retrospect.md) — 자가 개선 루프의 핵심 절차

---

## Contributing

[CONTRIBUTING.md](./CONTRIBUTING.md)를 참고해주세요.
