# AI Contexts

AI 시대 개발자의 가치는 두 가지라고 생각합니다. **무엇을 만들지 잘 정의하는 것**, 그리고 **AI가 만든 결과물을 잘 리뷰하는 것**.

이 저장소는 전자를 위한 것입니다.

잘 리뷰하기 위한 전문성은 [knowledge-archive](https://github.com/developer-choi/knowledge-archive)에서 기릅니다.

---

## 무엇을 만들지 잘 정의하는 것

한 번 내린 판단은 프롬프트로 만들어 AI에게 위임합니다. 같은 결정을 두 번 하지 않기 위해서입니다.

### Workflow Skill

예를 들어 [workflow](deploy/skills/workflow/README.md)는 제가 일하는 방식 자체를 프롬프트로 옮긴 것입니다. 기획서나 피그마를 입력하면 PR이 나옵니다.

> - Step 1 **배경 파악**: 주어진 자료를 읽고 무엇을 왜 해야 하는지 정리
> - Step 2 **PR 분할**: 리뷰하기 좋은 크기로 작업을 나눔
> - Step 3 **과제 정의**: 각 PR의 목표와 접근 방식 결정
> - Step 4 **구현 방침**: 구체적인 구현 계획 수립
> - Step 5 **구현**: 코드 작성 및 커밋
> - Step 6 **최종 점검**: 코드 품질과 설계 일관성 검증
> - Step 7 **PR 본문 작성**: 리뷰어를 위한 PR 설명 작성
> - Step 8 **마무리**: 회고 및 제출 절차 마무리

### Pre-exit Skill

[pre-exit](deploy/skills/pre-exit/README.md)는 세션이 끝날 때 회고를 수행하는 스킬입니다. 그 회고를 통해 스킬 자체도 개선합니다. 회고하는 방법 자체도 프롬프트가 된 셈입니다.

> - 반복된 실수 패턴을 찾아 규칙화할 위치를 제안합니다
> - 사용자가 반려하거나 수정한 것을 되짚고 피드백으로 저장합니다
> - 세션에서 얻은 교훈은 그것이 활용될 맥락에 직접 심어둡니다. 사람이 기억할 필요 없이 AI가 해당 맥락에서 자동으로 꺼내 씁니다

---

## AI가 먼저 제안합니다

미리 방향을 정해두면, AI가 그 안에서 사용자가 미처 보지 못한 것을 발굴합니다.

### Recruitment Review Skill

[recruitment-review](deploy/skills/workflow/recruitment-review/README.md)

> - 공고·메일·과제 요구사항을 교차 분석하여 암묵적 평가 포인트를 역추론합니다
> - 완성도(404, 파비콘, OG 태그), UX(뒤로가기, 빈 상태, 토스트 피드백) 등 사람이 미처 챙기지 못하는 디테일까지 TODO로 쌓아둡니다
> - 사용자와 AI가 서로 아이디어를 주고받으며 구현 스펙을 만들어갑니다

### Spec Review Skill

[spec-review](deploy/skills/workflow/spec-review/README.md)

> 기획서나 피그마를 받으면 코드를 짜기 전에 개발자 관점에서 빠진 부분이 없는지 점검합니다.
> - 관심사별 점검: 화면 목적, 사용자 동선, 에러/예외, 데이터, 라우팅, 디자인
> - 페이지 특성별 점검: 폼, 목록, 순차 플로우, 상세 페이지

---

## 리뷰 비용을 줄이는 구조

AI가 작성하는 코드의 양이 늘수록, 사람이 리뷰해야 할 양도 늘어납니다. 이를 해결하는 방법은 리뷰를 더 열심히 하는 게 아니라, 리뷰 양을 줄이는 것입니다.

도입 비용이 저렴한 순서로 정리하면:

### 1. [정적 분석](링크) <!-- TODO 다른 레포 예제 페이지 완성되면 링크 교체 --> — 커밋 시점에 자동으로 차단

```typescript
const first: string = users[5];  // 실제로는 undefined — 타입은 정상으로 통과
```

이런 코드는 동작은 하지만 버그를 품고 있습니다. 사람이 수백 줄을 리뷰하면서 이런 패턴을 매번 찾아내기는 어렵습니다. 린트가 커밋 시점에 자동으로 차단하면, 리뷰어는 로직과 설계에만 집중할 수 있습니다.

### 2. [테스트 코드](링크) <!-- TODO 다른 레포 예제 페이지 완성되면 링크 교체 --> — 동작을 보장

```typescript
expect(screen.getByRole("img", { name: /배너/ })).toBeInTheDocument();
```

AI가 코드를 생성하거나 수정할 때마다, 기존 동작이 깨지지 않았는지 테스트가 자동으로 확인합니다.
이를 통해 사람이 검증해야 할 범위가 줄어듭니다.

### 3. [AI 코드리뷰](링크) <!-- TODO 다른 레포 예제 페이지 완성되면 링크 교체 --> — 사람이 놓친 패턴을 잡음

```typescript
// "이 컴포넌트는 UI와 데이터 로직이 섞여 있습니다. 분리를 권장합니다."
```

린트가 잡지 못하는 문제는 AI 코드리뷰가 담당하고, 반복된 지적은 컨벤션에 축적됩니다.
이를 통해 사람이 리뷰에 쓰는 시간이 줄어듭니다.

---

## 스킬 목록

### 개발 워크플로우

- [workflow](deploy/skills/workflow/README.md) — 기획서나 피그마를 입력하면 PR이 나오는 8단계 프로세스
  - [spec-review](deploy/skills/workflow/spec-review/README.md) — 기획서의 빠진 부분과 모호한 점을 점검
  - [recruitment-review](deploy/skills/workflow/recruitment-review/README.md) — 채용 과제 요구사항 분석 및 어필 포인트 발굴
  - [bug-investigation](deploy/skills/workflow/bug-investigation/README.md) — 버그의 근본 원인 추적 및 수정 방안 제안
  - [codebase-audit](deploy/skills/workflow/codebase-audit/README.md) — 기존 코드의 구조와 영향 범위 분석
  - [implementation](deploy/skills/workflow/implementation/README.md) — 계획에 따라 코드 작성 및 커밋
  - [code-review](deploy/skills/workflow/code-review/README.md) — 컨벤션과 품질 기준에 따라 코드 리뷰
  - [pr-comment-respond](deploy/skills/workflow/pr-comment-respond/README.md) — PR 리뷰 피드백에 대응

### 품질 관리

- [scw](deploy/skills/scw/README.md) — 스킬 생성·개선 및 프롬프트 문서 품질 검증

### 학습

- [simplify](deploy/skills/simplify/README.md) — 오픈소스 코드를 학습 목적으로 간소화
- [tech-trends](deploy/skills/tech-trends/README.md) — 기술 트렌드를 프론트엔드 관점에서 설명

### 커뮤니케이션

- [discussion](deploy/skills/discussion/README.md) — 기술 주제에 대해 비판적으로 토론
- [pr-comment-write](deploy/skills/pr-comment-write/README.md) — PR 코멘트 내용 검증 및 말투 다듬기

### 유틸리티

- [pre-exit](deploy/skills/pre-exit/README.md) — 세션 종료 시 회고 및 스킬 개선
- [backlog](deploy/skills/backlog/README.md) — 스킬 아이디어 수집 및 분류
- [doc-router](deploy/skills/doc-router/README.md) — 문서를 적절한 위치로 분류
