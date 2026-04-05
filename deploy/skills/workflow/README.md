# Workflow

제가 일하는 방식을 프롬프트로 옮긴 것입니다. 기획서, 피그마, 버그 리포트, 채용 과제 등을 입력하면 PR이 나옵니다.

## 왜 만들었나요?

제가 실무에서 이렇게 일하기 때문입니다.

기획서를 받으면 바로 코드를 짜지 않습니다. 배경을 파악하고, 작업을 PR 단위로 나누고, 구현 방침을 세운 뒤에 코드를 작성합니다. 구현이 끝나면 코드 품질을 점검하고, 리뷰어가 읽기 좋은 PR 본문을 작성합니다. 커밋 하나하나까지 신경 씁니다.

이 과정을 프롬프트로 옮겨서, AI도 같은 방식으로 일하도록 만든 것입니다.

## 핵심: 오케스트레이션

워크플로우의 각 단계는 작업 종류(기능 개발, 버그 수정, 채용 과제 등)에 따라 다른 전문 스킬을 호출합니다. 워크플로우 자체는 "언제 어떤 스킬을 호출할지"를 판단하는 오케스트레이터 역할을 합니다.

## 에이전트 구조

이 워크플로우는 세 종류의 에이전트를 조합합니다.

### 메인 에이전트 (Lead)

전체 흐름을 관리합니다. 사용자와 소통하고, 각 단계에서 어떤 스킬을 호출할지 판단하고, 에이전트들에게 필요한 정보를 전달합니다.

### Agent Teams (Step 5)

구현과 리뷰 단계에서는 Claude Code의 [Agent Teams](https://code.claude.com/docs/en/agent-teams) 기능으로 역할별 AI 팀을 구성합니다.

- **Lead** — 사용자 소통 + 리뷰 종합
- **Markup Implementer** — 마크업 전용
- **Feature Implementer** — 로직 + 테스트
- **Figma Reviewer** — 디자인 시안과 코드 비교
- **Convention Reviewer** — 코딩 규칙 검증
- **Advanced Reviewer** — 코드 품질 심층 리뷰

Implementer가 코드를 작성하고 커밋하면, Reviewer가 해당 커밋을 리뷰합니다. 이슈가 있으면 Reviewer가 Implementer에게 직접 전달하고, 이슈가 0건이 될 때까지 반복합니다. 컨벤션 검증만 여러 리뷰어가 동시에 수행하고, 나머지 단계는 순서대로 진행됩니다.

> "Agent teams let you coordinate multiple Claude Code instances working together. One session acts as the team lead, coordinating work, assigning tasks, and synthesizing results. Teammates work independently, each in its own context window, and communicate directly with each other."
> — [Claude Code Docs: Agent Teams](https://code.claude.com/docs/en/agent-teams)

### 서브에이전트

에이전트 간 소통이 필요 없는 단독 작업을 위임할 때 사용합니다. Agent Teams와 달리 결과만 보고받는 구조입니다.

## 설계 근거

### 왜 팀을 선택했나요?

서브에이전트는 작업을 마치면 종료됩니다. Agent Teams의 에이전트는 세션이 끝날 때까지 살아 있습니다. 여러 커밋에 걸쳐 리뷰 맥락이 누적되므로, 커밋이 쌓일수록 더 정확한 리뷰가 가능합니다. 작업이 끝난 뒤에는 에이전트에게 회고를 요청할 수도 있습니다.

### 왜 구현자와 리뷰어를 분리했나요?

코드를 작성한 에이전트가 직접 리뷰하면, 자기가 작성한 방향에 치우쳐서 문제를 놓치기 쉽습니다. 독립된 리뷰어가 처음 보는 시선으로 코드를 검토해야 실제 문제를 잡아낼 수 있습니다.

> "Sequential investigation suffers from anchoring: once one theory is explored, subsequent investigation is biased toward it."
> — [Claude Code Docs: Agent Teams](https://code.claude.com/docs/en/agent-teams)

### 왜 리뷰어를 여러 명으로 나눴나요?

두 가지 이유입니다.

첫째, **리뷰 정확도**입니다. 컨벤션 종류가 많아서 하나의 리뷰어가 모든 규칙을 동시에 보면 놓치는 것이 생깁니다. 종류별로 분리하면 각자 맡은 규칙에만 집중할 수 있습니다.

둘째, **비용 효율**입니다. 리뷰어를 나눈 김에 작업 성격에 맞게 모델도 다르게 배정했습니다. 기계적인 검증은 가벼운 모델(Sonnet)에게, 깊은 사고가 필요한 리뷰는 무거운 모델(Opus)에게 맡깁니다.

### 왜 0건이 될 때까지 반복하나요?

리뷰에서 발견한 이슈를 수정한 뒤 다시 확인하면, 여전히 문제가 남아 있는 경우가 있습니다. 한 번 리뷰로는 충분하지 않기 때문에, 이슈가 0건이 나올 때까지 리뷰-수정 사이클을 반복합니다.

## 8단계 흐름

### Step 1. 배경 파악

프로젝트의 현재 상황과 요구사항을 수집합니다. 기획서, 피그마, 버그 리포트 등 주어진 자료를 읽고 "무엇을 왜 해야 하는지"를 정리합니다. 작업 종류에 따라 다른 스킬이 호출됩니다.

- [requirement-review](requirement-review/SKILL.md) — 기획서, 디자인 시안, 채용과제 요구사항을 개발자 관점에서 리뷰
- [bug-investigation](bug-investigation/README.md) — 버그의 근본 원인 추적 및 수정 방안 제안

### Step 2. PR 분할

전체 작업을 리뷰하기 좋은 크기의 PR 단위로 나눕니다. 한 번에 모든 것을 바꾸는 대신, 각 PR이 하나의 명확한 목적을 갖도록 계획합니다.

- [codebase-audit](codebase-audit/README.md) — 기존 코드의 구조와 영향 범위 분석

### Step 3. 과제 정의

각 PR의 목표와 접근 방식을 결정합니다. 새로운 기능인지, 버그 수정인지, 리뷰 피드백 대응인지에 따라 방향이 달라집니다.

### Step 4. 구현 방침

3단계에서 정한 방향을 구체적인 구현 계획으로 발전시킵니다. 어떤 파일을 어떤 순서로 수정할지, 주의할 점은 무엇인지를 미리 정리합니다.

### Step 5. 구현

Agent Teams로 역할별 AI 팀을 구성하고, Implementer가 코드를 작성합니다. 커밋마다 디자인 대조 → 컨벤션 검증 → 고급 리뷰 순서로 3단계 리뷰를 수행합니다.

### Step 6. 최종 점검

구현 단계의 리뷰어가 같은 코드를 반복해서 보면 편향이 생길 수 있습니다. 이를 방지하기 위해 새로운 리뷰어를 투입하고, PR 전체 변경사항을 처음부터 다시 검증합니다.

### Step 7. PR 본문 작성

리뷰어가 변경 내용을 빠르게 이해할 수 있도록 PR 설명을 작성합니다. 왜 이런 변경을 했는지, 어떤 점을 중점적으로 봐달라는 것인지를 정리합니다.

### Step 8. 마무리

전체 워크플로우를 되돌아보며 회고합니다. 작업 유형에 따라 제출 절차를 마무리합니다.

> 리뷰 피드백을 받으면 [pr-comment-respond](pr-comment-respond/README.md)가 코멘트를 분류하고 대응 전략을 세운 뒤, Step 3부터 다시 반복합니다.

> 자세한 내용은 [SKILL.md](SKILL.md)를 참고하세요.
