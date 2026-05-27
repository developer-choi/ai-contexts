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

### Agent Teams (PR_{N}_IMPL)

구현과 리뷰 세션에서는 Claude Code의 [Agent Teams](https://code.claude.com/docs/en/agent-teams) 기능으로 역할별 AI 팀을 구성합니다.

- **Lead** — 사용자 소통 + 리뷰 종합
- **Markup Implementer** — 마크업 전용
- **Feature Implementer** — 로직 + 테스트
- **Figma Reviewer** — 디자인 시안과 코드 비교
- **Coding-Standards Reviewer** — 코딩 규칙 검증
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

## 호출

`/workflow <세션> <모드>` 형태로 호출합니다. 세션은 `BG` / `FOUNDATION` / `MARKUP` / `PR_{N}_PLAN` / `PR_{N}_IMPL` / `PR_{N}_WRITING` 중 하나, 모드는 `채용` 또는 `실무`입니다. BG로 시작한 뒤 후속 세션은 직전 세션이 spawn 안내를 출력합니다.

모드를 둔 이유는 채용 과제와 실무 프로젝트가 시작 지점이 다르기 때문입니다. 채용은 빈 레포에서 폴더 구조·코딩 스탠다드부터 깔아야 하므로 FOUNDATION 세션을 거치고, 실무는 기존 코드 위에서 시작하므로 BG 뒤 바로 MARKUP·PR_1_PLAN으로 갈라집니다.

## 세션 라인업

각 세션은 별도 컨텍스트에서 동작합니다. 끝나면 다음 세션을 spawn하라는 안내가 나옵니다.

- **BG** — 배경 파악과 PR 분할. 기획서·피그마·채용 원본을 읽고 무엇을 왜 해야 하는지 정리한 뒤, 작업을 PR 단위로 쪼갭니다.
- **FOUNDATION** (채용 전용) — 폴더 구조·코딩 스탠다드 마이그레이션 등 PR1 베이스 셋업. 본격 작업은 PR_1_PLAN 도미노가 받아갑니다.
- **MARKUP** — 피그마 시안을 페이지·섹션·위젯·컴포넌트 단위로 잘라 마크업 워크트리에서 작업합니다. 포트 3000을 점유합니다.
- **PR_{N}_PLAN** — 과제 정의(step-3)와 구현 방침(step-4). step-4 끝에서 후속 PR의 stub 시그니처를 만들면 PR_{N+1}_PLAN과 PR_{N}_IMPL이 병렬로 spawn됩니다.
- **PR_{N}_IMPL** — Agent Teams로 구현·리뷰. stub 위에 본체를 채우고, 커밋마다 컨벤션·고급 리뷰가 0건이 될 때까지 반복합니다.
- **PR_{N}_WRITING** — 구현 맥락 없이 산출물 파일만 보고 PR 본문을 작성합니다.

리뷰 코멘트를 받으면 [pr-comment-respond](pr-comment-respond/README.md)가 분류·대응 전략을 세운 뒤 PR_{N}_PLAN부터 다시 돕니다. 채용 과제의 마지막 PR이 끝나면 [recruitment](recruitment/SKILL.md)로 제출 절차를 마무리합니다.

> 세션별 진입 조건·입출력·후속 트리거는 [SKILL.md](SKILL.md)의 「세션」 표와 「의존성 그래프」를 참고하세요.
