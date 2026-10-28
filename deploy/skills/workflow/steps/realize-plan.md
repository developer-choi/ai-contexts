---
step: realize-plan
session: PR_{N}_PLAN
next:
  - to: implement
  - to: plan
    notice: go
    when: 이 PR에 의존하는 PR이 있을 때
---

# realize-plan: 구현

[과제 정의 단계](plan.md)에서 승인된 과제에 대해서만 진행한다.

이 단계는 그 과제를 코드로 옮긴다 — 코드로 표현할 수 있는 것은 stub으로 박거나 그 자리에서 실행해 커밋하고, 본체 구현은 다음 IMPL 세션이 한다.

이 PR에 의존하는 PR은 이 단계가 끝난 뒤 그 커밋을 딛고 출발한다. 그래서 이 단계를 마친 뒤로는 커밋한 외부 공개 시그니처를 바꾸지 않는다(freeze) — 바꿔야 하면 사용자에게 영향을 알리고 정한다.

---

## 입력·산출물·작업 위치

- **입력**: plan 산출물 `pr{N}/persistent/`의 overview.md·decisions.md·reference.md + `/plan/pr{N}/`·`/plan/background/`의 잔여 산출물(아래 [잔여 산출물 소비](#1-잔여-산출물-소비)에서 소비)
- **산출물**:
  - 코드 변경 + 커밋
  - `pr{N}/persistent/`: reference.md 누적
  - `pr{N}/retained/`: implementation.md
- **작업 위치**: PR_{N} 워크트리 — 아래 [사전 준비](#사전-준비-브랜치워크트리-생성)에서 만든다. `/plan/` 산출물은 워크트리로 복사하지 않고 main repo 절대경로로 참조한다

---

## 사전 준비: 브랜치·워크트리 생성

이 단계 시작 시 작업 내용에 맞는 브랜치를 새로 생성하고, 워크트리도 함께 새로 만든다.

- 브랜치명: `feature/{짧은-설명}`
- base 브랜치는 [의존 — 판단거리 노출](../conventions/pr-split.md#의존--판단거리-노출)대로 정한다 — 판단거리는 `pr{N}/persistent/overview.md`의 「의존」이다.
- 워크트리는 `<레포>/.claude/worktrees/pr{N}`에 만들고, `EnterWorktree`에 그 경로를 줘 세션을 옮긴다.
- 브랜치를 딴 뒤 `node {{skill_dir}}/scripts/steps.mjs pr set`으로 이 PR의 브랜치와 base를 기록한다.

---

## 1. 잔여 산출물 소비

`/plan/pr{N}/` 하위와 `/plan/background/`를 탐색하여 기존 AI 산출물을 읽고, **stub 코드(결정·코드 표현 가능 영역)와 잔존 md(narrative)로 분배**하며 소비한다. 소비 후 원본 정리는 각 산출물의 라이프사이클 폴더 규칙을 따른다 ([라이프사이클 규칙](../conventions/plan-folder.md#라이프사이클-규칙)).

페이지 마크업·공통 지정 컴포넌트를 stub에서 어떻게 다루는지는 [마크업 예외](../conventions/artifact/stub.md#마크업-예외)를 따른다.
realize-plan은 디자인 원본([modes.md](../conventions/modes.md) 매트릭스)을 본 PR의 로직·조립 구조 참조에만 쓴다.
figma 자료는 [피그마 URL·캡처 캐싱](../conventions/plan-folder.md#피그마-url캡처-캐싱)대로 `background/retained/figma/`에 누적한다.

---

## 2. 구현 컨텍스트 수집

착수 전에 구현 컨텍스트를 수집한다.

[과제 정의 단계의 컨벤션 사전 참조](plan.md#컨벤션-사전-참조)에서 파악한 컨벤션과 reference.md에 없는 것만 사용자에게 질문해 수집한다:
- 관련 컨벤션 경로
- 참조할 기존 코드 경로 (유사 구현, 재사용할 컴포넌트 등)
- 디자인 토큰 / 디자인시스템 경로 (피그마 연동 시)

### 코딩 스탠다드 · 베스트프랙티스

coding-standards·MP 베스트프랙티스는 reference.md에 모인 것을 쓴다.
매칭되는 MP 베스트프랙티스가 없으면 따를 패턴을 사용자에게 묻는다. stub과의 분담은 [reference-curation.md](../conventions/artifact/reference-curation.md#stub과의-분담) 참조.

### 배치·네이밍은 컨벤션 본문으로 정한다

stub 폴더 구조·파일 배치·네이밍·import 경로는 프로젝트 컨벤션 문서(reference.md에 모은 경로) 본문을 확인하고 정한다 — 앞 PR에서 본 패턴이나 기억으로 정하지 않는다. 확인한 근거를 stub 상단 출처 블록에 인용하는지는 모드로 갈린다 — [적용 대상](../conventions/artifact/comments.md#적용-대상).

### 기존 린트·포맷·타입/coding-standards 오류 확인 (채용과제)

채용과제에서 앞단의 SETUP 종류 PR은 다른 PR 범위 파일의 오류를 격리해 넘기고, 격리한 파일과 해제할 일을 그 파일을 맡은 PR(지금 realize-plan을 도는 이 PR)의 TODO에 남긴다. 아래 점검은 그 격리를 작업 트리에서만 잠시 걷어 내고 돌린다.
이 PR의 overview.md 「범위」와 `## TODO`에 적힌 파일을 기준으로, 해당 파일에 기존 린트·포맷·타입/coding-standards 오류가 남아있는지 점검한다.
오류가 있으면 `implementation.md`에 포함하여, 해당 파일의 기능 변경 커밋보다 앞에 위반 정리 커밋을 별도로 배치하도록 계획한다.

---

## 3. 파생 산출물

| 산출물 | 위치 | 형태 | 작성 조건 |
|--------|------|------|---------|
| stub 파일들 — 로직·조립 `.tsx`, hook, `*.test.tsx`, fixture, types 등 | 소스 디렉토리 | [정의·범위](../conventions/artifact/stub.md#정의범위)의 두 원칙대로 | stub 대상이 있으면 |
| `implementation.md` | `pr{N}/retained/` | 구현 계획 ([conventions/artifact/implementation-spec.md](../conventions/artifact/implementation-spec.md) 단일 출처) | 항상 |

interface narrative가 필요하면 stub 파일의 JSDoc에 적는다.

---

## 4. realize-plan 커밋

### 코드로 옮길 것과 IMPL로 넘길 것

무엇을 stub으로 만드는지는 stub.md의 [정의·범위](../conventions/artifact/stub.md#정의범위)를 따른다. md 산출물에는 코드로 표현 못 하는 것만 남긴다 — implementation.md에 무엇을 담는지는 implementation-spec.md의 [책임·위치](../conventions/artifact/implementation-spec.md#책임위치)를 따른다.

이미 있는 코드를 고치는 편집(rename·이동·설정 치환)도 md에 옮겨 적지 않고 그 자리에서 실행·커밋한다.

### stub 커밋 작성

stub이 있으면 모두 하나의 커밋으로 묶어 이 단계의 마지막 커밋으로 두고(stub이 없는 PR은 이 커밋을 만들지 않는다), 커밋 전에 lint·tsc·테스트가 통과하는지 확인한다 — 의존 PR이 이 커밋에서 출발한다.
종료 시퀀스에서 stub을 고치면 이 커밋을 고쳐 하나로 둔다. 포맷터는 본 PR 파일 경로를 인자로 줘 돌린다 — 프로젝트 전역 포맷팅은 하지 않는다.

---

## 종료 시퀀스

산출물을 다 작성하면 아래 단계를 **순서대로 모두** 수행한다.
마친 뒤 stub 커밋(있으면)과 implementation.md를 사용자에게 보여 승인받는다. stub에 남은 [`TODO [USER_REVIEW]`](../conventions/artifact/comments.md#구현-전-미검토-todo-검사)도 이때 사용자가 검토해 지운다. 승인 과정에서 둘 중 하나라도 고치면 아래 단계를 다시 돌고 다시 승인받는다. 승인받은 뒤에 후속 안내를 낸다.

### 1. 산출물 리뷰

리뷰어 서브에이전트에게 산출물이 결정·의도·컨벤션과 맞고 서로 어긋나지 않는지 리뷰를 맡긴다.
`pr{N}/persistent/`의 overview.md·decisions.md·reference.md, `pr{N}/retained/implementation.md`, 모드, realize-plan 커밋 범위를 넘기고 아래를 짚어 준다. 지적마다 어느 기준에서 나왔는지와 `파일:줄`·원문 인용을 붙여 돌려받는다.

- [stub.md](../conventions/artifact/stub.md)·[comments.md](../conventions/artifact/comments.md) 양식도 기준이다. reference.md가 reference-curation.md의 [포함 항목](../conventions/artifact/reference-curation.md#포함-항목)대로 쌓였는지도 본다
- 코드로 표현할 수 있는 것이 md 산문에 들어간 곳, stub 대상인데 stub이 통째 빠진 곳을 찾는다. implementation.md는 implementation-spec.md의 [책임·위치](../conventions/artifact/implementation-spec.md#책임위치)가 담으라고 한 것이면 지적하지 않는다
- 채용과제면 평가자 시선으로 감점 요인과, 과잉 설계가 아닌 가점 요인을 낸다

리뷰 결과와 그에 따라 고친 것을 사용자에게 보고한다.

### 2. `it.todo` 매칭 점검 (PLAN 시점)

산출물 리뷰와 별개로 매번 직접 수행한다. [`it.todo` 매칭 점검](../conventions/artifact/implementation-spec.md#ittodo-매칭-점검)의 **PLAN 시점 매칭**을 적용하고, 그 절의 `todo-coverage`가 통과해야 종료한다. 통과한 커버리지 표를 사용자에게 보인다.
