---
description: 기획서, 피그마, 버그, 채용과제를 PR로 변환하는 워크플로우. 배경 파악 → PR 분할 → 구현 → 코드리뷰 → PR 작성까지 단계별 진행. 커밋, PR 작성, 코드리뷰 요청 시 반드시 이 스킬을 사용한다.
argument-hint: (인자 없음 — 세션 시작 시 호출)
---

# 워크플로우

## 세션

워크플로우는 PLANNING_SESSION 1개와 **PR마다 별도의 IMPLEMENTATION_SESSION**으로 나뉜다. PLANNING_SESSION은 메인 에이전트가 주도하며, IMPLEMENTATION_SESSION은 팀 기반으로 동작한다 (상세는 [step-5.md](steps/step-5.md) 참조).

| 세션 | 담당 | 컨텍스트 |
|------|------|----------|
| **PLANNING_SESSION** (1개) | Step 1~4 + 회고 | 기획서, 요구사항, 기술 전략, PR 분할 |
| **IMPLEMENTATION_SESSION** (PR당 1개) | Step 5~7 (마지막 PR에서 Step 8 포함) | 해당 PR의 `/plan/pr{N}/overview.md` + 컨벤션. 이 PR 하나에만 집중 |

분리하는 이유: PLANNING_SESSION이 쌓은 기획 맥락은 구현 시 불필요하고 오히려 집중을 방해한다. 마찬가지로, 다른 PR의 구현 맥락도 현재 PR에 불필요하다. 각 IMPLEMENTATION_SESSION은 해당 PR의 overview.md와 컨벤션만으로 깨끗하게 시작한다.

PLANNING_SESSION이 Step 4까지 완료하면, 사용자에게 다음과 같이 안내한다:

> 모든 PR의 계획이 완료되었습니다. 구현은 **PR마다 새 세션**에서 진행합니다.
> PR #1부터 순서대로, 새 Claude Code 세션을 열고 `/workflow`를 호출한 뒤 "Step 5부터 시작합니다. `/plan/pr1/overview.md` 기반으로 구현합니다"라고 말씀해주세요.
> 하나의 PR이 끝나면(Step 7 완료), 다시 새 세션을 열어 다음 PR을 진행합니다.

## 구조

- 각 step은 조건에 해당하는 **하위 스킬을 모두 로드**하는 오케스트레이터이거나, 그 자체가 실행 로직
- 해당 스킬이 여러 개이면 **순서대로 하나씩** 실행한다 (동시 로드 불가)
- 각 step의 **산출물이 다음 step의 입력** — step마다 "참고 자료"로 입력 산출물이 명시되어 있음
- 하위 스킬은 워크플로우 step 내에서만 호출된다 (독립 호출 없음)

## 시작 전 준비

- `template/context-setup.md` 양식으로 레포지토리 Context 수집
  - **실무 프로젝트**: 필수
  - **채용 과제 등**: 생략 가능

## 금지 작업

사용자가 요청 시 제지하고 직접 수행 안내:

### 1. 라이브러리 초기 셋팅
- 새로운 라이브러리/프레임워크의 초기 설치 및 환경 구성
- 이유: 공식 문서 보고 사용자가 직접 구축

### 2. 역주행 금지
- 구현 단계 진입 후 계획 문서(`/plan/pr{N}/overview.md`) 수정 위해 되돌아가지 말기
- 기획 변경 시 코드에 바로 반영, 나중에 기획서와 대조
- **전진(Forward Only)**: 문서는 완벽할 필요 없음. 완벽해야 할 건 기획서, 디자인

## 작업 진행 순서

### 초기 1회 (전체 작업 시작 시)

| 단계 | 내용 |
|------|------|
| [step-1.md](steps/step-1.md) | 배경 파악 및 문제 정의 |
| [step-2.md](steps/step-2.md) | PR 분할 전략 수립 |

### 계획 반복 (모든 PR에 대해 Step 3 → 4)

| 단계 | 내용 |
|------|------|
| [step-3.md](steps/step-3.md) | 과제 정의 (신규 작업 / QA 대응) |
| [step-4.md](steps/step-4.md) | 구현 방침 상세화 |

> PR #1의 Step 3→4 완료 후 PR #2의 Step 3→4로 진행. 모든 PR의 계획이 끝나면 PLANNING_SESSION 회고 후 구현으로 넘어갑니다.

### PLANNING_SESSION 회고 (계획 완료 후 1회)

모든 PR의 계획이 끝나면, [step-8-retrospect.md](steps/step-8-retrospect.md)로 회고를 수행한 뒤 구현 세션 안내를 출력한다.

### 구현 반복 (PR별 Step 5 ~ 7) — IMPLEMENTATION_SESSION

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

> 마지막 PR의 IMPLEMENTATION_SESSION에서 1회만 수행합니다. 회고는 PLANNING_SESSION(계획 완료 시)과 마지막 IMPLEMENTATION_SESSION에서 각각 수행한다. 채용 마무리는 마지막 IMPLEMENTATION_SESSION에서 수행한다.
>
> **마지막 PR 판별**: `/plan/` 하위에서 가장 높은 번호의 `pr{N}` 디렉토리가 현재 작업 중인 PR이면 마지막. 모든 PR 계획은 PLANNING_SESSION에서 완료되므로 `/plan/`에 전체 PR 목록이 존재한다.

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
