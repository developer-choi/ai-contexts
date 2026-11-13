# AI Contexts

AI 시대 개발자의 가치는 두 가지라고 생각합니다. **일을 만들어서 AI에게 시키는 것**, 그리고 **AI가 만든 결과물을 잘 리뷰하는 것**.

이 저장소는 그중 일을 만들어 AI에게 시키는 쪽을 위한 것입니다.

## 한 번 내린 판단을 프롬프트로

한 번 내린 판단은 프롬프트로 만들어 AI에게 위임합니다. 같은 결정을 두 번 하지 않기 위해서입니다.

### 일하는 방식을 옮긴 워크플로우

예를 들어 [workflow](plugins/ac/skills/workflow/README.md)는 제가 일하는 방식 자체를 프롬프트로 옮긴 것입니다. 기획서나 피그마 같은 자료에서 출발해, 단계마다 제가 방향을 정하며 PR까지 갑니다.

일을 PR 단위로 쪼갠 뒤, 다음 PR의 설계를 이번 PR의 개발과 겹쳐 여러 PR을 동시에 진행합니다.

### 회고를 옮긴 마무리 절차

[pre-exit](plugins/ac/skills/pre-exit/README.md)는 세션이 끝날 때 그 세션을 회고하는 스킬입니다.

반복된 실수 패턴을 찾아 규칙으로 남길 자리를 제안하고, 얻은 교훈은 고칠 자리와 함께 백로그 항목으로 남깁니다. 그 항목이 규칙에 반영되면 사람이 기억하지 않아도 AI가 해당 맥락에서 자동으로 꺼내 사용합니다.

## AI가 먼저 제안합니다

미리 방향을 정해두면, AI가 그 안에서 제가 미처 보지 못한 것을 찾아냅니다.

[requirement-review](plugins/ac/skills/workflow/requirement-review/README.md)는 기획서, 디자인 시안, 채용 과제를 개발에 들어가기 전에 개발자 관점에서 점검하는 스킬입니다.

요구사항을 받자마자 코드를 작성하면 빈틈은 만드는 도중에야 드러납니다. 그 빈틈을 먼저 질문으로 끄집어내 두는 것이 이 스킬의 일입니다.

## 리뷰 비용을 줄이는 구조

AI가 작성하는 코드의 양이 늘수록, 사람이 리뷰해야 할 양도 늘어납니다. 그래서 리뷰할 양 자체를 줄이는 쪽으로 풀었습니다.

도입 비용이 저렴한 순서로 정리하면 다음과 같습니다.

### 자동 검사로 거르기

타입이 맞지 않거나 없는 값을 사용하는 코드처럼, 동작은 하지만 버그를 품은 패턴이 있습니다. 사람이 수백 줄을 읽으며 매번 찾아내기는 어렵습니다.

이런 패턴은 커밋 시점에 자동으로 차단하면, 리뷰어는 로직과 설계에만 집중할 수 있습니다.

### 테스트로 거르기

기존 동작이 깨지지 않았는지는 테스트를 붙여두면 AI가 코드를 고칠 때마다 자동으로 확인됩니다. 사람이 직접 검증해야 할 범위가 그만큼 줄어듭니다.

### AI 리뷰로 거르기

자동 검사가 잡지 못하는 문제는 AI 리뷰가 맡습니다. 화면을 그리는 코드와 데이터를 처리하는 코드가 섞여 있어 나눠야 하는 경우가 그렇습니다.

이 저장소에서는 [code-review](plugins/ac/skills/code-review/README.md)가 그 역할을 합니다.

반복된 지적은 규칙으로 쌓아 두어, 사람이 리뷰에 들이는 시간이 점점 줄어듭니다.

## 스킬 목록

스킬은 Claude Code plugin `ac`로 설치되고, `/ac:<스킬>`로 호출합니다(설치는 [새 머신 초기화](meta/INSTALLATION_GUIDE.md#새-머신-초기화)).

### 개발 워크플로우

- [workflow](plugins/ac/skills/workflow/README.md): 기획서나 피그마 같은 자료에서 출발해 단계마다 방향을 정하며 PR을 만드는 프로세스
  - [requirement-review](plugins/ac/skills/workflow/requirement-review/README.md): 구현 전 요구사항 점검
- [bug-investigation](plugins/ac/skills/bug-investigation/README.md): 버그·성능 문제의 증상과 근본 원인을 구분해 분석

### 리뷰

- [code-review](plugins/ac/skills/code-review/README.md): 코드 변경을 규칙과 품질 기준으로 리뷰하고 고칠 거리를 목록으로 정리
- [prompt-review](plugins/ac/skills/prompt-review/SKILL.md): 스킬·규칙·프롬프트 문서를 기준으로 리뷰하고 지적을 반영해 고침

### 학습

- [simplify](plugins/ac/skills/simplify/README.md): 라이브러리를 학습에 필요한 구현만 남겨 단순화

### 커뮤니케이션

- [discussion](plugins/ac/skills/discussion/README.md): 기술 주제에 대해 비판적으로 토론
- [write-doc](plugins/ac/skills/write-doc/SKILL.md): 글을 골격부터 함께 작성해 표현을 다듬고 발행까지 마침

### 유틸리티

- [pre-exit](plugins/ac/skills/pre-exit/README.md): 세션이 끝날 때 회고하고 교훈을 백로그 항목으로 남김
- [backlog](plugins/ac/skills/backlog/README.md): 떠오른 메모를 영역·프로젝트별로 갈라, 나중에 바로 작업을 시작할 수 있게 남김
