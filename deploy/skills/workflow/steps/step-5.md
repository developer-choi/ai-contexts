# Step 5: 구현

> **이 단계의 목표: 팀을 spawn하고 구현 방침에 따라 코드를 작성한다**

Lead(메인 세션)가 팀을 구성하고, Markup/Feature Implementer가 코드를 작성한다. 커밋마다 리뷰 파이프라인을 수행한다.

`/plan/pr{N}/`의 산출물은 초안이다. 구현 시 계획을 비판적으로 검토하고, 더 나은 방법이 있거나 계획에 문제가 있으면 사용자에게 보고한다.

---

## 브랜치 생성

구현 세션 시작 시 작업 내용에 맞는 브랜치를 새로 생성한다. 이전 세션의 브랜치를 이어서 사용하지 않는다.

- 브랜치명: `feature/{짧은-설명}` (예: `feature/login-form`)
- base: 프로젝트의 기본 브랜치 (main 또는 master)
- 이전 브랜치가 남아 있어도 새로 딴다 — 세션마다 깨끗한 상태에서 시작

---

## 팀 Spawn

[CRITICAL] [team-agent](../../../contexts/team-agent.md)의 규칙을 따른다.

step-5 진입 시 아래 팀을 spawn한다.

```
Lead (메인 세션) — 사용자 소통 + 팀 spawn + Coding-Standards 리뷰 종합
├── Markup Implementer (sonnet) — 마크업 전용 (CSS, 최소한의 컴포넌트 props). 로직·테스트 작성 안 함
├── Feature Implementer (sonnet) — 로직 구현 + 테스트 작성 + React.memo 등 성능 최적화
├── Figma Reviewer (sonnet) — 피그마 토큰 대조 (Markup Implementer 커밋에서만)
├── Coding-Standards Reviewer ×N (sonnet) — 컨벤션 기계적 대조
└── Advanced Reviewer (opus) — coding standard 판단 + 자유 리뷰
```

### Spawn 시 컨텍스트 주입

에이전트는 스스로 컨텍스트를 탐색하지 않는다. **Lead가 필요한 컨텍스트를 주입한다.** Lead는 `/plan/` 하위를 탐색하여 산출물을 파악하고, 아래 기준에 따라 분류하여 각 에이전트에게 전달한다.

| 에이전트 | Lead가 주입하는 컨텍스트 |
|----------|--------------------------|
| Markup Implementer | step-4 파생 산출물 중 마크업 관련, 매칭표, 디자인시스템 소스, 기존 mixin/레이아웃 패턴, map.md 중 마크업 관련 rules |
| Feature Implementer | step-4 파생 산출물 중 로직 관련, 참조할 기존 코드 경로, map.md 중 로직 관련 rules |
| Figma Reviewer | 매칭표 |
| Coding-Standards Reviewer ×N | 담당 컨벤션 문서, 리뷰 관점 지시 (해당 컨벤션 위반만 집중) |
| Advanced Reviewer | [code-review](../../code-review/SKILL.md) 절차, coding standards, step-4 산출물 중 테스트 관련 |

리뷰어는 [code-review](../../code-review/SKILL.md)의 절차를 따른다.

### 매칭표 생성 (실무 프로젝트만)

실무 프로젝트 + 피그마 MCP 연결인 경우, Markup Implementer spawn 전에 [figma-component-mapping/guide.md](../figma-component-mapping/guide.md)에 따라 매칭표를 생성하고 컨텍스트에 포함한다.

### Markup Implementer 필수 지침

Markup Implementer spawn 시 컨텍스트와 함께 반드시 전달:

1. **"피그마 참조 코드의 CSS 토큰을 매칭표와 대조하라"** — 스크린샷 보고 감으로 작성 금지
2. **"하드코딩 금지, 토큰만 사용"** — `16px` 대신 `var(--semantic-padding-lg)`
3. **구현 후 피그마 자동 대조** — 피그마 다시 fetch해서 토큰/레이아웃/props 비교

### Coding-Standards Reviewer 분할

Lead가 [coding-standards/map.md](../../../contexts/coding-standards/map.md)와 프로젝트별 컨벤션에서 이번 PR 범위에 해당하는 규칙을 선별하고, 주제별로 N개 reviewer를 spawn한다.

- 분할 단위는 Lead 재량

---

## 리뷰 파이프라인

커밋마다 아래 파이프라인을 수행한다. **Coding-Standards ×N과 Advanced Reviewer는 병렬 실행.**

### Markup Implementer 파이프라인 (2단계)

```
1. Figma Reviewer ↔ Markup Implementer (직접 루프, 0건까지)
       ↓
2. Coding-Standards Reviewer ×N + Advanced Reviewer (전부 병렬) → Lead 종합 → Markup Implementer → 반복 (0건까지)
```

### Feature Implementer 파이프라인 (1단계)

```
Coding-Standards Reviewer ×N + Advanced Reviewer (전부 병렬) → Lead 종합 → Feature Implementer → 반복 (0건까지)
```

### Figma Reviewer (Markup Implementer 커밋만)

- Figma Reviewer ↔ Markup Implementer SendMessage로 직접 루프
- Lead 개입 없음
- 0건이면 Lead에게 보고

### Coding-Standards Reviewer ×N + Advanced Reviewer (병렬)

- Coding-Standards Reviewer ×N과 Advanced Reviewer를 동시에 실행한다
- Coding-Standards: 지적사항에는 근거가 되는 컨벤션 파일 경로를 함께 명시한다 (예: `rules/personal/naming.md — camelCase 규칙 위반`)
- 모든 리뷰어가 결과를 Lead에게 제출
- Lead가 종합:
  - Coding-Standards와 Advanced 결과를 병합
  - 중복 이슈 제거
  - sonnet 결과의 신뢰도 판단
  - 이상해 보이면 사용자에게 확인
  - 검증된 이슈만 Implementer에게 한번에 전달
- Implementer 수정 후 → 전체 병렬 재검증 → Lead 종합 → 반복 (0건까지)

### 커밋 정리

파이프라인이 0건으로 통과하면, 원본 커밋과 리뷰 수정 커밋들을 하나의 커밋으로 스쿼시한다. 스쿼시 후 다음 구현 커밋을 쌓는다.

---

## gotchas

- **프로젝트 세팅 PR** — 린트, 포맷터 등 설정만 추가하는 PR은 팀 spawn 없이 Lead가 직접 구현한다. 도구별로 (설치+설정 → 커밋 → 위반 수정 → 커밋) 사이클을 반복한다. 설정을 몰아서 커밋하고 수정을 나중에 하면 안 된다 — 리뷰어가 도구별 영향을 diff로 확인할 수 있어야 한다. lint-staged는 해당 시점에 설치된 도구만 참조한다.
- **커밋 분리 판단: 독립 설명 테스트** — 구현 중 계획에 없던 작업이 발생하면, "이 변경을 현재 작업 대상 없이도 독립적으로 설명할 수 있는가?"를 묻는다. 독립 설명이 가능하면(예: vitest 세팅 — "테스트 인프라 구축") 별도 커밋. 불가능하면(예: 이 컴포넌트 전용 토큰 — 컴포넌트 없이 의미 없음) 현재 커밋에 포함한다.
- 새 파일/모듈을 만들기 전에 프로젝트에 같은 역할의 코드가 이미 있는지 확인한다. 기존 API, 타입, 컴포넌트를 재사용할 수 있으면 새로 만들지 않는다.
- `/plan/` 하위 문서 변경은 소스코드 커밋에 포함하지 않고 별도 커밋한다.

---

## 마무리

- test-cases.md의 모든 `##` 섹션이 실제 테스트 코드로 구현되었는지 대조한다. 누락된 섹션이 있으면 사용자에게 보고한다
- 전체 리뷰 완료 후, Lead가 사용자에게 리뷰 결과 보고
  - 커밋 목록
  - 리뷰 결과 요약 (각 단계별 이슈 수 + 해결 내용)
  - test-cases.md 커버리지 (전체 섹션 수 / 구현된 섹션 수)
  - 수정 사항 (있는 경우)
- 사용자가 직접 코드 확인

---

## 산출물 소비

구현이 완료되면, Lead가 코드에 1:1로 반영된 내용(구현 지시·인터페이스 명세 등)을 `/plan/pr{N}/`에서 정리한다. 파일 전체가 해당하면 파일을 삭제하고, 일부만 해당하면 해당 내용만 제거한다. 판단·결정·방향을 담은 내용은 Step 7에서 PR 본문에 녹인 뒤 정리하므로 이 단계에서는 유지한다.
