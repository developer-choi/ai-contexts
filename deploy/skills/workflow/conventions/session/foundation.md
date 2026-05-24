# FOUNDATION (채용 한정)

채용 과제 환경 셋업 + PR1 input 준비. MARKUP을 띄울 최소 환경 + PR1 작업의 사전 조건 두 커밋을 만든다. PR1 작업 자체는 PR_1_PLAN/IMPL/WRITING이 정상 처리.

## 진입 조건

- BG.step-1.1 완료 (채용 원본 자료가 `background/persistent/`에 저장됨)
- 모드 = 채용

## 5단계

| 단계 | 내용 | cwd |
|---|---|---|
| **0** | PR1 브랜치·워크트리 생성 | 메인 워크트리 |
| **1** | 폴더 마이그레이션 + 커밋 1 + `background/retained/folder-structure.md` 작성 (디렉토리 골격 + 폴더 마이그레이션 항목) | PR1 워크트리 |
| **2** | 코딩 스탠다드 마이그레이션 + 커밋 2 — `/code-review --mode only-standards` 호출 → coding-standards 이슈만 받아 기존 코드 수정 | PR1 워크트리 |
| **3** | markup 워크트리 분기 + 최소 셋팅 (vite/next + scss/tailwind 마크업 가능 최소만, PR 안 감) | 메인 워크트리 → markup 워크트리 |
| **4** | `background/consumable/project.md` PR1 섹션 갱신 (파일 없으면 빈 파일 생성 후 박기) + FOUNDATION 종료 | 메인 워크트리 |

**folder-structure.md 결정 기준**: BG.step-1.1 자료 (채용 요구사항 — 특히 폴더 경로 관련 언급) + MP의 디렉토리 가이드(DDD 등). 항상 DDD 아님.

**코딩 스탠다드 마이그레이션 근거**: 기존 코드(보일러플레이트) 위에 새 코드 얹는 시나리오. AI는 기존 커밋 메시지·기존 코드를 보고 새 코드를 작성하므로, 기존 코드가 새 코딩 스탠다드와 불일치하면 새 코드도 일관성 깨짐.

**단계 4 project.md PR1 섹션 내용** (what만, how는 미정의):
> FOUNDATION이 PR1 브랜치·워크트리 생성 + 두 커밋 작성 (폴더 마이그레이션 + 코딩 스탠다드 마이그레이션) 완료. PR_1_PLAN은 PR1 워크트리에서 시작.

## 세션 간 소통 창구

project.md PR1 섹션을 소통 창구로 사용. PR_1_PLAN이 시작 시 project.md 읽고 지시문 인식 → FOUNDATION이 만든 PR1 워크트리로 이동해서 진행. project.md에는 "PR1 워크트리에서 시작" 추상 표현만, 워크트리 경로는 명명 컨벤션으로 추론.

## 워크트리 명명

- **PR 워크트리**: `{메인 디렉토리}-pr{N}` (예: `ai-contexts-pr1`)
- **그 외 목적**: `{메인 디렉토리}-{purpose}` (예: `ai-contexts-markup`, `ai-contexts-backlog`)

AI는 `git worktree list`로 메인 디렉토리 이름을 알아내 패턴 적용.

## brand-new clone 케이스

두 커밋이 없으므로 PR_1_PLAN이 폴더 마이그레이션·코딩 스탠다드 마이그레이션을 다시 수행.

## vite·scss 위치 (모드별)

- **FOUNDATION markup 워크트리 (채용만)**: 최소 셋팅 (vite/next + scss/tailwind 마크업 가능 최소만, PR 안 감)
- **PR_1_IMPL.step-5 (채용만)**: PR1 진행으로 정식 구축 (린트·포맷·tsconfig·vite/next + scss/tailwind, FOUNDATION 두 커밋 위에 셋팅 커밋)
- **실무**: 기존 정식 환경 그대로. FOUNDATION 자체 없음

MARKUP은 모드 무관 동일 동작 — 마크업 코드 → markup 워크트리 PR 안 감 → PR_{N}_IMPL이 페이지 단위로 코드 가져감. 차이는 시작 환경뿐.
