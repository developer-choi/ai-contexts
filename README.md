# AI Contexts

> AI 에이전트에게 전달할 Context를 모아둔 저장소입니다.

---

## 프로젝트 구조 개요

```
ai-contexts/
├─ instructions/      # AI가 작업 시 따를 규칙
│  ├─ workflow/       # 협업 워크플로우
│  ├─ conventions/    # 공통 코딩 규칙
│  └─ self-help/      # 문제 해결 방법론
├─ meta/              # 프로젝트 관리 가이드
├─ archives/          # 보관 자료
└─ README.md          # 프로젝트 전체 개요
```

---

## 종류

### instructions/workflow
- AI와 함께 효율적으로 코드를 작성하기 위한 **[계획] -> [설계] -> [구현]** 워크플로우를 정의했습니다.
- AI가 주도적으로 스캐폴딩을 잡고, 사용자가 구체화하는 방법입니다.
- 👉 [AI 협업 워크플로우 가이드](instructions/workflow/README.md)

### instructions/self-help
- 지속적인 성장을 위한 Context를 모았습니다.
- 👉 [문제 해결 로드맵](instructions/self-help/roadmap.md)
