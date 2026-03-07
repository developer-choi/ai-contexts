# Step 1: 배경 파악 및 문제 정의

> **이 단계의 목표: 작업의 문제/목표를 정의한다** (도메인/비즈니스 관점, 코드 분석 아님)

작업의 **배경**, **목적**, **문제가 있다면 Root Cause**를 명확히 합니다.

---

## 스킬 선택

작업 종류에 따라 적절한 스킬을 선택합니다:

| 작업 종류 | 스킬 | 설명 |
|----------|------|------|
| 신규 기능 / 리팩토링 | `workflow_spec-review` | 기획서·피그마·이슈 기반 배경 파악 |
| 버그 / 성능 문제 | `workflow_bug-investigation` | 증상·Root Cause 분석 |
| 채용 과제 | `workflow_recruitment-review` | 과제 요구사항 리뷰 |

모든 스킬의 산출물은 `/plan/background/`에 생성됩니다.

---

## 추가 맥락 수집

스킬 실행 전후로, 사용자에게 추가 맥락이 있는지 확인합니다:

> "추가로 참고할 자료가 있나요? (예: 사내 컨벤션 가이드, 기획자/디자이너 전달사항, 기존 기술 스택 제약 등)"

있다면 내용을 요약하여 적절한 파일명으로 `/plan/background/`에 저장합니다. (예: `background/team-conventions.md`, `background/designer-notes.md`)
