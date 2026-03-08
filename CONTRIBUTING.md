# 프로젝트 기여 가이드

이 문서는 ai-contexts 프로젝트에 문서를 추가하거나 수정할 때 따라야 할 규칙을 정의합니다.

동시에, meta/ 폴더 안에 들어있는 모든 문서의 최상위 문서입니다.

---

## 로컬 환경 세팅

```bash
git clone https://github.com/developer-choi/ai-contexts.git
cd ai-contexts
npm run update   # deploy/ → ~/.claude/ 배포
```

수정 후 `npm run update`를 다시 실행하면 변경 사항이 반영됩니다.

---

## 디렉터리 구조와 역할

| 디렉터리 | 역할 | 배포 여부 |
|-----------|------|-----------|
| `deploy/rules/` | 전역 AI 행동 규칙 | 배포됨 |
| `deploy/skills/` | 스킬 정의 (audit, workflow 등) | 배포됨 |
| `deploy/contexts/` | 보조 참조 문서 (코딩 컨벤션, 셀프헬프) | 배포됨 |
| `meta/` | 프로젝트 관리 문서 (설치 가이드, 아키텍처 결정) | 배포 안 됨 |
| `archives/` | 퇴역한 프롬프트 | 배포 안 됨 |
| `scripts/` | 배포/제거 스크립트 | 배포 안 됨 |

---

## 문서 분류 체계

모든 md 파일은 명령문 / 가이드 / 템플릿 중 하나로 분류됩니다. 정의와 판별 기준은 [audit SKILL.md](deploy/skills/audit/SKILL.md)의 "문서 종류" 섹션을 참고하세요.

---

## 스킬 추가 규칙

새 스킬을 추가할 때는 아래 구조를 따릅니다.

```
deploy/skills/<스킬명>/
├── SKILL.md        # 필수. AI가 로드하는 스킬 정의
├── README.md       # 필수. 사람용 설명 (AI 지시 금지)
└── ...             # SKILL.md에서 참조하는 보조 파일
```

`SKILL.md`에는 YAML frontmatter가 필요합니다.

```yaml
---
description: 스킬에 대한 한 줄 설명
argument-hint: 인자 힌트 (선택)
---
```

---

## 핵심 원칙

### 미정리 메모는 가장 가까운 TODO.md에

가이드 문서 본문에 "미정리", "TBD", "TODO" 같은 미해결 메모를 남기지 마세요. AI가 해당 규칙을 적용할 때 판단할 수 없습니다.

미해결 사항은 해당 문서와 가장 가까운 경로의 `TODO.md`에 적으세요.

```
coding-standards/
├── TODO.md          ← coding-standards 하위 문서의 미결 사항은 여기에
├── coding/
│   └── zod.md
└── testing/
    └── convention.md
```

---

## 문서 작성 규칙

md 파일을 작성하거나 수정할 때, 아래 문서를 참고합니다.

- [writing/tone.md](deploy/contexts/coding-standards/universal/writing/tone.md) — 문서 톤 (습니다체, 문장 역할)
- [audit/checklist/style.md](deploy/skills/audit/checklist/style.md) — 서식 (이모지 규칙, 헤더 텍스트 규칙)
