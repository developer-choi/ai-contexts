---
step: verify
session: PR_{N}_IMPL
next:
  - to: pr-body-final
  - to: finalize
    when: 마지막 IMPL
  - to: markup
    when: 종류 FOUNDATION
---

# verify: 최종 점검

모든 기능 구현 및 커밋 완료 후, **PR 생성 직전** 코드 품질을 최종 점검하는 단계입니다.

---

## 입력·산출물·작업 위치

- **입력**: implement가 쌓은 커밋(stub + IMPL + 리뷰 수정) + `pr{N}/persistent/implementation.md`(Gap Analysis 계획)·`reference.md`·`decisions.md` + `background/consumable/todo.md`·`pr*/persistent/overview.md` 「TODO」(주석 게이트) + `pr{N}/retained/markup.md`(UI 컴포넌트 PR)
- **산출물**: `pr{N}/consumable/`: review.md, user-test-cases.md / `pr{N}/persistent/decisions.md` 갱신 / 1회차 정리·재정렬된 커밋 + force-push 요청
- **작업 위치**: PR_{N} 워크트리. 본 PR 하나에 집중

---

## Step 6.1. Gap Analysis (계획 ↔ 실제 차이 검사)

`pr{N}/persistent/implementation.md`의 `### N.` 계획 커밋 항목 목록과 실제 `git log`를 대조하여 차이를 식별한다.

대조 기준:

- **계획**: `implementation.md`의 `### N. ...` 항목 목록 (각 항목 = 한 커밋)
- **실제**: `git log` 커밋 목록

차이 분류:

- **계획에 있는데 git에 없음** = 누락. 사용자에게 보고
- **git에 있는데 계획에 없음** = 추가 (버그 수정, 엣지 케이스, 임의 리팩토링 등). 다음을 검증해 사용자에게 보고:
  - 추가 사유 (왜 계획 밖으로 갔는지)
  - 본 PR 범위인지 vs 별 PR 이연 판단
  - 테스트 커버리지 (추가된 코드 테스트)
  - 글로벌 룰 「내 작업 외 변경은 커밋하지 않는다」 위반 가능성

`pr{N}/persistent/overview.md` `## TODO`에 남은 항목도 계획·커밋과 대조해 보고한다 — implement 시작 뒤에 도착한 항목이 여기서 잡힌다.

보고 기준: 차이가 있을 때만 기재. 차이가 없으면 섹션 생략.

---

## Step 6.1.5. 주석 게이트 (안전망 + 백스톱)

> **step-6.2 진입 전 게이트.** step-6.1 직후 자동 실행한다. 통과한 뒤에만 step-6.2로 진입한다. 생략 불가 — "implement 종료에서 0건이 보장됐으니 건너뛴다"는 판단 금지.

`node {{skill_dir}}/scripts/check-pr-comments.mjs --base <PR 기준 ref> --plan /plan`

둘을 함께 본다.

- **금지 주석 잔존** — 걸리면 implement Implementer 흐름으로 처리하고 이 게이트를 다시 돌린다. 리뷰어에게 시키지 않는다.
- **미배정 blanket disable 고아** — 생성 시 등록([file-level(blanket) eslint-disable 라이프사이클](../conventions/artifact/comments.md#file-levelblanket-eslint-disable-라이프사이클))을 빠뜨려 어느 PR에도 배정 안 된 것만 뜬다. 여기서 제거하지 않고 표면화만 한다. 목록을 사용자에게 명시 보고하고, 어느 PR에 넣을지는 사용자가 정해 [PR 몫 TODO 등록처](../conventions/pr-split.md#pr-몫-todo-등록처)에 등록한다.

---

## Step 6.2. 리뷰 파이프라인

Lead가 [code-map.md](../../../contexts/code-map.md) 탐색 절차에서 관련 coding-standards·구현 패턴을 선별하고, `/code-review`를 advanced 모드로 호출한다.

```
code-review(advanced) → 이슈 목록 → Implementer 수정 → code-review(advanced, 수정 diff만) → 반복 (0건까지)
```

- code-review에 전달하는 입력: PR diff, coding-standards 목록, `/plan/pr{N}/persistent/reference.md` ([conventions/artifact/reference-curation.md](../conventions/artifact/reference-curation.md) 참조), 리뷰 모드(advanced)
- code-review가 이슈 목록을 반환하면, Implementer에게 한번에 전달
- 수정은 implement의 Implementer 흐름이 수행한다 (마크업 수정이면 그 모드의 진실검사 기준 — [modes.md](../conventions/modes.md) 매트릭스)

---

## Step 6.3. 사용자 리뷰 대기

AI 리뷰(Step 6.2 code-review) + 모든 수정 완료 후, **사용자가 직접 코드 리뷰**한다. 이 시점까지 stub 커밋부터 IMPL/리뷰 수정 커밋이 그대로 보존되어 있어야 한다.

이 시점까지 사용자가 PR의 **모든 커밋을 이해한 상태**여야 한다 — 모르는 코드는 Step 6.5 정리 전에 여기서 모두 짚어 해소한다.

Lead는 사용자 리뷰 진입을 안내하고 대기한다:

- 현재 커밋 목록 (stub + IMPL + 리뷰 수정) 출력
- 사용자 리뷰 통과 시 Step 6.4로 진행

사용자가 추가 수정 요청하면 implement의 Implementer가 처리 → 다시 Step 6.2 AI 리뷰 → Step 6.3 사용자 리뷰 반복.

---

## Step 6.4. 사용자 동작 테스트

AI 코드 리뷰(6.2) + 사용자 코드 리뷰(6.3) 통과 후, PR 변경분을 실행해 검증할 수동 동작 테스트 시나리오를 작성한다. AI가 할 수 있는 항목은 AI가 먼저 돌리고, 나머지만 사용자에게 넘긴다.

산출물: `/plan/pr{N}/consumable/user-test-cases.md`. **수동 동작 테스트 전용** — stub의 `it.todo`(자동화 단위 테스트)와는 별개다.

작성 기준:

- 범위: 구현 단계의 모든 코드 변경분을 훑어 TC를 뽑는다
- 케이스 종류: 성공 경로, 실패 경로, 엣지 케이스 모두 작성
- 단위: 사용자 인터랙션 시나리오. 함수 인자·반환 단위는 적지 않는다

양식: 각 케이스를 체크리스트로 작성하고, 누가 확인했는지를 붙인다.

```
- [x] (AI) <시나리오>: <조건>일 때 <기대 동작> — <판정 근거가 된 측정값 한 줄>
- [ ] (사용자 · <사유>) <시나리오>: <조건>일 때 <기대 동작>
```

AI 실행:

- AI가 할 수 있는 항목은 전부 실제 크롬으로 돌린다. 조합이 폭발하는 매트릭스는 크롬에서 대표 1경우만 돌리고, 나머지는 이미 돌린 자동 검증 이름을 적는다
- 사용자에게 넘기는 사유는 셋 중 하나다: `실기기`(기기가 있어야 함) / `사람 판정`(값은 재도 판정이 감각) / `도구 불능`(도구가 실제로 동작하지 않음 — 무엇이 어떻게 안 됐는지 한 줄을 붙인다). 이 밖의 사유로 넘기지 않는다

Lead는 변경분을 훑어 TC 추출 → 파일 작성 → AI 실행 항목을 돌려 결과 반영 → 사용자에게 경로 + 테스트 진입 방법(dev 서버 URL 등) + AI가 확인한 범위와 넘긴 항목의 사유 안내. AI 실행 또는 사용자 테스트에서 실패 발견 시 LLM에게 수정 지시 → 구현 단계 Implementer 처리 → 다시 6.2부터 진행.

### Step 6.4.1. Figma 시각 대조 + 승인 게이트 (UI 컴포넌트 PR 한정)

UI 컴포넌트 PR이면, 사용자가 dev 서버 URL로 화면을 띄워 렌더 결과를 `pr{N}/retained/markup.md` 「Figma 원본 링크 인덱스」 URL로 **사용자가 직접 시각 대조**한다.

- 검증 기준은 figma 원본: [검증 기준 — figma 원본 직접 fetch](../conventions/artifact/markup-spec.md#검증-기준--figma-원본-직접-fetch) 적용 (수행 주체만 사람으로 바뀜).
- 불일치는 **사용자가 직접 보고 승인/반려**한다. AI가 figma 차이를 자동으로 정답 처리해 반영하지 않는다.
- 반려분은 구현 단계 Implementer 흐름으로 수정 → 다시 6.2부터 진행.
- 승인 게이트이므로 별도 산출물을 만들지 않는다 (user-test-cases.md는 동작 테스트 전용 유지).
- **figma 없는 모드**: *조립된 PR 렌더(로직·실데이터 반영)*를 그 모드의 시각 원본([modes.md](../conventions/modes.md) 매트릭스)과 사용자가 대조한다. 승인/반려·반려분 수정 흐름은 같다.

---

## Step 6.5. 1회차 커밋 정리·재정렬

사용자 리뷰·동작 테스트 통과 후 WRITING_REFINER(PR 본문 확정) 진입 전, stub 커밋을 drop하고 슬라이스별로 커밋을 재정렬한다.

이 정리는 **1회차**로 본 PR 슬라이스 정리에만 집중한다. 메시지 양식·라이프사이클은 [conventions/commits.md](../conventions/commits.md) 참조. 메시지 최종화·오배치 재배치 등 2차 정리는 전 PR IMPL 완료 후 FINALIZE로 미룬다.

### Step 6.5.1. 케이스 분기

stub 커밋 상태(빈 껍데기 / 본문 안고 있음)에 따라 정리 방식이 갈린다. 케이스별 명령·사유는 [정리](../conventions/artifact/stub.md#정리) 참조.

### Step 6.5.2. 사용자에게 force-push 요청 안내

재정렬 완료 후 사용자에게 force-push를 요청한다. 이 PR 브랜치의 커밋을 딛고 뻗은 다른 브랜치가 있으면 새 tip 위로 옮기도록 함께 요청한다 — 의존 PR은 이 PR의 realize-plan 커밋 위에서 뻗으므로 재정렬이 그 밑을 바꾼다.

---

## Step 6.6. decisions.md 최신화

구현·리뷰 과정에서 새로 발생하거나 plan 작성 시점과 달라진 의사결정을 반영한다. 기준은 [갱신](../conventions/artifact/decisions-lifecycle.md#갱신-구현리뷰-후) 참조.

**6.5와 의존 없음 — 병렬 진행 가능.**

---

## Step 6.7. decisions.md 2단 점검

Step 6.6 「decisions.md 최신화」 직후 수행. 결정·코드 정합과 후임자 시각 질문을 한 자리에서 점검한다.

### Step 6.7.1. decisions ↔ 코드 정합 점검 (1차)

[정합 점검 게이트](../conventions/artifact/decisions-lifecycle.md#정합-점검-게이트-decisions--코드) 적용. SKILL.md 「자가 검토 필수」 일반 룰의 특정 갈래 — 검증 소스를 decisions.md, 검증 대상을 현재 코드로 고정. 코드 수정이 필요한 경우 implement Implementer 흐름으로 진입.

### Step 6.7.2. 후임자 시각 예상 질문 (2차)

코드를 본 후임자(히스토리 모름)가 "여기 왜 이렇게 했어요?"라고 물을 만한 예상 질문 목록을 AI가 PR diff + decisions.md 기반으로 추출해 사용자에게 던진다. PR 머지 후 `/discussion` 대비.

- decisions.md에 이미 있는 결정은 제외 (중복)
- 사용자가 답할 수 있으면 → decisions.md에 결정 항목으로 추가할지 사용자가 선택
- 답하기 어려운 항목은 [/discussion](../../discussion/SKILL.md) 스킬로 토론

---

## 산출물

결과를 `/plan/pr{N}/consumable/review.md`에 작성한다.

---

## 보고 내용

산출물 작성 후 사용자에게 다음을 요약하여 보고:

- Gap Analysis 결과 (계획 ↔ 실제 차이 — 누락·추가가 있는 경우)
- 미배정 blanket eslint-disable 고아 목록 (6.1.5 주석 게이트 — 고아가 있는 경우만)
- code-review 결과: 발견된 Critical/Minor 이슈 요약
- 사용자 리뷰 통과 여부
- 사용자 동작 테스트 결과 (실패 시 수정 사항 포함)
- 사용자 Figma 시각 대조 승인 여부 (UI 컴포넌트 PR — 반려·수정분 포함)
- 커밋 정리·재정렬 결과 (재정렬 후 커밋 목록)
- decisions.md 최신화 항목 (변경·추가된 결정만)
- 수정 사항

---

## 산출물 정리

리뷰 파이프라인이 완료되고 모든 이슈가 수정 커밋에 반영된 것을 확인한 뒤, `/plan/pr{N}/consumable/review.md`를 소비한다 (리뷰 결과가 수정 커밋으로 반영됨 = 소비). 소비 후 정리는 consumable 큐 모델을 따른다 ([소비→삭제 메커니즘 SSOT](../conventions/plan-folder.md#소비삭제-메커니즘-ssot--소비처-step은-소비만-선언)).

---

## IMPL 종료

verify 완료 = **PR_{N}_IMPL 세션 종료**. 후속 안내는 implement가 아닌 여기서 낸다(SKILL.md 「세션 spawn 안내 메커니즘」 — 마지막 IMPL 판정은 그 「fan-in 후속」).
