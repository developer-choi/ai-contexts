# 프로젝트 기여 가이드

이 문서는 ai-contexts 프로젝트에 문서를 추가하거나 수정할 때 따라야 할 규칙을 정의합니다.

동시에, meta/ 폴더 안에 들어있는 모든 문서의 최상위 문서입니다.

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

### 문서 작성 규칙

md 파일을 작성하거나 수정할 때, 아래 문서를 참고합니다.

- [writing/tone.md](instructions/coding-standards/writing/tone.md) — 문서 톤 (습니다체, 문장 역할)
- [audit/checklist/style.md](instructions/audit/checklist/style.md) — 서식 (이모지 규칙, 헤더 텍스트 규칙)
