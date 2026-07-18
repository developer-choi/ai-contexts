# Step 7: PR 본문 작성

## 준비

`/plan/`에서 이전 PR의 pr-body.md가 있으면 읽고, 섹션 구조·서술 패턴을 맞춘다.

## PR 본문 작성 (`/plan/pr{N}/consumable/pr-body.md`)

`/write-init pr-body` 스킬로 PR 본문을 작성한다. 작업 컨텍스트로 `/plan/pr{N}/` 하위의 모든 산출물과 커밋 로그를 전달한다. 특정 파일명(overview.md 등)을 하드코딩하지 않고, `/plan/pr{N}/`을 탐색하여 존재하는 산출물을 동적으로 참조한다.

### 채용 모드 — 완성본 라이브러리 복사 기점

채용 모드이면 write-init 호출 전에 이 PR의 성격으로 주제를 식별하고, [recruitment/pr-body/](../recruitment/pr-body/)를 글롭해 매칭되는 완성본(그 주제의 미리 써둔 PR 본문)이 있으면 그 파일을 복사 기점으로 삼아 이번에 안 한 항목·섹션을 빼고 과제 고유 값을 채운다. 매칭이 없으면 일반 write-init로 진행한다.

- 주제 식별은 PR 성격(세팅·인프라·공통 컴포넌트·리스트/상세/폼/인증 페이지·횡단 결정)으로 하는 **LLM 판단**이다. 스킬 본문에 주제 목록·파일명을 하드코딩하지 않는다 — 실제 대상은 폴더 글롭 결과다.
- 폴더가 비어 있거나 매칭 파일이 없으면 폴백(일반 write-init)이므로, 완성본이 아직 없는 주제여도 배선은 그대로 동작한다.

write-init이 패키지 파일을 생성한 후, 사용자가 새 세션에서 `/write-refine <패키지 경로>` 호출해서 톤·구조·분량을 다듬는다.

## 산출물 정리

PR 본문 작성이 완료되면, `/plan/pr{N}/consumable/`의 각 산출물 절을 PR 본문 및 코드와 대조하여 **PR 본문/코드로 소비**한다 (대조 절차는 SKILL.md 「자가 검토 필수」 일반 규칙). 소비 후 정리는 consumable 큐 모델을 따른다 ([conventions/plan-folder.md](../conventions/plan-folder.md) 「소비→삭제 메커니즘 SSOT」).

- **`/plan/pr{N}/persistent/` 하위는 정리 대상에서 제외** — 영구 보존 자료. 대조도 수행하지 않는다.

대조 자체는 수행하되, 사용자에게는 소비·유지 파일 목록(유지 시 한 줄 사유)만 보고한다. 내용 매핑을 항목별로 줄줄이 노출하지 않는다.

## 스택 전역 최종화·머지는 FINALIZE 담당

메시지 최종화·오배치 커밋 재배치·머지 안내는 step-7이 아니라 **스택 전체 IMPL 완료 후 FINALIZE 세션**에서 1회 수행한다 ([conventions/session/finalize.md](../conventions/session/finalize.md)). step-7은 본 PR 하나로 스코프가 닫힌 per-PR 세션(PR 본문 + consumable 정리)이라 cross-PR·스택 전역 조작을 담지 않는다. WRITING은 per-PR·유연 타이밍이라 IMPL 직후 써도, 나중에 몰아서 써도 된다.
