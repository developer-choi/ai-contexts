---
step: implement
session: PR_{N}_IMPL
scope: per-pr
entry: >-
  PR_{N}_PLAN의 realize-plan 종료 + (페이지 코드 포함 PR이고 코드 대용이 아니면) MARKUP의 해당 페이지 코드
  + (종류 COMPONENTS) MARKUP의 공통 컴포넌트 마크업 완료
model: Sonnet — stub에 `// TODO [AI_IMPL]` 한글 명세가 남아 있으면 Opus
next:
  - to: verify
---

# implement: 구현

> **이 단계의 목표: PLAN이 세운 구현 계획대로 Lead가 코드를 작성한다**

구현 중 계획(stub·잔존 md)보다 나은 방법이나 계획의 문제를 발견하면, 계획을 고치지 않고 사용자에게 올린다.

---

## 입력·산출물·작업 위치

- **입력**:
  - realize-plan stub 커밋(`// TODO [AI_IMPL]:` 주석·`it.todo`)
  - `pr{N}/retained/implementation.md`·`pr{N}/persistent/reference.md`
  - MARKUP 페이지 코드(페이지 코드 포함 PR, 코드 대용 제외)
- **산출물**: 코드 변경 + 커밋 (로직 stub 위에 본체 채움; 마크업은 [마크업 예외](../conventions/artifact/stub.md#마크업-예외)대로). stub 커밋부터 IMPL·리뷰 수정 커밋까지 정리하지 않고 쌓인 채로 verify에 넘긴다
- 구현 중 생긴 결정·plan 정정은 decisions.md에 적지 않는다 — 반영은 verify가 한다
- **작업 위치**: PR_{N} 워크트리 (realize-plan이 만든 것). 본 PR 하나에 집중
- **PR 기준 ref**: `node {{skill_dir}}/scripts/steps.mjs pr list`가 이 PR의 `브랜치 ← base`로 찍은 base

---

## Step 5.0. 워크트리 진입

이전 단계에서 만든 워크트리에서 작업한다.

세션이 워크트리 밖에서 시작했으면 `EnterWorktree`에 그 워크트리 경로를 줘 들어간다.

들어간 뒤 본 PR 영역에서 [구현 전 미검토 TODO 검사](../conventions/artifact/comments.md#구현-전-미검토-todo-검사)를 실행한다. realize-plan에서 사용자가 미검토한 항목이 있으면 IMPL 진입 불가 — 걸린 항목을 사용자에게 보이고, 사용자가 지우면 이 세션에서 검사를 다시 돌린다.
[PR별 TODO 등록처](../conventions/pr-split.md#pr별-todo-등록처)가 정한 이 PR의 TODO 자리도 읽는다 — plan 뒤에 다른 PR이 이 PR이 할 일로 넣은 항목이 거기 있다.

---

## Step 5.1. 구현 준비

구현은 Lead가 직접 한다.

MARKUP 결과물은 [마크업 예외](../conventions/artifact/stub.md#마크업-예외)의 두 종류에 따라 가져온다.

- **페이지 마크업** — 가져와 따로 커밋하고, MARKUP 완성본과 파일 diff가 없는지 확인한다. 디자인 원본 대조와 코드 리뷰는 MARKUP에서 마쳤으므로 이 커밋은 impl-review-loop에 넣지 않는다.
  첫 커밋 단위보다 먼저 가져온다 — 로직이 이 파일을 import한다. 로직 커밋이 이미 있으면 지금 위에 커밋한다.
- **공통 지정 컴포넌트** — stub 껍데기에 MARKUP 시각 본문을 옮겨 넣는 일은 그 컴포넌트를 다루는 커밋 단위에 넣어 Step 5.3 리뷰를 거친다. 옮긴 시각 본문(CSS 수치·HTML 구조)이 MARKUP 완성본과 같은지 diff로 확인한다.

Lead는 code-map 탐색으로 coding-standards rules·MP 패턴 문서를 골라 읽지 않는다 — 규칙 준수는 Step 5.3 리뷰가 맡는다.

**프로젝트 세팅 PR** — 린트, 포맷터 등 설정만 다루는 PR은 재료·정답 대조 A·규칙검사 B·커밋 단위를 Step 5.3 표가 아니라 [SETUP 「구현 분담」](../conventions/pr-types/setup.md#구현-분담)대로 정한다.

---

## Step 5.2. 구현 중 공통 룰

### Step 5.2.1. TODO 주석 처리

IMPL 중 만나는 TODO 마커는 [처리](../conventions/artifact/comments.md#처리-구현-중) 룰을 따르고, 다른 PR로 미룰 일은 [다른 PR로 미루는 마커](../conventions/artifact/comments.md#다른-pr로-미루는-마커--코드-안-금지)대로 그 PR의 TODO에 등록한다.

### Step 5.2.2. 계획 밖 일을 만났을 때

- **계획에 없던 작업** — 지금 커밋 단위 없이도 독립적으로 설명되면 별도 커밋, 아니면 지금 커밋에 넣는다.
- **계획에 없는 파일·모듈** — 만들기 전에 같은 역할의 코드(API·타입·컴포넌트)가 이미 있는지 찾아 재사용한다.
- 이미 있는 코드블록을 옮기거나 쪼개는 편집(컴포넌트 추출, 코드블록 분리, 공용 위치로 승격)은 경계를 정하는 것도 옮기는 것도 사용자가 한다. AI는 옮겨진 코드에 이름 후보를 낸다.
  새 코드를 처음 쓰면서 나누는 것은 해당하지 않는다.
- realize-plan이 커밋한 외부 공개 시그니처는 바꾸지 않는다(freeze) — 바꿔야 하면 사용자에게 영향을 알리고 정한다.
- **테스트 범위: stub의 `it.todo`만 채운다** — 더 필요해 보이거나 리뷰 이슈가 `it.todo` 밖 테스트를 요구하면, 쓰기 전에 Step 5.3 「계획 밖 테스트 제안」으로 판정해 넣기로 한 것만 쓴다.

### Step 5.2.3. IMPL 중 디자인·기획 변경 감지

IMPL 중 디자인·기획이 바뀌었다는 것을 알게 되면, 앞 단계 산출물(stub·it.todo·마크업)대로 진행하지 않고 멈춰 사용자에게 보고하고, 변경 범위와 다시 들어갈 단계를 함께 정한다. 디자인 변경으로 마크업을 다시 가져오면 Step 5.1대로 가져오고, 그 마크업을 import하는 로직 커밋 단위는 Step 5.3 리뷰를 다시 돈다.

---

## Step 5.3. 리뷰 파이프라인

구현·리뷰는 [impl-review-loop](../impl-review-loop/SKILL.md)를 호출해 0건까지 수렴시킨다. Lead는 아래 인자를 주입한다 (재료는 입력·Step 5.1 참조).

**계획 밖 테스트 제안** — 계획 밖 테스트가 필요해 보이면 Lead는 테스트마다 일회성 서브에이전트(sonnet — 정해진 문항에 답만 대는 판정이다)를 띄운다 — 테스트를 쓰려는 쪽이 자기 제안을 판정하지 않게 한다.
파일 · 테스트 이름 · 필요한 이유를 넘기고, MP `docs/patterns/testing/WhatToTest.md` 판정 4문항을 대게 해 판정 · 걸린 문항 · 근거만 돌려받는다.

| 구현자 | 정답 대조 A (메커니즘) | 규칙검사 B | 추가 검사 | 커밋 단위 |
|---|---|---|---|---|
| Lead | 정답 위치는 stub 커밋 `*.test.ts(x)`의 `it.todo`, 테스트 실행 green으로 판정. 공통 지정 컴포넌트를 다루는 단위는 Step 5.1의 시각 본문 diff도 본다. 마크업을 고친 단위는 그 모드의 디자인 원본([modes.md](../conventions/modes.md) 매트릭스)과 [검증 기준](../conventions/modes.md#검증-기준--렌더-결과와-디자인-원본-대조)대로 대조한다. 종료 커버리지는 [IMPL 종료 시점](../conventions/artifact/implementation-spec.md#impl-종료-시점--남은-ittodo)과 `implementation.md`의 `### N`마다 커밋 단위가 있는지 | 추가 컨벤션 `pr{N}/persistent/reference.md`, Advanced Reviewer 참고 자료: stub `*.test.ts(x)`의 `it.todo` | [테스트 이름 대조](#step-531-테스트-이름-대조) | `implementation.md`의 `### N` 항목 하나 |

**리뷰어 유지** — Lead는 code-review의 리뷰어를 모두 이름 있는 팀원으로 띄우고, 커밋 단위·재검 라운드 내내 같은 팀원에게 맡긴다.

### Step 5.3.1. 테스트 이름 대조

커밋 단위마다 도는 추가 검사다. code-review 리뷰어와 기준이 달라 규칙검사 B에 섞지 않는다.

1. `node {{skill_dir}}/scripts/step-gates.mjs name-check verify --base <PR 기준 ref>`를 돌린다. exit 0이면 통과다.
2. 찍힌 이름을 서브에이전트(sonnet — 정해진 규칙에 이름을 대보는 일이다)에 넘긴다. 테스트 파일과 함께 테스트 대상 소스의 경로를, 화면 부품이면 그 화면 문구(목업·시안)도 넘긴다.
3. 걸린 이름은 고쳐 커밋하고 1부터 다시 돈다. 「네이밍」 절에 맞는 이름을 정하지 못하면 걸린 규칙을 보이고 사용자에게 올린다. 사용자가 정한 이름도 고쳐 커밋하고 1부터 다시 돌되, 다시 걸린 것이 그 이름뿐이면 묻지 않고 표에 「사용자 결정」으로 적는다.
4. 걸린 이름이 없거나 남은 것이 모두 「사용자 결정」이면 서브에이전트가 낸 표를 파일로 두고 `node {{skill_dir}}/scripts/step-gates.mjs name-check record --base <PR 기준 ref> --table <표 파일>`로 남긴다.

서브에이전트가 하는 일:

- MP `docs/patterns/testing/TestWriting.md` 「네이밍」 절을 Read 도구로 끝까지 읽는다.
- 받은 이름(템플릿·`each`로 만든 이름은 펼친 값마다)을 감싼 `describe` 경로와 함께 한 행씩 표에 올린다.
- 행마다 그 절의 규칙을 하나씩 대보고 걸린 규칙 원문과 고칠 이름을 적는다. 걸린 규칙이 없으면 「없음」으로 적는다.

---

## Step 5.4. 마무리

- **TODO 잔존 점검** — [구현 종료 TODO 잔존 검사](../conventions/artifact/comments.md#구현-종료-todo-잔존-검사) 실행. 종료 조건은 그 절을 따른다
- **이 PR의 TODO 자리 다시 읽기** — Step 5.0에서 읽은 뒤 다른 PR이 넣은 항목이 있으면 이 세션에서 처리한다
- Lead가 사용자에게 결과 보고
  - 커밋 목록 (stub + IMPL + 리뷰 수정 그대로)
  - 리뷰 결과 요약 (각 단계별 이슈 수 + 해결 내용)
  - Lead가 들인 계획 밖 테스트가 있으면 그 목록(파일 · `it` 이름 · 판정 문항)
  - 띄운 서브에이전트·팀원의 모델과 근거 (이 문서가 적은 근거를 옮기고, 다르게 띄웠으면 바꾼 이유)
  - 수정 사항 (있는 경우)

> 이 보고가 끝나도 PR_{N}_IMPL 세션은 종료되지 않는다. 사용자 승인을 받으면 Step 5.3의 리뷰어 팀원을 모두 끝내고 같은 세션에서 최종 점검 단계(verify)로 넘어간다.
