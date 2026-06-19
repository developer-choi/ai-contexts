# Step 5: 구현

> **이 단계의 목표: 팀을 spawn하고 구현 방침에 따라 코드를 작성한다**

Lead(메인 세션)가 팀을 구성하고, Markup/Feature Implementer가 코드를 작성한다. 커밋마다 리뷰 파이프라인을 수행한다.

`/plan/pr{N}/`의 산출물(stub 코드 + 잔존 md)은 초안이다. 구현 시 계획을 비판적으로 검토하고, 더 나은 방법이 있거나 계획에 문제가 있으면 사용자에게 보고한다.

---

## Step 5.0. 워크트리 진입

이전 단계에서 만든 워크트리에서 작업한다. 워크트리·브랜치를 새로 만들지 않는다.

- 워크트리에는 stub 커밋이 이미 base 위에 쌓여 있다
- 이 커밋 위에 구현 커밋을 쌓아나간다
- 모든 슬라이스 사이클 종료 후에도 stub 커밋부터 IMPL/리뷰 수정 커밋이 그대로 보존된 상태로 step-6에 진입한다. 커밋 정리·재정렬은 step-6 「Step 6.5. 커밋 정리·재정렬」에서 **AI 리뷰 + 사용자 리뷰 완료 후** 수행한다 (사용자가 stub→IMPL 변환 diff를 리뷰할 수 있어야 하므로)

메인 세션이 직접 cwd를 옮길 수 없으면 사용자에게 워크트리 디렉토리에서 새 세션을 띄워 이어가도록 안내한다.

---

## Step 5.1. 팀 Spawn

[CRITICAL] [team-agent](../../../contexts/team-agent.md)의 규칙을 따른다.

step-5는 로직 구현자와 리뷰어로 팀을 구성한다 — 마크업은 MARKUP 세션에서 디자인 진실 원천 0건으로 검증 완료된 코드(채용·실무 figma 대조 / 개인 사용자 시각 확인)를 가져오므로 본 step은 로직 전용이다. 리뷰어 구성은 Step 5.3에서 [impl-review-loop](../impl-review-loop/SKILL.md)를 호출할 때 A 메커니즘이 결정한다 (로직은 오라클형이라 축 A Reviewer 미spawn).

```
Lead (메인 세션) — 사용자 소통 + 팀 spawn + Coding-Standards 리뷰 종합
├── Feature Implementer (sonnet) — 로직 구현 + 테스트 작성 + React.memo 등 성능 최적화
├── Coding-Standards Reviewer ×N (sonnet) — 컨벤션 기계적 대조
└── Advanced Reviewer (opus) — coding standard 판단 + 자유 리뷰
```

### Step 5.1.1. Spawn 시 컨텍스트 주입

에이전트는 스스로 컨텍스트를 탐색하지 않는다. **Lead가 필요한 컨텍스트를 주입한다.** Lead는 `/plan/` 하위와 step-4 stub 파일들을 탐색하여 산출물을 파악하고, 아래 기준에 따라 분류하여 각 에이전트에게 전달한다.

| 에이전트 | Lead가 주입하는 컨텍스트 |
|----------|--------------------------|
| Feature Implementer | hook·페이지 stub 파일들 (`// TODO [AI_IMPL]:` 주석으로 채울 항목 포함), 참조할 기존 코드 경로, `pr{N}/persistent/reference.md`, AC coding-standards/map.md + MP best-practices-map.md 중 로직 관련 rules |
| Coding-Standards Reviewer ×N | 담당 컨벤션 문서, 리뷰 관점 지시 (해당 컨벤션 위반만 집중), `pr{N}/persistent/reference.md` (회사·프로젝트 고유 컨벤션 — 리뷰어 자체 컨벤션 외 추가 검증 기준) |
| Advanced Reviewer | [code-review](../../code-review/SKILL.md) 절차, coding standards, `pr{N}/persistent/reference.md`, stub `*.test.tsx`의 `it.todo` |

리뷰어는 [code-review](../../code-review/SKILL.md)의 절차를 따른다.

### Step 5.1.2. Coding-Standards Reviewer 분할

Lead가 AC [coding-standards/map.md](../../../contexts/coding-standards/map.md) + MP `docs/best-practices-map.md` + 프로젝트별 컨벤션에서 이번 PR 범위에 해당하는 규칙을 선별하고, 주제별로 N개 reviewer를 spawn한다.

- 분할 단위는 Lead 재량

---

## Step 5.2. 구현 중 공통 룰

### Step 5.2.0. IMPL 시작 게이트 — TODO 잔존 검사

step-5 진입 직후 본 PR 영역에서 [conventions/artifact/comments.md](../conventions/artifact/comments.md) 「라이프사이클 > IMPL 시작 게이트」를 실행한다. step-4에서 사용자가 미검토한 항목이 있으면 IMPL 진입 불가.

### Step 5.2.1. TODO 주석 처리

IMPL 중 만나는 TODO 마커는 [conventions/artifact/comments.md](../conventions/artifact/comments.md) 「라이프사이클 > 처리 시점」 룰을 따른다. 마커 종류별 처리(즉시 삭제·사용자 보고·블록 삭제)와 PR 이연 마커 코드 안 금지 룰은 컨벤션이 단일 출처.

### Step 5.2.2. gotchas

- **프로젝트 세팅 PR** — 린트, 포맷터 등 설정만 추가하는 PR은 팀 spawn 없이 Lead가 직접 구현한다. 도구별로 (설치+설정 → 커밋 → 위반 수정 → 커밋) 사이클을 반복한다. 설정을 몰아서 커밋하고 수정을 나중에 하면 안 된다 — 리뷰어가 도구별 영향을 diff로 확인할 수 있어야 한다. lint-staged는 해당 시점에 설치된 도구만 참조한다. **"팀 spawn 없음"은 Feature Implementer를 spawn하지 않는다는 의미다. Step 5.3 리뷰 파이프라인(Coding-Standards Reviewer + Advanced Reviewer)은 여전히 실행한다.**
- **커밋 분리 디폴트: 마크업 / 그 외** — MARKUP에서 가져온 마크업 코드(JSX·SCSS)와 본 step의 로직 산출(로직·테스트·hook·설정)은 다른 커밋으로 분리한다. 한 커밋에 섞이면 step-6 사용자 리뷰 시 diff 가독성이 급락. 더 세분화는 아래 「독립 설명 테스트」가 판단.
- **커밋 분리 판단: 독립 설명 테스트** — 구현 중 계획에 없던 작업이 발생하면, "이 변경을 현재 작업 대상 없이도 독립적으로 설명할 수 있는가?"를 묻는다. 독립 설명이 가능하면(예: vitest 세팅 — "테스트 인프라 구축") 별도 커밋. 불가능하면(예: 이 컴포넌트 전용 토큰 — 컴포넌트 없이 의미 없음) 현재 커밋에 포함한다.
- **디자인시스템 컴포넌트 PR이면** [../conventions/commit-strategy-design-system.md](../conventions/commit-strategy-design-system.md) 의 분할 순서를 따른다.
- 새 파일/모듈을 만들기 전에 프로젝트에 같은 역할의 코드가 이미 있는지 확인한다. 기존 API, 타입, 컴포넌트를 재사용할 수 있으면 새로 만들지 않는다.

### Step 5.2.3. IMPL 중 디자인·기획 변경 감지

IMPL 진행 중 디자인 또는 기획이 바뀐 사실을 감지하면(사용자 통보 또는 figma·요구사항 원본 갱신), 캐시된 산출물(stub·it.todo, 마크업의 figma 자료)을 그대로 두고 진행하지 않는다. 변경분을 명시 처리하지 않으면 이후 GAP Analysis·검증 라운드에서도 잡히지 않는다.

- **디자인 변경** — 마크업의 진실 원천이 바뀐 것이다. (채용·실무) 변경된 단위의 figma 자료를 [conventions/plan-folder.md](../conventions/plan-folder.md) 「피그마 URL·캡처 캐싱」 절차로 재수령하고, 마크업은 MARKUP 세션이 figma 원본 기준으로 담당하므로 해당 컴포넌트를 MARKUP에서 재검증한 뒤 본 PR로 다시 가져온다. 본 PR의 `markup.md`(사용자 시각 대조용)도 새 URL로 갱신한다. (**개인 모드**) figma가 없으니 사용자와 디자인을 다시 정의하고, MARKUP에서 사용자 시각 확인으로 재검증한 뒤 가져온다 — markup.md 갱신 단계는 없다.
- **기획 변경** — 계획(요구사항·명세)이 바뀐 것이다. 즉시 사용자에게 보고하고 변경 범위를 함께 확정한다(이 step 서두의 "계획에 문제가 있으면 보고" 원칙). AI 단독으로 stub·it.todo를 뒤집지 않는다 — SKILL.md 「입력 산출물 비판적 검토」의 결정 위임 형태. 범위가 it.todo·외부 공개 시그니처·PR 경계에 미치면 해당 단계 재진입이 필요할 수 있다.

---

## Step 5.3. 리뷰 파이프라인

구현·리뷰는 [impl-review-loop](../impl-review-loop/SKILL.md) 엔진을 호출해 0건까지 수렴시킨다. Lead는 아래 인자를 주입한다 (재료·팀 컨텍스트는 Step 5.1·5.1.1 참조). 두 축의 순서·병렬은 엔진이 A 메커니즘으로 정하므로 호출자가 지시하지 않는다.

| 구현자 | 진실검사 A (메커니즘) | 규칙검사 B | 증분 단위 |
|---|---|---|---|
| Feature Implementer | 테스트 실행 green + `it.todo` 커버리지. 오라클형(실행이 곧 판정). 종료 커버리지는 [implementation-spec.md](../conventions/artifact/implementation-spec.md) 「`it.todo` 매칭 게이트」 | Coding-Standards ×N + Advanced (로직 rules, Step 5.1.2 분할) | 로직 커밋 |

### Step 5.3.1. 슬라이스 사이클 종료

해당 슬라이스의 리뷰 파이프라인이 0건으로 통과하면 그 슬라이스 사이클은 종료한다. **이 시점에는 squash하지 않는다.** 다음 슬라이스의 구현 커밋을 직전 리뷰 수정 커밋들 위에 이어 쌓고, 모든 슬라이스가 끝난 뒤 Step 5.4에서 커밋을 일괄 정리한다.

```
stub | a | a-1 | a-2 | b | b-1 | c | c-1 | c-2 | d ...
                                                  ↑ 종료 직전에 일괄 squash + 재정렬
```

정리 시점은 step-5 안이 아니라 step-6 사용자 리뷰 완료 후 (stub→IMPL diff 리뷰 가능해야 함). 케이스 분기 사유·절차는 [conventions/artifact/stub.md](../conventions/artifact/stub.md) 「라이프사이클 > 정리」 참조.

---

## Step 5 종료 — 분기점

step-5는 PR_{N}_IMPL 세션의 **마지막 구현 step**. step 5.4 종료 후 step 6(최종 점검)이 이어진다 — step 5.4 보고 완료 ≠ 세션 종료.

step-5.4 「Lead가 사용자에게 결과 보고」 출력 직후, 아래 두 안내를 **즉시** 출력한다 (step 6 완료 후로 미루지 않는다):

1. SKILL.md 「세션 spawn 안내 메커니즘」 절차를 발동하여 후속 spawn 안내(**PR_{N}_WRITING**) 출력.
2. 「다음 PR 진입 가능 안내」(PR_{N+1}_PLAN — PR 도미노) 출력.

두 안내는 별개로 출력한다. 후자는 PR 분할 도미노 안내이지 본 세션의 후속 spawn이 아니다.

---

## Step 5.4. 마무리

- [conventions/artifact/implementation-spec.md](../conventions/artifact/implementation-spec.md) 「`it.todo` 매칭 게이트 > IMPL 종료 시점」 적용 (대조 절차는 SKILL.md 「자가 검토 필수」 일반 규칙)
- **TODO 잔존 점검** — [conventions/artifact/comments.md](../conventions/artifact/comments.md) 「라이프사이클 > 종료 게이트」 실행. 인라인 마커·상단 블록·기타 `// TODO:` 형태 모두 0건 필수. 잔존 시 종료 불가 (코드 안 TODO 일관 0건 — PR 이연·외부 의존성은 `project.md`·`overview.md`로 관리)
- 전체 리뷰 완료 후 step-6에 진입 (커밋 보존 정책은 위 Step 5.0 참조)
- Lead가 사용자에게 결과 보고
  - 커밋 목록 (stub + IMPL + 리뷰 수정 그대로)
  - 리뷰 결과 요약 (각 단계별 이슈 수 + 해결 내용)
  - **`it.todo` 커버리지 (전체 todo 수 / 구현된 it 수)**
  - 수정 사항 (있는 경우)
  - **다음 PR 진입 가능 안내** — 현 PR이 마지막인지 먼저 `/plan/background/consumable/project.md`(PR 분할·이연 인덱스)를 읽어 전체 PR 분할 목록을 확인하고 판단한다. `pr{N+1}` 디렉토리 존재 여부는 보조 신호로만 본다 — 폴더가 아직 없어도 `project.md`에 PR{N+1}+ 분할이 정의돼 있으면 마지막이 아니다. 마지막이 아니면 다음 PR의 step-3 진입 가능을 사용자에게 안내. 이유: step-5 종료 = 외부 공개 모듈 시그니처 확정 시점 → 후속 PR이 본 PR의 인터페이스에 의존 시작 가능. 단, step-6 사용자 리뷰에서 시그니처 변경이 발생하면 후속 PR도 영향 (task 10 stub 룰 준수 시 드물어야 함 — 발생 시 후속 PR에 즉시 보고)
- 사용자가 step-6에서 코드 리뷰 수행 (커밋 정리 전이라 stub→IMPL diff 추적 가능)

> [CRITICAL] 이 보고가 끝나도 PR_{N}_IMPL 세션은 종료되지 않는다. 즉시 Step 6(최종 점검)에 진입한다.
