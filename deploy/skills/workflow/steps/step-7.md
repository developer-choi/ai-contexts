# Step 7: PR 본문 작성

## 준비

`/plan/`에서 이전 PR의 pr-body.md가 있으면 읽고, 섹션 구조·서술 패턴을 맞춘다.

## PR 본문 작성 (`/plan/pr{N}/consumable/pr-body.md`)

`/write-init pr-body` 스킬로 PR 본문을 작성한다. 작업 컨텍스트로 `/plan/pr{N}/` 하위의 모든 산출물과 커밋 로그를 전달한다. 특정 파일명(overview.md 등)을 하드코딩하지 않고, `/plan/pr{N}/`을 탐색하여 존재하는 산출물을 동적으로 참조한다.

write-init이 패키지 파일을 생성한 후, 사용자가 새 세션에서 `/write-refine <패키지 경로>` 호출해서 톤·구조·분량을 다듬는다.

## 산출물 정리

PR 본문 작성이 완료되면, `/plan/pr{N}/` 하위의 각 산출물을 PR 본문 및 코드와 대조한다 (대조 절차는 SKILL.md 「자가 검토 필수」 일반 규칙).

- 산출물의 모든 내용이 PR 본문 또는 코드에 반영된 경우: 해당 파일 삭제
- 아직 반영되지 않은 판단·결정 내용이 남아 있는 경우: 해당 파일 유지
- **`/plan/pr{N}/persistent/` 하위는 정리 대상에서 제외** — 영구 보존 자료. 대조도 수행하지 않는다.

대조 자체는 수행하되, 사용자에게는 삭제·유지 파일 목록(유지 시 한 줄 사유)만 보고한 뒤 삭제한다. 내용 매핑을 항목별로 줄줄이 노출하지 않는다.

## 스택 전역 최종화·머지는 FINALIZE 담당

`[PR{N}]` 접두사 일괄 제거·오배치 커밋 재배치·머지 안내는 step-7이 아니라 **스택 전체 IMPL 완료 후 FINALIZE 세션**에서 1회 수행한다 ([conventions/session/finalize.md](../conventions/session/finalize.md)). step-7은 본 PR 하나로 스코프가 닫힌 per-PR 세션(PR 본문 + consumable 정리)이라 cross-PR·스택 전역 조작을 담지 않는다. WRITING은 per-PR·유연 타이밍이라 IMPL 직후 써도, 나중에 몰아서 써도 된다.
