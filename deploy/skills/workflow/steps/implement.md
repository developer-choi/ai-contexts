---
step: implement
session: PR_{N}_IMPL
scope: per-pr
entry: >-
  PR_{N}_PLAN의 realize-plan 종료 + (페이지 코드 포함 PR이면) MARKUP의 해당 페이지 코드
  + (종류 COMPONENTS) MARKUP의 공통 컴포넌트 마크업 완료
model: Sonnet — stub에 `// TODO [AI_IMPL]` 한글 명세가 남아 있으면 Opus
next:
  - to: verify
---

# implement: 구현

> **이 단계의 목표: 팀을 spawn하고 PLAN이 세운 구현 계획대로 코드를 작성한다**

Lead(메인 세션)가 팀을 구성하고, Markup/Feature Implementer가 코드를 작성한다. 커밋마다 리뷰 파이프라인을 수행한다.

`/plan/pr{N}/`의 산출물(stub 코드 + 잔존 md)은 초안이다. 구현 시 계획을 비판적으로 검토하고, 더 나은 방법이 있거나 계획에 문제가 있으면 사용자에게 보고한다.

---

## 입력·산출물·작업 위치

- **입력**: realize-plan stub 커밋(`// TODO [AI_IMPL]:` 주석·`it.todo`) + `pr{N}/retained/implementation.md`·`pr{N}/persistent/reference.md` + MARKUP 페이지 코드(페이지 코드 포함 PR) + `pr{N}/retained/markup.md`(디자인 변경 시 갱신 대상)
- **산출물**: 코드 변경 + 커밋 (로직 stub 위에 본체 채움; 마크업은 MARKUP 완성본 import). stub 커밋부터 IMPL·리뷰 수정 커밋까지 정리하지 않고 쌓인 채로 verify에 넘긴다
- 구현 중 생긴 결정·plan 정정은 implementation.md·decisions.md에 적지 않는다 — decisions.md 반영은 [verify 「decisions.md 최신화」](verify.md#step-66-decisionsmd-최신화)에서 한 번에 한다
- **작업 위치**: PR_{N} 워크트리 (realize-plan이 만든 것). 본 PR 하나에 집중

---

## Step 5.0. 워크트리 진입

이전 단계에서 만든 워크트리에서 작업한다. 워크트리·브랜치를 새로 만들지 않는다.

- 워크트리에는 stub 커밋이 이미 base 위에 쌓여 있다
- 이 커밋 위에 구현 커밋을 쌓아나간다
- 모든 슬라이스 사이클 종료 후에도 stub 커밋부터 IMPL/리뷰 수정 커밋이 그대로 보존된 상태로 verify에 진입한다. 커밋 정리는 [verify 「커밋 정리 — 사용자 리뷰 전」](verify.md#step-625-커밋-정리--사용자-리뷰-전)에서 수행한다

세션이 워크트리 밖에서 시작했으면 `EnterWorktree`에 그 워크트리 경로를 줘 들어간다.

realize-plan에서 구현이 끝났으면 팀 spawn·구현(5.1, 5.2.1, 5.2.3)은 할 것이 없다고 판단하고 넘긴다. 5.3 리뷰 파이프라인은 건너뛰지 않는다 — realize-plan이 만든 커밋 범위(이 PR 브랜치의 base 이후 커밋)를 대상으로 Lead가 그대로 돌린다(5.2.2의 세팅 PR처럼 Feature Implementer만 spawn하지 않는다). 5.2.0 IMPL 시작 게이트와 5.4 마무리의 게이트도 그대로 돈 뒤 [verify](verify.md)로 간다.

---

## Step 5.1. 팀 Spawn

[team-agent](../../../contexts/team-agent.md)의 규칙을 따른다.

implement는 로직 전용이라(마크업은 MARKUP 완성본을 가져온다) 로직 구현자를 spawn한다. 리뷰는 Step 5.3에서 [impl-review-loop](../impl-review-loop/SKILL.md)가 맡는다 (로직은 오라클형이라 축 A Reviewer 미spawn).

```
Lead (메인 세션) — 사용자 소통 + 팀 spawn
└── Feature Implementer (sonnet) — 로직 구현 + 테스트 작성 + React.memo 등 성능 최적화
```

### Step 5.1.1. Spawn 시 컨텍스트 주입

Feature Implementer는 스스로 컨텍스트를 탐색하지 않는다. **Lead가 필요한 컨텍스트를 주입한다.** Lead는 `/plan/` 하위와 realize-plan stub 파일들을 탐색하여 산출물을 파악하고, 아래 기준에 따라 분류하여 전달한다.

Lead는 code-map 탐색으로 coding-standards rules·MP 패턴 문서를 골라 넘기지 않는다. `/plan/` 산출물과 workflow 문서가 경로로 짚은 문서는 그대로 넘긴다. 규칙 준수는 Step 5.3 리뷰가 맡는다 — 구현자까지 같은 문서 수십 개를 들면 컨텍스트가 두 벌로 든다.

| 에이전트 | Lead가 주입하는 컨텍스트 |
|----------|--------------------------|
| Feature Implementer | hook·페이지 stub 파일들 (`// TODO [AI_IMPL]:` 주석으로 채울 항목 포함), 참조할 기존 코드 경로, `pr{N}/persistent/reference.md`, `pr{N}/retained/implementation.md`의 gotcha·근거 (커밋 분할은 Lead 몫이라 제외), Step 5.2.2의 코드블록 재배치 룰 |

---

## Step 5.2. 구현 중 공통 룰

### Step 5.2.0. IMPL 시작 게이트 — TODO 잔존 검사

implement 진입 직후 본 PR 영역에서 [IMPL 시작 게이트](../conventions/artifact/comments.md#impl-시작-게이트-구현-진입-시)를 실행한다. realize-plan에서 사용자가 미검토한 항목이 있으면 IMPL 진입 불가. `pr{N}/persistent/overview.md`의 `## TODO`도 읽는다 — plan 뒤에 다른 PR이 이 PR 몫으로 넣은 항목이 거기 있다.

### Step 5.2.1. TODO 주석 처리

IMPL 중 만나는 TODO 마커는 [처리](../conventions/artifact/comments.md#처리-구현-중) 룰을 따른다. 마커 종류별 처리(즉시 삭제·사용자 보고·블록 삭제)와 PR 이연 마커 코드 안 금지 룰은 컨벤션이 단일 출처.

### Step 5.2.2. gotchas

- **프로젝트 세팅 PR** — 린트, 포맷터 등 설정만 다루는 PR은 팀 spawn 없이 Lead가 직접 구현한다. 도구별로 (설치+설정 → 커밋 → 위반 수정 → 커밋) 사이클을 반복한다. lint-staged는 해당 시점에 설치된 도구만 참조한다. **"팀 spawn 없음"은 Feature Implementer를 spawn하지 않는다는 의미다. Step 5.3 리뷰 파이프라인은 여전히 실행한다.**
- **커밋 분할 기준선: PLAN 계획** — `pr{N}/retained/implementation.md`의 `### N` 항목이 커밋 분할의 출발점이다. 아래 커밋 분리 룰들은 그 계획을 대체하지 않고, 계획에 없던 작업이 생겼을 때 그것을 어디에 넣을지 판단한다.
- **커밋 분리 디폴트: 마크업 / 그 외** — MARKUP에서 가져온 마크업 코드(JSX·SCSS)와 본 step의 로직 산출(로직·테스트·hook·설정)은 다른 커밋으로 분리한다. 더 세분화는 아래 「독립 설명 테스트」가 판단.
- **커밋 분리 판단: 독립 설명 테스트** — 구현 중 계획에 없던 작업이 발생하면, "이 변경을 현재 작업 대상 없이도 독립적으로 설명할 수 있는가?"를 묻는다. 독립 설명이 가능하면 별도 커밋, 불가능하면 현재 커밋에 포함한다.
- 새 파일/모듈을 만들기 전에 프로젝트에 같은 역할의 코드가 이미 있는지 확인한다. 기존 API, 타입, 컴포넌트를 재사용할 수 있으면 새로 만들지 않는다.
- 이미 있는 코드블록을 옮기거나 쪼개는 편집(컴포넌트 추출, 코드블록 분리, 공용 위치로 승격)은 경계를 정하는 것도 옮기는 것도 사용자가 한다. AI는 옮겨진 코드에 이름 후보를 낸다. 새 코드를 처음 쓰면서 나누는 것은 해당하지 않는다.
- realize-plan이 커밋한 외부 공개 시그니처는 바꾸지 않는다 — 의존 PR이 그 커밋을 딛는다. 바꿔야 하면 사용자에게 영향을 알리고 정한다.

### Step 5.2.3. IMPL 중 디자인·기획 변경 감지

IMPL 진행 중 디자인 또는 기획이 바뀐 사실을 감지하면(사용자 통보 또는 figma·요구사항 원본 갱신), 캐시된 산출물(stub·it.todo, 마크업의 figma 자료)을 그대로 두고 진행하지 않는다.

- **디자인 변경** — 마크업의 진실 원천이 바뀐 것이다. 그 모드의 시각 원본([modes.md](../conventions/modes.md) 매트릭스) 변경분을 재수령하고 — figma를 쓰는 모드면 [피그마 URL·캡처 캐싱](../conventions/plan-folder.md#피그마-url캡처-캐싱) 절차로 — 해당 컴포넌트를 MARKUP에서 재검증한 뒤 본 PR로 다시 가져온다. `markup.md`를 쓰는 모드는 본 PR의 `markup.md`(사용자 시각 대조용)도 새 원본으로 갱신한다(figma 없는 모드는 `markup.md`가 없어 이 단계 없음).
- **기획 변경** — 계획(요구사항·명세)이 바뀐 것이다. 즉시 사용자에게 보고하고 변경 범위를 함께 확정한다. AI 단독으로 stub·it.todo를 뒤집지 않는다. 범위가 it.todo·외부 공개 시그니처·PR 경계에 미치면 해당 단계 재진입이 필요할 수 있다.

---

## Step 5.3. 리뷰 파이프라인

구현·리뷰는 [impl-review-loop](../impl-review-loop/SKILL.md) 엔진을 호출해 0건까지 수렴시킨다. Lead는 아래 인자를 주입한다 (재료·팀 컨텍스트는 Step 5.1·5.1.1 참조). 두 축의 순서·병렬은 엔진이 A 메커니즘으로 정하므로 호출자가 지시하지 않는다.

> **엔진 호출 전 우회 게이트.** 엔진을 건너뛰기 전에 [impl-review-loop의 우회](../impl-review-loop/SKILL.md#우회-호출자의-사전-점검--입력-아님) 절의 두 조건을 **기계 판정**한다. 두 조건의 판정 근거(어느 진실원천 아티팩트가 선언/부재인지, 어느 자동 검사 도구 스코프로 변경 파일 전부가 매칭되는지)를 명시한다. 둘 다 참이면 엔진 대신 [code-review](../../code-review/SKILL.md)를 advanced 모드로 호출한다. 하나라도 거짓이면 엔진을 호출한다. 판정 없이 또는 주관 판단("간단해 보임")으로 엔진을 건너뛰지 않는다.

| 구현자 | 진실검사 A (메커니즘) | 규칙검사 B | 증분 단위 |
|---|---|---|---|
| Feature Implementer | 테스트 실행 green + `it.todo` 커버리지. 오라클형(실행이 곧 판정). 종료 커버리지는 [`it.todo` 매칭 게이트](../conventions/artifact/implementation-spec.md#ittodo-매칭-게이트) | 추가 컨벤션 `pr{N}/persistent/reference.md`, Advanced Reviewer 참고 자료: stub `*.test.tsx`의 `it.todo` | 로직 커밋 |

### Step 5.3.1. 슬라이스 사이클 종료

해당 슬라이스의 리뷰 파이프라인이 0건으로 통과하면 그 슬라이스 사이클은 종료한다. **이 시점에는 squash하지 않는다.** 다음 슬라이스의 구현 커밋을 직전 리뷰 수정 커밋들 위에 이어 쌓는다.

---

## Step 5.4. 마무리

- [IMPL 종료 시점](../conventions/artifact/implementation-spec.md#impl-종료-시점--남은-ittodo) 적용
- **TODO 잔존 점검** — [종료 게이트](../conventions/artifact/comments.md#종료-게이트-구현-마무리) 실행. 인라인 마커·상단 출처 블록·기타 `// TODO:` 형태 모두 0건 필수. 잔존 시 종료 불가
- Lead가 사용자에게 결과 보고
  - 커밋 목록 (stub + IMPL + 리뷰 수정 그대로)
  - 리뷰 결과 요약 (각 단계별 이슈 수 + 해결 내용)
  - **작성한 `it` 수 / stub의 `it.todo` 수** — `it.todo`를 바꾸지 않고 지워도 게이트는 통과하므로 두 수를 나란히 보인다
  - 수정 사항 (있는 경우)
- 사용자가 verify에서 코드 리뷰 수행

> 이 보고가 끝나도 PR_{N}_IMPL 세션은 종료되지 않는다. 즉시 [최종 점검 단계](verify.md)에 진입한다. (implement는 세션 경계가 아니며 후속 안내는 verify에서 낸다.)
