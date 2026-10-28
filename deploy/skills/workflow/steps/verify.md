---
step: verify
session: PR_{N}_IMPL
next:
  - to: markup
    when: 종류 FOUNDATION, 코드 대용 아님
---

# verify: 최종 점검

구현 커밋을 마친 뒤 **PR 생성 직전** 코드 품질을 최종 점검하는 단계다.

---

## 입력·산출물·작업 위치

- **입력**
  - implement가 쌓은 커밋(stub + IMPL + 리뷰 수정)
  - `pr{N}/persistent/reference.md`·`decisions.md`
  - `background/consumable/todo.md`·`pr*/persistent/overview.md` 「TODO」(금지 주석·고아 disable 검사)
  - 디자인 원본 — [modes.md](../conventions/modes.md) 매트릭스의 저장 위치(UI 컴포넌트 PR)
- **산출물**
  - `pr{N}/consumable/`: user-test-cases.md(사용자에게 넘긴 동작 테스트가 있을 때만)
  - `pr{N}/persistent/decisions.md` 갱신
  - 사용자 리뷰 전 정리된 커밋 → fixup 합치기까지 끝난 커밋 + force-push 요청
- **작업 위치**: PR_{N} 워크트리. 본 PR 하나에 집중
- **PR 기준 ref**: `node {{skill_dir}}/scripts/steps.mjs pr list`가 이 PR의 `브랜치 ← base`로 찍은 base

---

## Step 6.1. 금지 주석·고아 disable 검사

통과해야 6.2로 넘어간다. "implement 종료에서 0건이 보장됐으니 건너뛴다"며 생략하지 않는다.

`node {{skill_dir}}/scripts/check-pr-comments.mjs --base <PR 기준 ref> --plan <plan>`

둘을 함께 본다.

- **금지 주석 잔존** — 걸리면 고치고 이 검사를 다시 돌린다.
- **미배정 blanket disable 고아** — 여기서 제거하지 않고 목록을 사용자에게 보고하고, 사용자가 고른 PR에 [PR별 TODO 등록처](../conventions/pr-split.md#pr별-todo-등록처)대로 등록한다.

---

## Step 6.2. 리뷰 파이프라인

Lead가 `/code-review`를 advanced 모드로 호출한다. 기준 문서 선별은 [code-review](../../code-review/SKILL.md)가 소유한다.

```
code-review(advanced) → 이슈 목록 → Lead 수정 → code-review(advanced, 수정 diff만) → 반복 (0건까지)
```

- code-review에 전달하는 입력: PR diff, `/plan/pr{N}/persistent/reference.md` ([conventions/artifact/reference-curation.md](../conventions/artifact/reference-curation.md) 참조), 리뷰 모드(advanced)
- 마크업을 고쳤으면 [modes.md](../conventions/modes.md) 매트릭스의 그 모드 검사 기준으로 원본(피그마 등)과 맞는지 본다

---

## Step 6.2.1. 테스트 이름 대조

Step 6.2가 0건으로 수렴할 때마다(다시 돈 수렴 포함) 다음 단계로 넘어가기 전에 돈다.

Lead는 서브에이전트(sonnet — 정해진 규칙에 이름을 대보는 일이다)를 띄운다. 테스트 파일과 함께 테스트 대상 소스의 경로를, 화면 부품이면 그 화면 문구(목업·시안)도 넘긴다.

서브에이전트가 하는 일:

- MP `docs/patterns/testing/TestWriting.md` 「네이밍」 절을 Read 도구로 끝까지 읽는다.
- 이 PR에서 새로 생기거나 이름이 바뀐 테스트 이름(`it`·`test`. 템플릿·`each`로 만든 이름은 펼친 값마다)을 감싼 `describe` 경로와 함께 한 행씩 표에 올린다. 리뷰에서 반영한 대안 이름도 대상이다.
- 행마다 그 절의 규칙을 하나씩 대보고 걸린 규칙 원문과 고칠 이름을 적는다. 걸린 규칙이 없으면 「없음」으로 적는다.

걸린 이름은 고치고 이 대조를 다시 돌린다. 「네이밍」 절에 맞는 이름을 정하지 못하면 사용자에게 올린다.

걸린 이름이 없거나 남은 걸린 이름을 모두 사용자에게 올려 정했으면 서브에이전트가 낸 표를 파일로 두고 `node {{skill_dir}}/scripts/step-gates.mjs name-check record`로 남긴다.

---

## Step 6.2.2. 동작 테스트

6.2·6.2.1이 수렴할 때마다, 사용자 코드 리뷰 전에 PR 변경분을 실행해 검증할 동작 테스트 시나리오를 뽑아 AI가 돌릴 수 있는 것을 전부 직접 돌린다. 사용자 리뷰보다 앞에 두는 이유는 동작이 틀린 코드를 사용자가 먼저 리뷰하면 고친 뒤 다시 리뷰해야 해서다.

처음에는 뽑은 시나리오를 전부 돌린다. 수정 뒤 다시 돌 때는 고친 코드가 닿는 시나리오만 돌린다.

시나리오 뽑기는 일회성 서브에이전트에 맡긴다 — PR diff 전체를 훑는 일이다. PR 기준 ref와 화면 PR이면 디자인 원본 경로를 넘기고, 사용자 인터랙션 단위 시나리오마다 `<시나리오>: <조건>일 때 <기대 동작>`과 닿는 `파일:줄`만 돌려받는다. stub의 `it.todo`(자동화 단위 테스트)와는 별개다.

AI 실행:

- 뽑은 시나리오는 아래 사유에 걸리는 것만 빼고 전부 실제 크롬으로 돌린다. 조합이 폭발하는 매트릭스는 크롬에서 대표 1경우만 돌리고, 나머지는 이미 돌린 자동 검증 이름을 보고에 싣는다
- 크롬으로 돌릴 시나리오가 여럿이면 에이전트 하나에 몰지 않고, [여러 에이전트에 나눠 동시에 확인할 때](../../../contexts/browser-verification.md#여러-에이전트에-나눠-동시에-확인할-때)대로 나눠 동시에 돌린다
- 판정은 화면이 뜨는지가 아니라, 화면에 나온 문구·값 하나하나가 그 시나리오의 조건(어느 기간인지, 어떤 상태인지)에서 맞는 말인지로 한다. 시점·상태를 가리키는 낱말(「이번」·「지난」·「벌써」·「처음」 같은 것)은 조건을 바꿔 가며(진행 중·끝남, 처음·다시 생김 등) 화면마다 하나씩 대본다
- UI 컴포넌트 PR이면 돌린 화면을 그 모드의 디자인 원본([modes.md](../conventions/modes.md) 매트릭스)과도 [검증 기준](../conventions/modes.md#검증-기준--렌더-결과와-디자인-원본-대조)대로 대조한다. 로직·실데이터가 반영된 조립 화면을 보는 것이다
- 사용자에게 넘기는 사유는 셋 중 하나다: `실기기`(기기가 있어야 함) / `사람 판정`(값은 재도 판정이 감각) / `도구 불능`(도구가 실제로 동작하지 않음 — 무엇이 어떻게 안 됐는지 한 줄을 붙인다)

결과에는 AI가 돌린 시나리오마다 판정 근거가 된 측정값 한 줄과, 돌리지 못해 사용자가 확인하도록 남긴 시나리오 건수(0건이어도 적는다)·항목별 사유를 남긴다.

산출물: 사용자가 확인할 항목은 `/plan/pr{N}/consumable/user-test-cases.md`에 적는다. 다시 돌면 다시 돈 시나리오의 항목만 고친다.

```
- [ ] (사용자 · <사유>) <시나리오>: <조건>일 때 <기대 동작>
```

---

## Step 6.2.5. 커밋 정리 — 사용자 리뷰 전

6.2부터 6.2.2까지를 **처음** 모두 통과하면, 사용자 리뷰에 앞서 커밋을 정리한다.

- stub 커밋은 [stub 정리](../conventions/artifact/stub.md#정리)대로 처리한다
- 서로 상쇄되는 커밋은 없앤다
- 리뷰·동작 테스트 수정 커밋은 고친 대상 커밋에 합친다

정리한 뒤 `git rebase --exec '<그 레포의 타입 검사·테스트 명령>' <PR 기준 ref>`로 커밋마다 통과하는지 본다. 멈추면 멈춘 커밋이 import하는 파일을 채우는 커밋을 그 앞으로 옮기고, 서로 import해 순서로 풀리지 않으면 사용자에게 올린다.

커밋 메시지 최종화와 다른 PR로 옮길 커밋의 재배치는 여기서 하지 않는다.

---

## Step 6.3. 사용자 리뷰 대기

Step 6.2.5에서 정리된 커밋으로 **사용자가 직접 코드 리뷰**하고, AI가 못 돌린 동작 테스트 항목도 함께 확인한다.

이 시점까지 사용자가 PR의 **모든 커밋을 이해한 상태**여야 한다 — 모르는 코드는 여기서 모두 짚어 해소한다.

안내 전에 `node {{skill_dir}}/scripts/step-gates.mjs name-check verify`를 돌린다.

Lead는 사용자 리뷰 진입을 안내하고 대기한다:

- 정리된 커밋 목록 출력
- `name-check verify`가 찍은 테스트 이름 대조 표
- [동작 테스트](#step-622-동작-테스트) 결과
- `user-test-cases.md`에서 아직 통과하지 않은 항목 — 파일 경로, 테스트 진입 방법(dev 서버 URL 등), 항목별 사유
- 지금까지 띄운 서브에이전트의 모델과 근거

---

## 수정이 생기면

동작 테스트에서 실패하거나, 사용자 리뷰·사용자 확인 항목에서 수정을 요청받으면 고치고 다시 6.1부터 순서대로 진행한다. 다시 도는 범위는 각 절을 따른다.

- 커밋 정리(6.2.5) 뒤의 수정은 모두 고친 대상 커밋을 가리키는 `git commit --fixup=<대상>`으로 쌓고 정리한 커밋을 다시 묶지 않는다
- 사용자 리뷰에서 사용자가 정한 테스트 이름이 다시 도는 이름 대조에 걸리면 사용자에게 올린다

---

## Step 6.5. fixup 합치기

사용자 리뷰(6.3)를 통과하면 `pr{N}/retained/`를 지우고 Step 6.2.5 뒤에 쌓인 fixup 커밋을 대상 커밋에 합친다. 이 환경은 대화형 편집기를 못 띄우므로 시퀀스 편집기를 비워 비대화형으로 돌린다:

```
GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash --exec '<그 레포의 타입 검사·테스트 명령>' <PR 기준 ref>
```

멈추면 Step 6.2.5와 같이 처리한다.

합친 뒤 `node {{skill_dir}}/scripts/steps.mjs pr branches`를 돌리고, 사용자에게 force-push와 함께, 이 PR을 아래 브랜치로 두고 어긋났다고 나온 PR 브랜치를 그 출력의 명령으로 옮기도록 요청한다.
옮기면 그 위에 쌓인 PR이 새로 어긋나므로, 이 PR 위로 쌓인 PR(위의 위 포함)에 어긋남이 없을 때까지 `pr branches`를 다시 돌린다.

---

## Step 6.6. decisions.md 최신화

구현·리뷰 과정에서 새로 생기거나 plan 시점과 달라진 결정을 decisions.md에 반영한다. 쓰기 전에 [decisions-lifecycle.md](../conventions/artifact/decisions-lifecycle.md)를 처음부터 끝까지 읽는다.

결정은 두 곳에서 모은다.

1. 이 PR의 implement·verify 대화. 앞 세션 기록은 일회성 서브에이전트(sonnet — 문서 기준대로 원문을 가려 모으는 일이다)에 맡기고 모델과 근거를 사용자에게 알린다 — 기록이 수 MB다.
   - 기록 경로와 decisions-lifecycle.md 경로를 넘겨 그 문서 기준대로 가른 원문을 돌려받는다. 사용자에게 물어야 하는 것(애매한 후보·단발 발화에서 나온 항목)과 TODO로 보낼 PR 분할·범위 변경 발화는 표시해 받는다. 기록은 다시 열지 않는다.
   - Claude Code면 기록은 `~/.claude/projects/` 아래 이 PR 워크트리 경로를 슬러그로 바꾼 폴더의 jsonl이다. PR마다 워크트리가 따로라, 그 폴더에서 지금 세션이 아닌 것이 이 PR의 앞 세션이다
2. 후임자가 코드를 보고 "여기 왜 이렇게 했어요?"라고 물을 만한 질문. PR diff 전체를 훑는 일이라 일회성 서브에이전트에 맡긴다.
   - PR 기준 ref, decisions.md 경로, 1에서 모은 결정을 넘기고, 이미 있는 결정에 닿는 질문은 뺀 뒤 질문마다 `파일:줄`과 원문 줄만 돌려받는다.
   - Lead는 그 줄로 사용자에게 묻고 diff를 다시 열지 않는다. 답하기 어려운 질문은 [/discussion](../../discussion/SKILL.md)으로 토론한다.

**6.5와 의존 없음 — 병렬 진행 가능.**

---

## 산출물 정리

`user-test-cases.md`는 사용자가 넘겨받은 항목을 모두 통과시키면 소비한다. 소비 후 정리는 consumable 큐 모델을 따른다 ([소비→삭제 메커니즘 SSOT](../conventions/plan-folder.md#소비삭제-메커니즘-ssot--소비처-step은-소비만-선언)).

---

## IMPL 종료

verify 완료 = **PR_{N}_IMPL 세션 종료**. 후속 안내는 여기서 낸다(SKILL.md 「후속 세션 안내」).
