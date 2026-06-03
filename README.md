# AI Contexts

AI 시대 개발자의 가치는 두 가지라고 생각합니다. **일을 만들어서 AI에게 시키는 것**, 그리고 **AI가 만든 결과물을 잘 리뷰하는 것**.

이 저장소는 전자를 위한 것입니다.

## 한 번 내린 판단을 프롬프트로

한 번 내린 판단은 프롬프트로 만들어 AI에게 위임합니다. 같은 결정을 두 번 하지 않기 위해서입니다.

### 일하는 방식을 옮긴 워크플로우

예를 들어 [workflow](deploy/skills/workflow/README.md)는 제가 일하는 방식 자체를 프롬프트로 옮긴 것입니다. 기획서나 피그마를 넣으면 PR이 나옵니다.

작업은 여러 단계로 나뉘어 각각 독립된 맥락에서 진행됩니다. 자료를 읽고 무엇을 왜 해야 하는지 정리한 뒤 할 일을 PR 단위로 쪼개고, 화면 마크업을 PR 작업과 동시에 만들고, PR마다 설계와 구현, 본문 작성을 거칩니다.

다음 PR의 설계를 이번 PR의 구현과 겹쳐서 굴리므로, 여러 PR이 병렬로 흐릅니다.

### 회고를 옮긴 마무리 절차

[pre-exit](deploy/skills/pre-exit/README.md)는 세션이 끝날 때 회고를 수행하는 스킬입니다. 그 회고를 통해 스킬 자체도 개선합니다. 회고하는 방법 자체도 프롬프트가 된 셈입니다.

반복된 실수 패턴을 찾아 규칙으로 남길 자리를 제안하고, 거기서 얻은 교훈을 그 교훈이 쓰일 자리에 직접 심어 둡니다. 사람이 기억하지 않아도 AI가 해당 맥락에서 자동으로 꺼내 씁니다.

## AI가 먼저 제안합니다

미리 방향을 정해두면, AI가 그 안에서 사용자가 미처 보지 못한 것을 발굴합니다.

[requirement-review](deploy/skills/workflow/requirement-review/README.md)는 기획서, 디자인 시안, 채용 과제를 구현 전에 개발자 관점에서 점검하는 스킬입니다. 기획서는 화면 목적과 사용자 동선, 예외 상황을 짚고, 디자인 시안은 반응형과 상태별 화면을 살피고, 채용 과제는 숨은 평가 포인트를 역으로 추론합니다.

요구사항을 받자마자 코드를 짜면 빈틈이 구현 도중에야 드러납니다. 그 빈틈을 먼저 질문으로 끄집어내 두는 것이 이 스킬의 일입니다.

## 리뷰 비용을 줄이는 구조

AI가 작성하는 코드의 양이 늘수록, 사람이 리뷰해야 할 양도 늘어납니다. 이를 해결하는 방법은 리뷰를 더 열심히 하는 게 아니라, 리뷰 양을 줄이는 것입니다.

도입 비용이 저렴한 순서로 정리하면 다음과 같습니다.

### 자동 검사로 거르기

타입이 맞지 않거나 없는 값을 쓰는 코드처럼, 동작은 하지만 버그를 품은 패턴이 있습니다. 사람이 수백 줄을 읽으며 매번 찾아내기는 어렵습니다. 이런 패턴은 커밋 시점에 자동으로 차단하면, 리뷰어는 로직과 설계에만 집중할 수 있습니다.

### 테스트로 거르기

AI가 코드를 만들거나 고칠 때마다, 기존 동작이 깨지지 않았는지 테스트가 자동으로 확인합니다. 사람이 직접 검증해야 할 범위가 그만큼 줄어듭니다.

### AI 리뷰로 거르기

자동 검사가 잡지 못하는 문제(화면과 데이터 로직이 섞여 있어 분리가 필요한 경우 등)는 AI 리뷰가 맡습니다. 반복된 지적은 규칙으로 쌓아 두어, 사람이 리뷰에 쓰는 시간이 점점 줄어듭니다.

## 스킬 목록

### 개발 워크플로우

- [workflow](deploy/skills/workflow/README.md): 기획서나 피그마를 넣으면 PR이 나오는 단계별 프로세스
  - [requirement-review](deploy/skills/workflow/requirement-review/README.md): 기획서, 디자인 시안, 채용 과제를 구현 전에 개발자 관점에서 점검
  - [bug-investigation](deploy/skills/workflow/bug-investigation/README.md): 버그의 근본 원인 추적 및 수정 방안 제안
  - [pr-comment-respond](deploy/skills/workflow/pr-comment-respond/README.md): 내 PR에 달린 리뷰 피드백에 대응

### 리뷰

- [code-review](deploy/skills/code-review/README.md): 코드 변경을 규칙과 품질 기준으로 리뷰하고 고칠 거리 목록 산출

### 학습

- [simplify](deploy/skills/simplify/README.md): 오픈소스 코드를 학습 목적으로 간소화

### 커뮤니케이션

- [discussion](deploy/skills/discussion/README.md): 기술 주제에 대해 비판적으로 토론
- [pr-comment-write](deploy/skills/pr-comment-write/README.md): 남의 PR 코멘트 내용 검증 및 말투 다듬기

### 유틸리티

- [pre-exit](deploy/skills/pre-exit/README.md): 세션 종료 시 회고 및 스킬 개선
- [backlog](deploy/skills/backlog/README.md): 스킬 아이디어 수집 및 분류
