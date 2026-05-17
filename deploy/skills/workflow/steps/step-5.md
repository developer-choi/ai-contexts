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

step-5 진입 시 아래 팀을 spawn한다.

```
Lead (메인 세션) — 사용자 소통 + 팀 spawn + Coding-Standards 리뷰 종합
├── Markup Implementer (sonnet) — 마크업 전용 (CSS, 최소한의 컴포넌트 props). 로직·테스트 작성 안 함
├── Feature Implementer (sonnet) — 로직 구현 + 테스트 작성 + React.memo 등 성능 최적화
├── Figma Reviewer (sonnet) — 피그마 토큰 대조 (Markup Implementer 커밋에서만)
├── Coding-Standards Reviewer ×N (sonnet) — 컨벤션 기계적 대조
└── Advanced Reviewer (opus) — coding standard 판단 + 자유 리뷰
```

### Step 5.1.1. Spawn 시 컨텍스트 주입

에이전트는 스스로 컨텍스트를 탐색하지 않는다. **Lead가 필요한 컨텍스트를 주입한다.** Lead는 `/plan/` 하위와 step-4 stub 파일들을 탐색하여 산출물을 파악하고, 아래 기준에 따라 분류하여 각 에이전트에게 전달한다.

| 에이전트 | Lead가 주입하는 컨텍스트 |
|----------|--------------------------|
| Markup Implementer | stub `.tsx`의 JSX 부분 + `.module.scss` stub + `pr{N}/retained/markup.md`(있으면), 매칭표, 디자인시스템 소스, 기존 mixin/레이아웃 패턴, `pr{N}/persistent/reference.md`, AC coding-standards/map.md + MP best-practices-map.md 중 마크업 관련 rules |
| Feature Implementer | hook·페이지 stub 파일들 (`// TODO [AI_IMPL]:` 주석으로 채울 항목 포함), 참조할 기존 코드 경로, `pr{N}/persistent/reference.md`, AC coding-standards/map.md + MP best-practices-map.md 중 로직 관련 rules |
| Figma Reviewer | `pr{N}/retained/markup.md` 「Figma 원본 링크 인덱스」 절 (figma 원본 직접 fetch 기준). 매칭표는 컨텍스트 보조이며 검증 기준 아님 |
| Coding-Standards Reviewer ×N | 담당 컨벤션 문서, 리뷰 관점 지시 (해당 컨벤션 위반만 집중), `pr{N}/persistent/reference.md` (회사·프로젝트 고유 컨벤션 — 리뷰어 자체 컨벤션 외 추가 검증 기준) |
| Advanced Reviewer | [code-review](../../code-review/SKILL.md) 절차, coding standards, `pr{N}/persistent/reference.md`, stub `*.test.tsx`의 `it.todo` |

리뷰어는 [code-review](../../code-review/SKILL.md)의 절차를 따른다.

### Step 5.1.2. 매칭표 생성 (실무 프로젝트만)

실무 프로젝트 + 피그마 MCP 연결인 경우, Markup Implementer spawn 전에 [figma-component-mapping/guide.md](../figma-component-mapping/guide.md)에 따라 매칭표를 생성하고 컨텍스트에 포함한다.

### Step 5.1.3. Markup Implementer 필수 지침

Markup Implementer spawn 시 컨텍스트와 함께 반드시 전달:

1. **"피그마 참조 코드의 CSS 토큰을 매칭표와 대조하라"** — 스크린샷 보고 감으로 작성 금지
2. **"하드코딩 금지, 토큰만 사용"** — `16px` 대신 `var(--semantic-padding-lg)`
3. **구현 후 피그마 자동 대조** — 피그마 다시 fetch해서 토큰/레이아웃/props 비교

### Step 5.1.4. Coding-Standards Reviewer 분할

Lead가 AC [coding-standards/map.md](../../../contexts/coding-standards/map.md) + MP `docs/best-practices-map.md` + 프로젝트별 컨벤션에서 이번 PR 범위에 해당하는 규칙을 선별하고, 주제별로 N개 reviewer를 spawn한다.

- 분할 단위는 Lead 재량

---

## Step 5.2. 구현 중 공통 룰

### Step 5.0. IMPL 시작 게이트 — `TODO [USER_REVIEW]` 잔존 검사

step-5 진입 직후 본 PR 영역에서 `TODO [USER_REVIEW]` 잔존을 검사한다. step-4에서 사용자가 미검토한 항목이 있으면 IMPL 진입 불가.

```bash
grep -rn "TODO \[USER_REVIEW\]" _fsd/<slice>/ src/<scope>/
```

- 0건 → IMPL 진행 (사용자 검토 완료)
- 1건 이상 → **IMPL 중단**, 잔존 라인을 사용자에게 출력 + "이 항목들 검토 후 `TODO [USER_REVIEW]` 마커를 제거해주세요" 안내

상단 블록(`/* TODO [USER_REVIEW] [Convention] [Reference] */`)도 같은 검사 대상. 사용자가 컨벤션·참조 정합 검토 후 블록 자체 삭제 또는 마커만 제거.

### Step 5.2.1. TODO 주석 해결 시 즉시 삭제

step-4 룰(「본문 주석은 `TODO [USER_REVIEW]` / `TODO [AI_IMPL]` 마커 분리 필수」)에 따라 step-5는 두 종류 TODO를 처리한다:

| 마커 | 처리 방식 |
|---|---|
| `// TODO [USER_REVIEW]:` 잔존 | Step 5.0 게이트에서 차단되므로 IMPL 진행 중 만나면 안 됨. 만나면 즉시 사용자에게 보고 |
| `// TODO [AI_IMPL]:` | step-5에서 코드로 채우며 즉시 삭제 |
| `/* TODO [USER_REVIEW] [Convention] [Reference] */` 상단 블록 | 출처 확인 끝났으면 블록 전체 삭제 |

원칙:

- `TODO [AI_IMPL]` 주석 1건을 해결한 커밋에서 같은 커밋 안에 주석도 함께 삭제 (별도 정리 커밋 만들지 않음)
- 해결 안 된 `TODO [AI_IMPL]`을 남긴 채 step-5 종료하지 않음 — 미해결은 IMPL 종료 보고에 포함하여 사용자 검토
- 파일 최상단의 `/* TODO [USER_REVIEW] [Convention] [Reference] */` 블록도 출처 확인 완료 후 삭제 (IMPL 완료 시 모든 `TODO` 마커는 본문 주석과 상단 블록 모두 0건)
- **코드 안 TODO는 PR 이연 항목 포함 불가** — PR 이연은 `/plan/background/consumable/project.md`의 해당 PR 섹션에, 본 PR 외부 의존성은 `plan/{prN}/consumable/overview.md` 「열려있는 질문」 절에 적는다. step-5에서 PR 이연을 코드 안에 박지 않는다

### Step 5.2.2. gotchas

- **프로젝트 세팅 PR** — 린트, 포맷터 등 설정만 추가하는 PR은 팀 spawn 없이 Lead가 직접 구현한다. 도구별로 (설치+설정 → 커밋 → 위반 수정 → 커밋) 사이클을 반복한다. 설정을 몰아서 커밋하고 수정을 나중에 하면 안 된다 — 리뷰어가 도구별 영향을 diff로 확인할 수 있어야 한다. lint-staged는 해당 시점에 설치된 도구만 참조한다.
- **커밋 분리 판단: 독립 설명 테스트** — 구현 중 계획에 없던 작업이 발생하면, "이 변경을 현재 작업 대상 없이도 독립적으로 설명할 수 있는가?"를 묻는다. 독립 설명이 가능하면(예: vitest 세팅 — "테스트 인프라 구축") 별도 커밋. 불가능하면(예: 이 컴포넌트 전용 토큰 — 컴포넌트 없이 의미 없음) 현재 커밋에 포함한다.
- **디자인시스템 컴포넌트 PR이면** [../commit-strategy/design-system.md](../commit-strategy/design-system.md) 의 분할 순서를 따른다.
- 새 파일/모듈을 만들기 전에 프로젝트에 같은 역할의 코드가 이미 있는지 확인한다. 기존 API, 타입, 컴포넌트를 재사용할 수 있으면 새로 만들지 않는다.

---

## Step 5.3. 리뷰 파이프라인

커밋마다 아래 파이프라인을 수행한다. **Coding-Standards ×N과 Advanced Reviewer는 병렬 실행.**

### Step 5.3.1. Markup Implementer 파이프라인 (2단계)

```
1. Figma Reviewer ↔ Markup Implementer (직접 루프, 0건까지)
       ↓
2. Coding-Standards Reviewer ×N + Advanced Reviewer (전부 병렬) → Lead 종합 → Markup Implementer → 반복 (0건까지)
```

### Step 5.3.2. Feature Implementer 파이프라인 (1단계)

```
Coding-Standards Reviewer ×N + Advanced Reviewer (전부 병렬) → Lead 종합 → Feature Implementer → 반복 (0건까지)
```

### Step 5.3.3. Figma Reviewer (Markup Implementer 커밋만)

- Figma Reviewer ↔ Markup Implementer SendMessage로 직접 루프
- Lead 개입 없음
- 0건이면 Lead에게 보고

**검증 기준은 figma 원본**: `pr{N}/retained/markup.md` 「Figma 원본 링크 인덱스」 절의 URL로 figma 원본을 직접 fetch해 코드와 대조한다. markup.md의 토큰 매핑표·매칭표는 Implementer 캐시 보조이며 **검증 기준이 아니다** — AI 산출물을 검증 기준으로 쓰면 Implementer가 추출 시 누락한 항목을 Reviewer도 못 잡는 자기증명 루프가 된다.

### Step 5.3.4. Coding-Standards Reviewer ×N + Advanced Reviewer (병렬)

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

### Step 5.3.5. 슬라이스 사이클 종료

해당 슬라이스의 리뷰 파이프라인이 0건으로 통과하면 그 슬라이스 사이클은 종료한다. **이 시점에는 squash하지 않는다.** 다음 슬라이스의 구현 커밋을 직전 리뷰 수정 커밋들 위에 이어 쌓고, 모든 슬라이스가 끝난 뒤 Step 5.4에서 커밋을 일괄 정리한다.

```
stub | a | a-1 | a-2 | b | b-1 | c | c-1 | c-2 | d ...
                                                  ↑ 종료 직전에 일괄 squash + 재정렬
```

사유: stub이 빈 껍데기인 정상 케이스에서는 슬라이스별 즉시 squash + 마지막 rebase로 stub 제거가 깔끔하지만, stub이 본문을 안고 있는 케이스(step-4 단계에서 사용자가 검토 후 본문까지 채운 경우)에서는 stub의 본문이 어느 IMPL 커밋에 흡수될지를 모든 슬라이스 사이클이 끝나야 일관되게 분할 가능. 두 케이스를 한 흐름으로 통합하기 위해 일괄 정리 채택. 단, 정리 시점은 step-5 안이 아니라 step-6의 AI 리뷰 + 사용자 리뷰 완료 후 — 사용자가 stub→IMPL diff를 리뷰할 수 있어야 함.

---

## Step 5.4. 마무리

- **stub `*.test.tsx`의 `it.todo` 자연어와 실제 작성된 `it(...)` 케이스를 대조**한다 (대조 절차는 SKILL.md 「자가 검토 필수」 일반 규칙). 누락된 todo가 있으면 사용자에게 보고한다
- **`TODO` 주석 잔존 점검** — 본 PR 영역에서 `grep -rn "TODO" _fsd/<slice>/ src/<scope>/`로 0건 확인. `TODO [USER_REVIEW]`와 `TODO [AI_IMPL]` 둘 다 0건이어야 종료 가능 (위 「Step 5.2.1. TODO 주석 해결 시 즉시 삭제」). 잔존하면 종료 안 됨
- **stub 상단 `/* [stub] [Convention] [Reference] */` 블록 잔존 점검** — 0건 필수 (위 「Step 5.2.1. stub 주석 해결 시 즉시 삭제」). 잔존하면 종료 안 됨
- **`// TODO:` 주석 잔존 보고** — 잔존 항목 + 이연 사유(다음 PR/이슈) 명시. 잔존 자체는 허용 (위 「Step 5.2.1. stub 주석 해결 시 즉시 삭제」)
- 전체 리뷰 완료 후, stub 커밋부터 IMPL/리뷰 수정 커밋이 그대로 보존된 상태로 step-6에 진입한다. 커밋 정리·재정렬은 step-6 「Step 6.5. 커밋 정리·재정렬」에서 AI 리뷰 + 사용자 리뷰 완료 후 일괄 수행
- Lead가 사용자에게 결과 보고
  - 커밋 목록 (stub + IMPL + 리뷰 수정 그대로)
  - 리뷰 결과 요약 (각 단계별 이슈 수 + 해결 내용)
  - **`it.todo` 커버리지 (전체 todo 수 / 구현된 it 수)**
  - 수정 사항 (있는 경우)
  - **다음 PR 진입 가능 안내** — 현 PR이 마지막이 아니면 (`/plan/` 하위에 더 높은 번호 `pr{N+1}` 디렉토리가 존재) 다음 PR의 step-3 진입 가능을 사용자에게 안내. 이유: step-5 종료 = 외부 공개 모듈 시그니처 확정 시점 → 후속 PR이 본 PR의 인터페이스에 의존 시작 가능. 단, step-6 사용자 리뷰에서 시그니처 변경이 발생하면 후속 PR도 영향 (task 10 stub 룰 준수 시 드물어야 함 — 발생 시 후속 PR에 즉시 보고)
- 사용자가 step-6에서 코드 리뷰 수행 (커밋 정리 전이라 stub→IMPL diff 추적 가능)
