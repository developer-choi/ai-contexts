# AI Contexts

AI 에이전트에게 전달할 Context를 모아둔 저장소입니다.

---

## 사용법

[instruction-map.md](./instruction-map.md)를 참고하세요.

---

## 프로젝트 구조

```
ai-contexts/
├─ AGENT.md              # AI 전역 규칙
├─ instruction-map.md    # 문서 라우팅 맵
├─ instructions/         # AI 작업 규칙
│  ├─ workflow/          # 기획 리뷰 → 코드 작성 → PR 오픈
│  ├─ conventions/       # 코딩 컨벤션
│  └─ self-help/         # 학습 & 성장
└─ meta/                 # 프로젝트 관리 가이드
```
