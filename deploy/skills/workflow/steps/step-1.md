# Step 1: 배경 파악 및 문제 정의

> **이 단계의 목표: 작업의 문제/목표를 정의한다** (도메인/비즈니스 관점, 코드 분석 아님)

작업의 **배경**, **목적**, **문제가 있다면 Root Cause**를 명확히 합니다.

---

## 스킬 로드

아래 조건에 해당하는 스킬을 **모두** 로드합니다. 여러 개면 위에서부터 순서대로 하나씩 실행합니다.

| 순서 | 조건 | 스킬 | 설명 |
|:---:|------|------|------|
| 1 | 신규 기능 / 리팩토링 | [requirement-review](../requirement-review/SKILL.md) planning | 기획서·피그마·이슈 기반 배경 파악 |
| 2 | 채용 과제 | [requirement-review](../requirement-review/SKILL.md) recruitment | 과제 요구사항 리뷰 |

모든 스킬의 산출물은 `/plan/background/`에 생성됩니다.

---

## 중복 조기 발견

requirement-review 또는 codebase-audit 단계에서 디자인·컴포넌트 중복이 있으면 선제적으로 짚는다. 나중에 통합 얘기를 꺼내면 중복 QA가 발생하므로, 초기에 발견하는 것이 비용이 적다.

---

## 추가 맥락 수집

스킬 실행 전후로, 사용자에게 추가 맥락이 있는지 확인합니다:

> "추가로 참고할 자료가 있나요? (예: 사내 컨벤션 가이드, 기획자/디자이너 전달사항, 기존 기술 스택 제약 등)"

있다면 내용을 요약하여 적절한 파일명으로 `/plan/background/`에 저장합니다. (예: `background/team-conventions.md`, `background/designer-notes.md`)
