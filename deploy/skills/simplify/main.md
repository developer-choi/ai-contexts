# 라이브러리 단순화 작업 프로세스

## Step 0. 다음 분석 대상 확인

작업 시작 전 확인한다.

1. SIMPLIFY_TARGET `docs/analysis-queue.md` 읽기
2. "다음 분석 목록"에서 대상을 고른다.
3. 선택한 대상과 같은 그룹인데 큐에 아직 없는 파일을 같은 그룹 아래에 추가한다.

**배치 처리**: 한 번에 **최대 10개 대상**을 연속 처리한다(1개씩 멈추지 않는다). 대상마다 이 문서의 Step 0~6을 이어서 적용한다.

**정지 조건** — 아래 중 하나면 멈추고 사용자에게 **종합 보고**한다:

- 배치 상한을 채웠다.
- 큐의 "다음 분석 목록"이 비었다. 비었으면 멈추기 전에 큐의 "제외 대상"을 다시 연다 — 그 판정은 정독 **전에** 내려진 것이라, 지금 근거가 유지되는지 확인하고 무너진 항목은 "다음 분석 목록"으로 되돌린다.
- 남은 대상이 **전부** "여기서 더 간소화하면 학습 목적에 부합하지 않는" 것들뿐이다. 이 판정도 AI가 내리고 근거를 보고에 적는다.

## Step 1. 계획서 작성

계획을 정리한 뒤 곧장 다음 단계로 진행한다(SKILL.md `제거 범위는 AI가 판단해 추천대로 진행한다`).

- 코드베이스를 탐색하고 아래 절차로 커밋 계획을 체계적으로 작성한다. 커밋 계획은 작업 메모이며 SIMPLIFY_TARGET에 파일로 남기지 않는다 — 확정된 판정 근거는 `*-simplified.md`에 들어간다.

**계획 작성 절차**
1. **기능·서브시스템 전수 나열** — 이 대상의 기능/하위 컴포넌트/서브시스템/prop 그룹을 빠짐없이 적는다(제거 후보 목록). 구조적/기계적 패턴(Scope, forwardRef, 합성 헬퍼 등)도 별도로 적는다.
2. **각 항목 제거/유지 판정** — SKILL.md 학습 범위 테스트(+delta-over-sibling)를 항목마다 적용해 제거/유지와 근거를 적는다.
   - 유지 판정: SIMPLIFY_SOURCE `common-keep-patterns.md`, SIMPLIFY_TARGET `instructions/keep-patterns.md` 대조
   - 삭제 패턴: SIMPLIFY_SOURCE `common-simplification-patterns.md`·SIMPLIFY_TARGET `instructions/simplification-patterns.md`는 **검증된 패턴의 체크리스트일 뿐 제거 범위의 상한이 아니다.** 이 대상 고유의 기능 제거 후보는 1.에서 새로 발굴한다.
3. **커밋 계획 작성** — 양식: `format/commit.md`. 기능 제거 커밋과 구조적 리팩터 커밋을 모두 포함한다. 기능 제거가 0건이면 1~2를 다시 검토한다(구조적 변환만 남는 계획은 예외적 결과다).

> 기능·서브시스템이 여럿이고 학습가치 판단이 모호한 복잡한 대상은 `plan.md`의 서브에이전트 분석 절차를 따른다.

**계획서의 커밋 번호와 실제 커밋 번호는 일치**한다. 여러 커밋을 합칠 수 있으나 계획서에 미리 명시한다.

## Step 2. 원본 문서 작성 (*-original.md)

단순화 커밋을 시작하기 전에 `*-original.md` 문서를 먼저 작성한다.
- **파일경로:** SIMPLIFY_TARGET `docs/[카테고리]/[대상명]-original.md`
- **양식:** `format/original.md`

**별도 커밋** (SKILL.md `작업 공통 규칙`): 원본 문서를 먼저 단독 커밋한 뒤 단순화 커밋을 시작한다.

## Step 3. 점진적 단순화 (커밋)

기능을 하나씩 삭제하고 매번 커밋한다.

## Step 4. 단순화 문서 작성 (*-simplified.md)

단순화 커밋을 마친 후 이어서 아래 문서를 작성한다.
- **파일경로:** SIMPLIFY_TARGET `docs/[카테고리]/[대상명]-simplified.md`
- **양식:** `format/simplified.md`

양식에는 없지만 사용자가 알아가면 좋을 내용이 있으면 문서 작성 시 함께 추가한다.

## Step 5. 프롬프트 유지보수

단순화 문서 커밋 후, 아래 체크리스트를 순회하며 업데이트 필요 여부를 확인한다. 이번 작업에서 발견한 새 패턴·변경사항을 각 문서에 반영한다.

- [ ] SIMPLIFY_SOURCE `common-keep-patterns.md` — 새로운 공통 유지 패턴 발견?
- [ ] SIMPLIFY_SOURCE `common-simplification-patterns.md` — 새로운 공통 삭제 패턴 발견?
- [ ] SIMPLIFY_TARGET `instructions/keep-patterns.md` — 라이브러리 특화 유지 패턴 추가/수정?
- [ ] SIMPLIFY_TARGET `instructions/simplification-patterns.md` — **여러 대상에서 반복되는** 삭제 패턴 추가/수정?

SIMPLIFY_SOURCE를 고쳤으면 커밋·sync하지 않는다. 멈춰서 사용자에게 보고할 때 고친 파일과 바꾼 내용을 함께 적는다. AC `deploy/` md 수정은 `/prompt-review`를 거쳐 들어가야 하기 때문이다.

## Step 6. 분석 목록 업데이트

분석 완료 후 목록을 갱신한다.

1. SIMPLIFY_TARGET `docs/analysis-queue.md` 열기
2. **완료 점검 — 대상을 `[x]`로 옮기기 전, 남은 코드에 학습 범위 테스트를 한 번 더 적용한다.**
   이번에 큰 서브시스템을 들어낸 결과로 새로 생긴 기능 단위 잔여가 없는지 확인한다:
   - 방금 제거로 **내부 호출자가 사라져 죽은 public API**
   - 동작을 통째로 갈아끼우는 **opt-in 콜백·토글**(예: `enabled`, `shouldAdjust...` 류)
   - 더는 도달하지 않는 **죽은 분기/옵션**
   - 잔여가 있으면 `[x]` 대신 큐의 "다음 분석 목록"에 **기능 단위 항목**으로 추가하고 후속 사이클로 처리한다.
3. 잔여가 없으면 완료한 대상을 체크한다
4. "완료" 섹션으로 이동하며 **패스 수준 라벨**(`[기계적]`/`[기능]`) 표기 — `format/analysis-queue.md` 규칙
5. 다음 작업할 그룹이 있으면 "다음 분석 목록"에 추가
