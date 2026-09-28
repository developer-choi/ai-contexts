---
step: pr-body-draft
session: WRITING_IDEATOR
scope: project
entry: PR_{N}_PLAN의 plan 종료 (초안 트리거)
model: Opus
next: []
---

# pr-body-draft: PR 본문 초안

이 세션은 **step 번호가 없는 상시 세션**이다. PR별 세션이 아니라 PR 1~N 본문 초안을 이어 쓴다(확정은 WRITING_REFINER). 진입 트리거·후속 안내는 SKILL.md 「세션」 표 + 「세션 spawn 안내 메커니즘」이 단일 소스다.

계획만으로 쓸 수 있는 PR 본문의 배경·문제·접근·근거를 미리 초안한다. 상세 코드블록은 REFINER 몫이다.

## 입력·산출물·작업 위치

- **입력**:
  - `pr{N}/persistent/overview.md` — 목표·범위·열려있는 질문. **읽기만 한다**. 「열려있는 질문」은 초안의 "Known issues / Follow-up" 절에 반영한다.
  - `pr{N}/persistent/decisions.md` — plan 초기본. 토론이 없었으면 부재할 수 있다.
  - `pr{N}/persistent/reference.md` — 외부 자료 링크 + 컨벤션 경로 인덱스.
  - `/plan/background/consumable/todo.md` — 아래 「PR 착수 시 todo.md 판정」 대상. 이 PR 절은 plan에서 overview로 소비돼 없을 수 있다.
- **산출물**: `pr{N}/consumable/pr-body.md` **초안** (배경·문제·접근·근거; 상세 코드블록 제외)
- **작업 위치**: main repo `/plan/` — 코드 워크트리 무관 (아래 「cwd」)

## cwd — 코드 워크트리 무관

WRITING은 코드 워크트리가 필요 없고 main repo의 공유 `/plan/`만 읽고 쓴다(`steps/realize-plan.md`의 gitignore 규칙).

## 장기세션 재사용

WRITING_IDEATOR·WRITING_REFINER는 PR마다 새로 열 필요 없이 각각 장기세션 하나로 유지하며 여러 PR을 이어 처리할 수 있다(컨텍스트가 커지면 `/compact`).

단, **최초 진입은 반드시 `/workflow WRITING_IDEATOR <모드>` / `/workflow WRITING_REFINER <모드>`로 한다.** `/write-refine <path>` 직접 호출로 시작하지 않는다.

최초 진입 이후 같은 세션 안에서 개별 PR은 `/write-refine <path>`만 반복 호출해도 된다. 아래 「PR 착수 시 todo.md 판정」은 PR마다 다시 거친다.

## PR 착수 시 todo.md 판정

PR 하나의 본문 작업을 시작할 때마다, 그 PR의 첫 `/write-init`·`/write-refine`을 부르기 전에 `/plan/background/consumable/todo.md`를 처음부터 끝까지 훑는다.

- TODO 하위 절만 보지 않는다. 미분류 절, 다른 PR 절, 그 밖의 절에도 이 PR 본문이나 README로 갈 항목이 있다
- 항목마다 이번 PR 몫인지 가르고, 몫이면 어느 산출물로 갈지(이 PR 본문의 어느 절 / README 재료)까지 정한다
- 판정 결과를 사용자에게 보고하고 확인받은 뒤 쓰기 시작한다. 몫인 항목이 없으면 없다고 보고한다

## 절차

아래 「초안 만들기」대로 `pr{N}/consumable/pr-body.md` **초안**을 만든다.

consumable 소비(삭제)는 하지 않는다. pr-body 초안은 **잠정**이다 (REFINER가 실제 커밋·구현 반영으로 확정).

### 초안 만들기

write-init을 부르기 전에 아래 준비를 먼저 끝낸다. 해당하는 것이 없으면 없다고 말하고 넘어간다.

- **이전 PR 본문** — 이전 PR의 본문을 읽고 섹션 구조·서술 패턴을 맞춘다. `/plan/`에 pr-body.md가 남아 있으면 그것을, 게시 후 지워졌으면 GitHub에 게시된 PR 본문을 읽는다.
- **채용 모드 — 완성본 라이브러리 복사 기점** — 채용 모드이면 이 PR의 성격으로 주제를 식별하고, [../recruitment/pr-body/](../recruitment/pr-body/)를 글롭해 매칭되는 완성본(그 주제의 미리 써둔 PR 본문)이 있으면 그 파일을 복사 기점으로 삼아 이번에 안 한 항목·섹션을 빼고 과제 고유 값을 채운다. 매칭이 없으면 일반 write-init로 진행한다.
  - 주제 식별은 PR 성격(세팅·인프라·공통 컴포넌트·리스트/상세/폼/인증 페이지·횡단 결정)으로 하는 **LLM 판단**이다. 스킬 본문에 주제 목록·파일명을 하드코딩하지 않는다

그다음 `/write-init pr-body`로 초안을 생성한다. overview·decisions·reference를 컨텍스트로 전달하되, 특정 파일명을 하드코딩하지 않고 `/plan/pr{N}/`을 탐색하여 존재하는 산출물을 동적으로 참조한다.
