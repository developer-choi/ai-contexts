---
description: 기획서, 피그마, 피그마 디자인토큰, 버그, 채용과제를 PR로 변환하는 워크플로우. 배경 파악 → PR 분할 → 구현 → 코드리뷰 → PR 작성까지 단계별 진행. 커밋, PR 작성, 코드리뷰 요청 시 반드시 이 스킬을 사용한다.
argument-hint: (인자 없음 — 세션 시작 시 호출)
---

# 워크플로우

## 세션

워크플로우는 **BACKGROUND_SESSION** 1개, **PR마다 별도의 PLANNING_SESSION**, **PR마다 별도의 IMPLEMENTATION_SESSION**으로 나뉜다. 각 세션은 해당 단계에 필요한 산출물만 파일로 읽어 시작한다. 이전 세션의 대화 맥락은 불필요하고 오히려 집중을 방해한다.

| 세션 | 담당 | 컨텍스트 |
|------|------|----------|
| **BACKGROUND_SESSION** (1개) | Step 1~2 | 기획서, 요구사항 → `/plan/background/`, `/plan/project.md` |
| **PLANNING_SESSION** (PR당 1개) | Step 3~4 | `/plan/project.md` + `/plan/background/` → `/plan/pr{N}/` |
| **IMPLEMENTATION_SESSION** (PR당 1개) | Step 5~7 (마지막 PR에서 Step 8 포함) | `/plan/pr{N}/` 산출물 + 컨벤션. 이 PR 하나에만 집중 |

BACKGROUND_SESSION이 Step 2까지 완료하면, 사용자에게 다음과 같이 안내한다:

> 배경 파악과 PR 분할이 완료되었습니다. 계획은 **PR마다 새 세션**에서 진행합니다.
> PR #1부터 순서대로, 새 Claude Code 세션을 열고 `/workflow`를 호출한 뒤 "Step 3부터 시작합니다. `/plan/pr1/` 기반으로 계획합니다"라고 말씀해주세요.

PLANNING_SESSION이 Step 4까지 완료하면, 사용자에게 다음과 같이 안내한다:

> PR #{N}의 계획이 완료되었습니다. 구현은 새 세션에서 진행합니다.
> 새 Claude Code 세션을 열고 `/workflow`를 호출한 뒤 "Step 5부터 시작합니다. `/plan/pr{N}/` 기반으로 구현합니다"라고 말씀해주세요.
> 다음 PR의 계획이 남아있다면, 구현 전에 새 세션에서 Step 3부터 계획을 먼저 진행합니다.

## 구조

- 각 step은 조건에 해당하는 **하위 스킬을 모두 로드**하는 오케스트레이터이거나, 그 자체가 실행 로직
- 해당 스킬이 여러 개이면 **순서대로 하나씩** 실행한다 (동시 로드 불가)
- 각 step의 **산출물이 다음 step의 입력** — step마다 "참고 자료"로 입력 산출물이 명시되어 있음
- 하위 스킬은 워크플로우 step 내에서만 호출된다 (독립 호출 없음)

## 시작 전 준비

- `template/context-setup.md` 양식으로 레포지토리 Context 수집
  - **실무 프로젝트**: 필수
  - **채용 과제 등**: 생략 가능

## /plan/ 폴더 구조

```
/plan/
  background/
    read-only/     ← 사용자 제공 원본 (삭제 불가)
    (AI 산출물)    ← 소비 후 삭제
  pr{N}/
    overview.md    ← step-3 산출물
    (파생 산출물)  ← step-4 산출물, 구현 후 삭제
```

## 작업 진행 순서

### BACKGROUND_SESSION (1회)

| 단계 | 내용 |
|------|------|
| [step-1.md](steps/step-1.md) | 배경 파악 및 문제 정의 |
| [step-2.md](steps/step-2.md) | PR 분할 전략 수립 |

### PLANNING_SESSION (PR당 1개)

| 단계 | 내용 |
|------|------|
| [step-3.md](steps/step-3.md) | 과제 정의 (신규 작업 / QA 대응) |
| [step-4.md](steps/step-4.md) | 구현 방침 상세화 |

### IMPLEMENTATION_SESSION (PR당 1개)

| 단계 | 내용 |
|------|------|
| [step-5.md](steps/step-5.md) | 구현 |
| [step-6.md](steps/step-6.md) | 최종 점검 |
| [step-7.md](steps/step-7.md) | PR 본문 작성 |

### QA/리뷰 대응 (PR 올린 후)

PR을 올린 뒤 리뷰 피드백을 받으면, **새 세션 1개**에서 Step 3(QA 대응 모드) → Step 4~6을 통합 수행한다. QA 대응 세션은 PLANNING/IMPLEMENTATION 경계 없이 계획부터 구현까지 하나의 세션에서 처리한다. Step 3이 진입 경로를 감지하여 자동으로 QA 대응 모드로 전환한다.

### 마무리 (모든 PR 완료 후 1회)

| 단계 | 내용 |
|------|------|
| [step-8.md](steps/step-8.md) | 워크플로우 회고 + 프로젝트 유형별 제출 마무리 |

> 마지막 PR의 IMPLEMENTATION_SESSION에서 1회만 수행합니다.
>
> **마지막 PR 판별**: `/plan/` 하위에서 가장 높은 번호의 `pr{N}` 디렉토리가 현재 작업 중인 PR이면 마지막.

## [CRITICAL] 지킬 원칙

### 기억 의존 금지
- 각 단계 시작 전 직전 산출물 다시 읽기
- 기억 의존 금지, 파일 현재 상태 기준으로 진행
- **파일 편집 전 반드시 현재 내용 읽기**

### 단계별 승인 대기
- 각 단계 완료 후 **반드시 사용자 승인** 후 다음 단계

### 자가 검토 필수
- 각 step 산출물을 사용자에게 보고하기 전, 자가 검토 수행
- **핵심 결정 사항을 요약하여 보고** — 사용자가 산출물 전체를 읽지 않아도 핵심을 파악할 수 있게
- "검토했다"로 끝내지 말고, 검토 내용이 보고에 포함되어야 한다
- 각 step의 "보고 내용" 섹션에 정의된 항목을 따른다

### 선행조건 자가체크
- 각 step은 `/plan/`을 탐색하여 이전 단계 산출물과 맥락을 스스로 파악한다
- 필요한 맥락이 부족하면 사용자에게 질문한다
- 이전 step을 거치지 않고 진입해도 자연스럽게 대응 (step 스킵 허용)

### `.gitignore` 대상 plan 파일
- `/plan/project.md`, `/plan/interview-prep.md`는 `.gitignore`에 포함되어 커밋되지 않음

### 면접 대비 메모 (채용과제만)
- 논의 중 "넘어가자", "안 하기로" 같은 판단이 나오면 `/plan/interview-prep.md`에 기록할지 사용자에게 확인

### AI 패턴
- 먼저 생각 제시 → 사용자 의견 구하기 (멈추고 대기)
- 정보 부족 시 역질문
