---
step: verify
session: PR_{N}_IMPL
next:
  - to: pr-body-final
  - to: markup
    when: 종류 FOUNDATION
---

# verify: 최종 점검

모든 기능 구현 및 커밋 완료 후, **PR 생성 직전** 코드 품질을 최종 점검하는 단계입니다.

---

## 입력·산출물·작업 위치

- **입력**: implement가 쌓은 커밋(stub + IMPL + 리뷰 수정) + `pr{N}/retained/implementation.md`(Gap Analysis 계획) + `pr{N}/persistent/reference.md`·`decisions.md` + `background/consumable/todo.md`·`pr*/persistent/overview.md` 「TODO」(주석 게이트) + `pr{N}/retained/markup.md`(UI 컴포넌트 PR)
- **산출물**: `pr{N}/consumable/`: review.md, user-test-cases.md(사용자에게 넘긴 동작 테스트가 있을 때만) / `pr{N}/persistent/decisions.md` 갱신 / 사용자 리뷰 전 정리된 커밋 → fixup 합치기까지 끝난 커밋 + force-push 요청
- **작업 위치**: PR_{N} 워크트리. 본 PR 하나에 집중

---

## Step 6.1. Gap Analysis (계획 ↔ 실제 차이 검사)

`pr{N}/retained/implementation.md`의 `### N.` 계획 커밋 항목 목록과 실제 `git log`를 대조하여 차이를 식별한다.

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

Lead가 `/code-review`를 advanced 모드로 호출한다. 기준 문서 선별은 [code-review](../../code-review/SKILL.md#1-컨텍스트-준비)가 소유한다.

```
code-review(advanced) → 이슈 목록 → Implementer 수정 → code-review(advanced, 수정 diff만) → 반복 (0건까지)
```

- code-review에 전달하는 입력: PR diff, `/plan/pr{N}/persistent/reference.md` ([conventions/artifact/reference-curation.md](../conventions/artifact/reference-curation.md) 참조), 리뷰 모드(advanced)
- code-review가 이슈 목록을 반환하면, Implementer에게 한번에 전달
- 수정은 implement의 Implementer 흐름이 수행한다 (마크업 수정이면 그 모드의 진실검사 기준 — [modes.md](../conventions/modes.md) 매트릭스)

---

## Step 6.2.1. 테스트 이름 대조

Step 6.2가 0건으로 수렴할 때마다(다시 돈 수렴 포함) 사용자 리뷰로 넘기기 전에 돈다. stub을 거쳤든 realize-plan에서 바로 실행했든 같다.

Lead는 직접 대조하지 않고 서브에이전트를 띄운다. 테스트 파일과 함께 테스트 대상 소스의 경로를, 화면 부품이면 그 화면 문구(목업·시안)도 넘긴다. 서브에이전트는 MP `docs/patterns/testing/TestWriting.md` 「네이밍」 절을 Read 도구로 끝까지 읽고, 이 PR에서 새로 생기거나 이름이 바뀐 테스트 이름(`it`·`test`. 템플릿·`each`로 만든 이름은 펼친 값마다)을 감싼 `describe` 경로와 함께 한 행씩 표에 올린다. 행마다 그 절의 규칙을 하나씩 대보고 걸린 규칙 원문과 고칠 이름을 적는다. 걸린 규칙이 없으면 「없음」으로 적는다. 리뷰에서 반영한 대안 이름도 대상이다.

걸린 이름은 Implementer가 고치고 이 대조를 다시 돌린다. 「네이밍」 절에 맞는 이름을 정하지 못하거나, 걸린 이름이 Step 6.3에서 사용자가 정한 이름이면 고치지 않고 사용자에게 올린다.

---

## Step 6.2.5. 커밋 정리 — 사용자 리뷰 전

verify에서 Step 6.2가 **처음** 0건으로 수렴하면, 사용자 리뷰에 앞서 커밋을 정리한다. 한 번만 한다 — 6.3 이후 다시 도는 6.2가 수렴해도 다시 정리하지 않는다.

- stub 커밋은 [stub 정리](../conventions/artifact/stub.md#정리)의 케이스대로 처리한다
- 서로 상쇄되는 커밋은 없앤다
- 리뷰 수정 커밋은 고친 대상 커밋에 합친다

verify의 커밋 정리는 본 PR 슬라이스 정리에만 집중한다. 메시지 최종화·오배치 재배치 등 2차 정리는 전 PR IMPL 완료 후 FINALIZE로 미룬다.

**이 정리 뒤의 수정은 모두 fixup 커밋으로 쌓는다** — 6.3 사용자 리뷰, 6.4 동작 테스트, 6.4.1 시각 대조, 그 뒤 다시 도는 6.2 AI 리뷰·6.2.1 이름 대조의 수정 전부다. Implementer가 고친 뒤 고친 대상 커밋을 가리키는 `git commit --fixup=<대상>`으로 쌓고, 정리한 커밋을 다시 묶지 않는다. 합치기는 Step 6.5에서 한 번에 한다.

---

## Step 6.3. 사용자 리뷰 대기

Step 6.2.5에서 정리된 커밋으로 **사용자가 직접 코드 리뷰**한다.

이 시점까지 사용자가 PR의 **모든 커밋을 이해한 상태**여야 한다 — 모르는 코드는 여기서 모두 짚어 해소한다.

Lead는 사용자 리뷰 진입을 안내하고 대기한다:

- 정리된 커밋 목록 출력
- [테스트 이름 대조](#step-621-테스트-이름-대조)의 마지막 표
- 사용자 리뷰 통과 시 Step 6.4로 진행

사용자가 추가 수정을 요청하면 implement의 Implementer가 고쳐 [fixup 커밋으로 쌓는다](#step-625-커밋-정리--사용자-리뷰-전) → 다시 Step 6.2 AI 리뷰 → Step 6.3 사용자 리뷰 반복.

---

## Step 6.4. 사용자 동작 테스트

AI 코드 리뷰(6.2) + 사용자 코드 리뷰(6.3) 통과 후, PR 변경분을 실행해 검증할 동작 테스트 시나리오를 뽑아 AI가 전부 직접 돌린다. 사용자에게는 AI가 돌리지 못한 항목만 넘긴다.

시나리오 뽑기 — stub의 `it.todo`(자동화 단위 테스트)와는 별개다:

- 범위: 구현 단계의 모든 코드 변경분을 훑어 TC를 뽑는다
- 케이스 종류: 성공 경로, 실패 경로, 엣지 케이스 모두 뽑는다
- 단위: 사용자 인터랙션 시나리오. 함수 인자·반환 단위는 적지 않는다

AI 실행:

- 뽑은 TC는 아래 사유에 걸리는 것만 빼고 전부 실제 크롬으로 돌린다. 조합이 폭발하는 매트릭스는 크롬에서 대표 1경우만 돌리고, 나머지는 이미 돌린 자동 검증 이름을 보고에 싣는다
- 사용자에게 넘기는 사유는 셋 중 하나다: `실기기`(기기가 있어야 함) / `사람 판정`(값은 재도 판정이 감각) / `도구 불능`(도구가 실제로 동작하지 않음 — 무엇이 어떻게 안 됐는지 한 줄을 붙인다). 이 밖의 사유로 넘기지 않는다

산출물: `/plan/pr{N}/consumable/user-test-cases.md`에는 사용자에게 넘긴 항목만 적는다. 넘긴 항목이 없으면 파일을 만들지 않는다.

```
- [ ] (사용자 · <사유>) <시나리오>: <조건>일 때 <기대 동작>
```

Lead는 변경분을 훑어 TC 추출 → 크롬으로 실행 → 넘길 항목이 있으면 파일 작성 → 사용자에게 보고한다. 보고에는 AI가 돌린 시나리오마다 판정 근거가 된 측정값 한 줄과 사용자 몫 건수(0건이어도 적는다)를 싣고, 사용자 몫이 있으면 파일 경로 + 테스트 진입 방법(dev 서버 URL 등) + 항목별 사유를 더한다. AI 실행 또는 사용자 테스트에서 실패 발견 시 LLM에게 수정 지시 → 구현 단계 Implementer 처리(fixup 커밋) → 다시 6.2부터 진행.

### Step 6.4.1. Figma 시각 대조 + 승인 게이트 (UI 컴포넌트 PR 한정)

UI 컴포넌트 PR이면, 사용자가 dev 서버 URL로 화면을 띄워 렌더 결과를 `pr{N}/retained/markup.md` 「Figma 원본 링크 인덱스」 URL로 **사용자가 직접 시각 대조**한다.

- 검증 기준은 figma 원본: [검증 기준 — figma 원본 직접 fetch](../conventions/artifact/markup-spec.md#검증-기준--figma-원본-직접-fetch) 적용 (수행 주체만 사람으로 바뀜).
- 불일치는 **사용자가 직접 보고 승인/반려**한다. AI가 figma 차이를 자동으로 정답 처리해 반영하지 않는다.
- 반려분은 구현 단계 Implementer 흐름으로 수정(fixup 커밋) → 다시 6.2부터 진행.
- 승인 게이트이므로 별도 산출물을 만들지 않는다 (user-test-cases.md는 동작 테스트 전용 유지).
- **figma 없는 모드**: *조립된 PR 렌더(로직·실데이터 반영)*를 그 모드의 시각 원본([modes.md](../conventions/modes.md) 매트릭스)과 사용자가 대조한다. 승인/반려·반려분 수정 흐름은 같다.

---

## Step 6.5. fixup 합치기

사용자 리뷰·동작 테스트 통과 후 WRITING_REFINER(PR 본문 확정) 진입 전, Step 6.2.5 뒤에 쌓인 fixup 커밋을 대상 커밋에 합친다. 이 환경은 대화형 편집기를 못 띄우므로 시퀀스 편집기를 비워 비대화형으로 돌린다:

```
GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash <base>
```

합친 뒤 사용자에게 force-push를 요청한다. 이 PR 브랜치의 커밋을 딛고 뻗은 다른 브랜치가 있으면 새 tip 위로 옮기도록 함께 요청한다 — 의존 PR은 이 PR의 realize-plan 커밋 위에서 뻗으므로 Step 6.2.5와 이 단계가 그 밑을 바꾼다.

---

## Step 6.6. decisions.md 최신화

구현·리뷰 과정에서 새로 발생하거나 plan 작성 시점과 달라진 의사결정을 반영한다. 기준은 [갱신](../conventions/artifact/decisions-lifecycle.md#갱신-구현리뷰-후) 참조.

결정은 두 곳에서 모은 뒤 decisions.md에 한 번에 쓴다.

1. 이 PR의 implement·verify 대화 — 앞 세션에서 나온 결정은 그 세션 대화 기록을 읽는다
2. 후임자 시각 예상 질문 — 코드를 본 후임자(히스토리 모름)가 "여기 왜 이렇게 했어요?"라고 물을 만한 질문을 PR diff + decisions.md로 뽑아 사용자에게 던진다. PR 머지 후 `/discussion` 대비
   - decisions.md에 이미 있는 결정과 1에서 모은 결정은 제외 (중복)
   - 사용자가 답할 수 있으면 → decisions.md에 결정 항목으로 추가할지 사용자가 선택
   - 답하기 어려운 항목은 [/discussion](../../discussion/SKILL.md) 스킬로 토론

**6.5와 의존 없음 — 병렬 진행 가능.**

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
- 커밋 정리 결과 (사용자 리뷰 전 정리 후 커밋 목록, fixup 합치기 후 커밋 목록)
- decisions.md 최신화 항목 (변경·추가된 결정만)
- 수정 사항

---

## 산출물 정리

리뷰 파이프라인이 완료되고 모든 이슈가 수정 커밋에 반영된 것을 확인한 뒤, `/plan/pr{N}/consumable/review.md`를 소비한다 (리뷰 결과가 수정 커밋으로 반영됨 = 소비). `user-test-cases.md`는 사용자가 넘겨받은 항목을 모두 통과시키면 소비한다. 소비 후 정리는 consumable 큐 모델을 따른다 ([소비→삭제 메커니즘 SSOT](../conventions/plan-folder.md#소비삭제-메커니즘-ssot--소비처-step은-소비만-선언)).

---

## IMPL 종료

verify 완료 = **PR_{N}_IMPL 세션 종료**. 후속 안내는 implement가 아닌 여기서 낸다(SKILL.md 「후속 세션 안내」).
