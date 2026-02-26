# AI Contexts

AI 에이전트와 체계적으로 협업하기 위한 프롬프트(markdown)를 모아둔 저장소입니다.

---

## 영역별 안내

| 영역 | 진입점 | 설명 |
|------|--------|------|
| 문서 관리 | [audit/README.md](instructions/audit/README.md) | 문서 검증 체크리스트, [workflow](instructions/audit/workflow/README.md)·[coding-standards](instructions/audit/coding-standards/README.md) 리뷰 |
| 실무 | [workflow/README.md](instructions/workflow/README.md) | 문제 정의부터 PR까지 8단계 개발 프로세스 |
| 개발 작업 | [coding-standards/README.md](instructions/coding-standards/README.md) | 코딩 컨벤션 |

---

## 사용법

현재는 Claude Code나 다른 AI 에이전트에서 "ai-contexts" 키워드와 함께 요청하면 됩니다.

```
"ai-contexts로 워크플로우 시작하자"
"ai-contexts로 복습하자"
"ai-contexts conventions 적용해서 코드 작성해줘"
```

AI가 [instruction-map.md](./instruction-map.md)를 참조해서 적절한 문서를 찾아 로드합니다.

> 향후 대부분의 기능을 [Claude Skills](https://docs.anthropic.com/en/docs/claude-code/skills)로 전환할 예정입니다. Skill로 전환되면 키워드 없이 슬래시 커맨드(`/workflow`, `/audit` 등)로 바로 실행할 수 있습니다.

---

## 프로젝트 구조

```
ai-contexts/
├─ instruction-map.md            # 문서 라우팅 맵
├─ instructions/
│  ├─ workflow/                  # 8단계 개발 프로세스
│  ├─ coding-standards/          # 코딩 컨벤션
│  ├─ audit/                     # 문서 검증 시스템
│  │  ├─ checklist/             # 검증 항목 (consistency, style 등)
│  │  ├─ workflow/              # workflow 특화 체크리스트
│  │  └─ coding-standards/      # coding-standards 특화 체크리스트
│  ├─ self-help/                 # 학습 & 성장
│  ├─ simplify/                  # 라이브러리 간소화
│  └─ recruitment/               # 채용 관련
├─ archives/                     # 범용 AI 글로벌 컨텍스트
├─ meta/                         # 프로젝트 관리 가이드
├─ deploy/                       # 배포 관련
└─ scripts/                      # 스크립트
```

---

## AI 협업 방향성: 자가 개선 루프

AI의 코딩 속도는 이미 사람을 한참 넘어섰습니다. 그래서 제가 하던 개발 작업을 AI에게 최대한 위임하고 있습니다. 다만 **"뭘 만들지"와 "이게 맞는지"는 사람이 결정할 영역**입니다. 실행은 AI, 의사결정은 사람.

이 프로젝트는 AI의 실행 품질을 끌어올리기 위해 만들었습니다. **AI가 실수하면 → 그 실수를 가이드에 반영 → 다음에는 안 함.** 실행력을 코드처럼 축적하는 구조입니다.

```
workflow 실행 → audit/retrospect로 자가 검진 → 가이드 개선 제안 → 더 나은 workflow → 반복
```

사람이 일일이 규칙을 만드는 게 아니라, AI가 세션 경험을 기반으로 개선점을 제안하고 가이드를 진화시킵니다. 이 루프를 반복하면 사람은 점점 **"뭘 만들지"와 "이게 맞는지"만 판단**하고, 나머지는 AI가 처리하는 구조로 수렴합니다.

참고: [자유 검토 및 프로세스 회고](instructions/audit/retrospect.md) — 자가 개선 루프의 핵심 절차

---

## 프로젝트 관리 방법

[CONTRIBUTING.md](./CONTRIBUTING.md)를 참고해주세요.
