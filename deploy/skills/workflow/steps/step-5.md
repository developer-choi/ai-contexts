# Step 5: 구현

> **이 단계의 목표: 팀을 spawn하고 구현 방침에 따라 코드를 작성한다**

Lead(메인 세션)가 팀을 구성하고, Markup/Feature Implementer가 코드를 작성한다. 커밋마다 리뷰 파이프라인을 수행한다.

`/plan/pr{N}/`의 산출물(stub 코드 + 잔존 md)은 초안이다. 구현 시 계획을 비판적으로 검토하고, 더 나은 방법이 있거나 계획에 문제가 있으면 사용자에게 보고한다.

---

## 워크트리 진입

이전 단계에서 만든 워크트리에서 작업한다. 워크트리·브랜치를 새로 만들지 않는다.

- 워크트리에는 stub 커밋이 이미 base 위에 쌓여 있다
- 이 커밋 위에 구현 커밋을 쌓아나간다
- stub 커밋은 구현이 끝난 뒤 「커밋 재정렬」 단계에서 base 위에서 제거된다

메인 세션이 직접 cwd를 옮길 수 없으면 사용자에게 워크트리 디렉토리에서 새 세션을 띄워 이어가도록 안내한다.

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

에이전트는 스스로 컨텍스트를 탐색하지 않는다. **Lead가 필요한 컨텍스트를 주입한다.** Lead는 `/plan/` 하위와 step-4 stub 파일들을 탐색하여 산출물을 파악하고, 아래 기준에 따라 분류하여 각 에이전트에게 전달한다.

| 에이전트 | Lead가 주입하는 컨텍스트 |
|----------|--------------------------|
| Markup Implementer | stub `.tsx`의 JSX 부분 + `.module.scss` stub + `markup.md`(있으면), 매칭표, 디자인시스템 소스, 기존 mixin/레이아웃 패턴, AC coding-standards/map.md + MP best-practices-map.md 중 마크업 관련 rules |
| Feature Implementer | hook·페이지 stub 파일들 + `logic.md`(있으면), 참조할 기존 코드 경로, AC coding-standards/map.md + MP best-practices-map.md 중 로직 관련 rules |
| Figma Reviewer | 매칭표 |
| Coding-Standards Reviewer ×N | 담당 컨벤션 문서, 리뷰 관점 지시 (해당 컨벤션 위반만 집중) |
| Advanced Reviewer | [code-review](../../code-review/SKILL.md) 절차, coding standards, stub `*.test.tsx`의 `it.todo` |

리뷰어는 [code-review](../../code-review/SKILL.md)의 절차를 따른다.

### 매칭표 생성 (실무 프로젝트만)

실무 프로젝트 + 피그마 MCP 연결인 경우, Markup Implementer spawn 전에 [figma-component-mapping/guide.md](../figma-component-mapping/guide.md)에 따라 매칭표를 생성하고 컨텍스트에 포함한다.

### Markup Implementer 필수 지침

Markup Implementer spawn 시 컨텍스트와 함께 반드시 전달:

1. **"피그마 참조 코드의 CSS 토큰을 매칭표와 대조하라"** — 스크린샷 보고 감으로 작성 금지
2. **"하드코딩 금지, 토큰만 사용"** — `16px` 대신 `var(--semantic-padding-lg)`
3. **구현 후 피그마 자동 대조** — 피그마 다시 fetch해서 토큰/레이아웃/props 비교

### Coding-Standards Reviewer 분할

Lead가 AC [coding-standards/map.md](../../../contexts/coding-standards/map.md) + MP `docs/best-practices-map.md` + 프로젝트별 컨벤션에서 이번 PR 범위에 해당하는 규칙을 선별하고, 주제별로 N개 reviewer를 spawn한다.

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

## stub 주석 해결 시 즉시 삭제

step-4에서 stub 파일에 남긴 `// [stub]:` 본문 주석과 `/* [stub] ... */` 상단 블록은 step-4 룰(「본문 주석은 `[stub]` / `TODO` 마커 분리 필수」)에 따라 IMPL 시 일괄 처리되는 임시 마커다. step-5에서 stub을 실제 코드로 채우며 `[stub]` 주석이 가리킨 사항을 해결한 즉시 해당 주석을 삭제한다.

`// TODO:` 주석은 별도 처리한다 — 다음 PR 또는 별도 이슈로 이연되는 실제 후속 작업이므로 IMPL 종료 후에도 잔존 가능하다. 잔존 항목은 IMPL 종료 보고에 이연 사유와 함께 명시한다.

원칙:

- `[stub]` 주석 1건을 해결한 커밋에서 같은 커밋 안에 주석도 함께 삭제 (별도 정리 커밋 만들지 않음)
- 해결 안 된 `[stub]`을 남긴 채 step-5 종료하지 않음 — 미해결 `[stub]`은 IMPL 종료 보고에 포함하여 사용자 검토
- 파일 최상단의 `/* [stub] [Convention] [Reference] */` 블록도 stub 단계 임시 마커다. step-5에서 출처 확인이 끝났으면 블록 전체를 삭제한다 (IMPL 완료 시 `[stub]` 마커는 본문 주석과 상단 블록 모두 0건)
- `// TODO:`는 IMPL 종료 시점에 잔존 가능. 종료 보고에 잔존 항목 + 이연 사유(예: "PR3에서 처리")를 명시한다

---

## gotchas

- **프로젝트 세팅 PR** — 린트, 포맷터 등 설정만 추가하는 PR은 팀 spawn 없이 Lead가 직접 구현한다. 도구별로 (설치+설정 → 커밋 → 위반 수정 → 커밋) 사이클을 반복한다. 설정을 몰아서 커밋하고 수정을 나중에 하면 안 된다 — 리뷰어가 도구별 영향을 diff로 확인할 수 있어야 한다. lint-staged는 해당 시점에 설치된 도구만 참조한다.
- **커밋 분리 판단: 독립 설명 테스트** — 구현 중 계획에 없던 작업이 발생하면, "이 변경을 현재 작업 대상 없이도 독립적으로 설명할 수 있는가?"를 묻는다. 독립 설명이 가능하면(예: vitest 세팅 — "테스트 인프라 구축") 별도 커밋. 불가능하면(예: 이 컴포넌트 전용 토큰 — 컴포넌트 없이 의미 없음) 현재 커밋에 포함한다.
- 새 파일/모듈을 만들기 전에 프로젝트에 같은 역할의 코드가 이미 있는지 확인한다. 기존 API, 타입, 컴포넌트를 재사용할 수 있으면 새로 만들지 않는다.

---

## 커밋 재정렬

모든 구현 커밋이 쌓이면, stub 커밋을 base 위에서 제거하여 PR에 들어가는 커밋 히스토리를 정리한다.

```
git rebase --onto <base-branch> <stub-commit> HEAD
```

- `<base-branch>`: 프로젝트의 기본 브랜치 (main 또는 master)
- `<stub-commit>`: 이전 단계에서 만든 stub 커밋 해시
- 결과: stub 커밋이 사라지고, 구현 커밋들이 base 위에 바로 쌓인 형태가 됨

재정렬 과정에서 충돌이 발생하면 해결하고 진행한다. 재정렬 후 첫 구현 커밋의 diff가 의도대로 base 기준인지 확인한다.

stub만 만들고 구현에서 한 번도 건드리지 않은 파일(예: 계획 변경으로 사용 안 된 utility stub)은 재정렬 결과물에서 자동으로 사라진다 — 의도된 정리 효과다.

---

## 마무리

- **stub `*.test.tsx`의 `it.todo` 자연어와 실제 작성된 `it(...)` 케이스를 대조**한다 (대조 절차는 SKILL.md 「자가 검토 필수」 일반 규칙). 누락된 todo가 있으면 사용자에게 보고한다
- **stub 본문 `// [stub]:` 주석 잔존 점검** — 0건 필수 (위 「stub 주석 해결 시 즉시 삭제」). 잔존하면 종료 안 됨
- **stub 상단 `/* [stub] [Convention] [Reference] */` 블록 잔존 점검** — 0건 필수 (위 「stub 주석 해결 시 즉시 삭제」). 잔존하면 종료 안 됨
- **`// TODO:` 주석 잔존 보고** — 잔존 항목 + 이연 사유(다음 PR/이슈) 명시. 잔존 자체는 허용 (위 「stub 주석 해결 시 즉시 삭제」)
- 전체 리뷰 + 커밋 재정렬 완료 후, Lead가 사용자에게 결과 보고
  - 재정렬 후 커밋 목록 (base 기준)
  - 리뷰 결과 요약 (각 단계별 이슈 수 + 해결 내용)
  - **`it.todo` 커버리지 (전체 todo 수 / 구현된 it 수)**
  - 수정 사항 (있는 경우)
- 사용자가 직접 코드 확인
