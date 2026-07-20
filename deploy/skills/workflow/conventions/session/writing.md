# WRITING 세션 — PR 본문 작성 (WRITING_IDEATOR / WRITING_REFINER)

이 세션은 **step 번호가 없는 상시 세션**이다 (MARKUP·FINALIZE와 동일 성격). PR별 세션이 아니라 PR 1~N 본문을 IDEATOR→REFINER 2단계로 연속 작성한다. 진입 트리거·후속 안내는 SKILL.md 「세션」 표 + 「세션 spawn 안내 메커니즘」이 단일 소스다.

## cwd — 코드 워크트리 무관

`/plan/`은 글로벌 gitignore라 main repo 한 곳에 있고 워크트리는 절대경로로 참조한다(`steps/step-4.md`의 gitignore 규칙). WRITING은 코드 워크트리가 필요 없고 main repo의 공유 `/plan/`만 읽고 쓴다.

REFINER가 커밋 로그를 읽을 때 pr{N}→워크트리→브랜치명은 `git worktree list` + FOUNDATION 명명규칙으로 유도한다. **실무·개인 모드는 FOUNDATION이 없으므로** `git worktree list`가 워크트리→브랜치를 직접 매핑하는 것으로 조회한다.

## 장기세션 재사용

WRITING_IDEATOR·WRITING_REFINER는 PR마다 새로 열 필요 없이 각각 장기세션 하나로 유지하며 여러 PR을 이어 처리할 수 있다(컨텍스트가 커지면 `/compact`).

단, **최초 진입은 반드시 `/workflow WRITING_IDEATOR <모드>` / `/workflow WRITING_REFINER <모드>`로 한다.** 이 문서(consumable 정리 등)가 세션에 로드되려면 최초 한 번은 이 문서를 거쳐야 한다. 최초 진입을 `/write-refine <path>` 직접 호출로 하면 이 문서가 그 세션에 전혀 로드되지 않아 정리가 누락된다(write-refine 스킬은 `/plan/`·consumable 구조를 모르는 범용 글쓰기 스킬).

최초 진입 이후 같은 세션 안에서 개별 PR은 `/write-refine <path>`만 반복 호출해도 된다 — 이미 로드된 이 문서의 지시를 따르면 된다.

## WRITING_IDEATOR — 초안 (각 PR step-3 종료 후)

계획만으로 쓸 수 있는 PR 본문의 배경·문제·접근·근거를 미리 초안한다. 상세 코드블록·실제 커밋 목록은 REFINER 몫이다.

### 입력

- `pr{N}/persistent/overview.md` — 목표·범위·열려있는 질문. **읽기만 한다** — persistent라 어느 소비처도 삭제하지 않는다.
- `pr{N}/persistent/decisions.md` — step-3 초기본. 토론이 없었으면 부재할 수 있다.
- `pr{N}/persistent/reference.md` — 외부 자료 링크 + 컨벤션 경로 인덱스.

(`project.md`의 해당 PR 절은 step-3 진행 중 overview로 소비·삭제되므로 IDEATOR 발동 시점엔 이미 없다. IDEATOR 입력이 아니다.)

### 절차

`/plan/`에 이전 PR의 pr-body.md가 있으면 읽고 섹션 구조·서술 패턴을 맞춘다. `/write-init pr-body`로 `pr{N}/consumable/pr-body.md` **초안**을 생성한다. overview·decisions·reference를 컨텍스트로 전달하되, 특정 파일명을 하드코딩하지 않고 `/plan/pr{N}/`을 탐색하여 존재하는 산출물을 동적으로 참조한다.

초안 단계이므로 consumable 소비(삭제)는 하지 않는다. overview는 persistent라 읽기만 하고, pr-body 초안은 **잠정**이다 (REFINER가 실제 커밋·구현 반영으로 확정).

#### 채용 모드 — 완성본 라이브러리 복사 기점

채용 모드이면 write-init 호출 전에 이 PR의 성격으로 주제를 식별하고, [../../recruitment/pr-body/](../../recruitment/pr-body/)를 글롭해 매칭되는 완성본(그 주제의 미리 써둔 PR 본문)이 있으면 그 파일을 복사 기점으로 삼아 이번에 안 한 항목·섹션을 빼고 과제 고유 값을 채운다. 매칭이 없으면 일반 write-init로 진행한다.

- 주제 식별은 PR 성격(세팅·인프라·공통 컴포넌트·리스트/상세/폼/인증 페이지·횡단 결정)으로 하는 **LLM 판단**이다. 스킬 본문에 주제 목록·파일명을 하드코딩하지 않는다 — 실제 대상은 폴더 글롭 결과다.
- 폴더가 비어 있거나 매칭 파일이 없으면 폴백(일반 write-init)이므로, 완성본이 아직 없는 주제여도 배선은 그대로 동작한다.

## WRITING_REFINER — 확정 (각 PR step-6 종료 후)

구현·커밋이 완료된 뒤 IDEATOR 초안을 실제 산출물과 정합시켜 확정하고, consumable을 정리한다.

### 입력

- WRITING_IDEATOR 입력(overview·decisions·reference) +
- `pr{N}/persistent/implementation.md`
- 커밋 로그 (브랜치 유도는 위 「cwd」)
- `decisions.md`의 step-6.6 갱신분
- `pr{N}/consumable/` 잔여 산출물

### fallback — pr-body 초안 부재 시 (IDEATOR 역할 흡수)

IDEATOR spawn은 사용자 재량이라, 사용자가 IDEATOR를 건너뛰고 REFINER로 바로 올 수 있다. 그 경우 다듬을 pr-body 초안이 없어 빈손이 되므로, **`/write-init pr-body`를 먼저 호출해 초안을 만든 뒤(IDEATOR 역할 흡수) refine한다.** (IDEATOR-skip 경로에서도 overview는 persistent라 그대로 살아 있어 write-init 입력으로 유효하다.)

### 절차

사용자가 새 세션에서 `/write-refine <pr-body 경로>`를 호출해 톤·구조·분량을 다듬고, 실제 커밋 목록·변경 요약·Test plan·코드블록을 채워 확정한다. `pr{N}/consumable/` 하위 동작 테스트 산출물은 Test plan으로 재활용한다.

### 산출물 정리

확정된 `pr-body.md`를 PR 본문으로 복사·게시한 뒤 삭제한다(다른 산출물로 이관·녹이는 「소비」가 아니라 REFINER 자신의 저작물을 게시 후 정리하는 것). 이어서 `/plan/pr{N}/consumable/`의 각 산출물 절을 PR 본문 및 코드와 대조하여 **소비**한다 (대조 절차는 SKILL.md 「자가 검토 필수」 일반 규칙). **overview.md는 persistent라 소비 대상이 아니다** — REFINER는 pr-body 큐레이션에 읽기만 하고 삭제하지 않는다. consumable 소비 후 정리는 큐 모델을 따른다 ([../plan-folder.md](../plan-folder.md) 「소비→삭제 메커니즘 SSOT」).

- **`/plan/pr{N}/persistent/` 하위는 정리 대상에서 제외** — 영구 보존 자료. 대조도 수행하지 않는다.

대조 자체는 수행하되, 사용자에게는 소비·유지 파일 목록(유지 시 한 줄 사유)만 보고한다. 내용 매핑을 항목별로 줄줄이 노출하지 않는다.

## 전역 최종화·머지는 FINALIZE 담당

메시지 최종화·오배치 커밋 재배치·머지 안내는 WRITING이 아니라 **전 PR IMPL 완료 후 FINALIZE 세션**에서 1회 수행한다 ([finalize.md](finalize.md)). WRITING은 본 PR 하나로 스코프가 닫힌 per-PR 작업(PR 본문 + consumable 정리)이라 cross-PR·전역 조작을 담지 않는다. WRITING은 per-PR·유연 타이밍이라 IMPL 직후 써도, 나중에 몰아서 써도 된다.
