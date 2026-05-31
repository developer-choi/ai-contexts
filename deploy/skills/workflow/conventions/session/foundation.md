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
| **3** | markup 워크트리 분기 + 최소 셋팅 (vite/next + scss/tailwind 마크업 가능 최소만, PR 안 감) + 루트 layout 폰트 셋업 | 메인 워크트리 → markup 워크트리 |
| **4** | `background/consumable/project.md` PR1 섹션 갱신 (파일 없으면 빈 파일 생성 후 박기) + FOUNDATION 종료 | 메인 워크트리 |

**folder-structure.md 결정 기준**: 폴더 구조는 사용자 확인 전에 임의로 정해 스캐폴딩하지 않는다 — 항상 사용자에게 확인받는다. BG.step-1.1 자료(요구사항·우대사항)로 추천은 곁들이되(채용공고 우대사항의 FSD 등은 지원자에게 바라는 역량이지 이 과제를 그 구조로 구현하라는 지시가 아니다), FSD든 DDD든 사용자 확정 없이 진행하지 않는다. 사용자가 이미 구조를 지정했으면 재질문하지 않는다. DDD로 지정되면 트리 작성 전 MP `monorepo-playground/docs/patterns/folder-structure/FolderStructure.md`를 읽고 그 패턴(디렉토리 골격·네이밍·배럴 유무)을 따른다.

**루트 layout 폰트 셋업 기준** (채용 한정): 폰트는 루트 layout에 박는 셋업 사항이므로 폴더·코딩스탠다드 셋팅과 같은 결로 FOUNDATION이 확정한다. 시안에 지정 폰트가 있으면 그 폰트로, 없으면 `Noto Sans KR`을 기본값으로 둔다 — folder-structure와 같이 사용자 확인 후 확정한다. 시안 정독을 기다리지 않는다: 폰트가 든 루트 layout은 페이지 마크업이 아니라 프로젝트 베이스이고, markup 워크트리 코드는 PR 단위로 늦게 흡수되므로 결정을 뒤로 미루면 베이스 셋업이 붕 뜬다.

**코딩 스탠다드 마이그레이션 근거**: 기존 코드(보일러플레이트) 위에 새 코드 얹는 시나리오. AI는 기존 커밋 메시지·기존 코드를 보고 새 코드를 작성하므로, 기존 코드가 새 코딩 스탠다드와 불일치하면 새 코드도 일관성 깨짐.

**단계 4 project.md PR1 섹션 내용** (what만, how는 미정의):
> FOUNDATION이 PR1 워크트리에 베이스 두 커밋(폴더 마이그레이션 + 코딩 스탠다드 마이그레이션)을 작성했다. **PR1의 본격 작업(빌드·린트·포맷·tsconfig 등 static checking 도구 설정)은 PR_1_PLAN/IMPL/WRITING이 PR1 워크트리에서 정상 도미노로 수행한다.** PR1 = FOUNDATION이 아니다 — FOUNDATION은 베이스 셋팅만 제공.

**금지 표현**: PR1 섹션·후속 산출물에서 "PR1 = FOUNDATION", "담당: FOUNDATION", "FOUNDATION이 PR1 수행/완료" 같은 단정 표현 금지. FOUNDATION이 끝낸 것은 "베이스 두 커밋"이지 "PR1"이 아니다.

## 세션 간 소통 창구

project.md PR1 섹션을 소통 창구로 사용. PR_1_PLAN이 시작 시 project.md 읽고 지시문 인식 → FOUNDATION이 만든 PR1 워크트리로 이동해서 진행. project.md에는 "PR1 워크트리에서 시작" 추상 표현만, 워크트리 경로는 명명 컨벤션으로 추론.

## 워크트리 명명

- **PR 워크트리**: `{메인 디렉토리}-pr{N}` (예: `ai-contexts-pr1`)
- **그 외 목적**: `{메인 디렉토리}-{purpose}` (예: `ai-contexts-markup`, `ai-contexts-backlog`)

AI는 `git worktree list`로 메인 디렉토리 이름을 알아내 패턴 적용.

## brand-new clone 케이스

두 커밋이 없으므로 PR_1_PLAN이 폴더 마이그레이션·코딩 스탠다드 마이그레이션을 다시 수행.

## PR1 정식 구축 항목 (모드별)

- **FOUNDATION markup 워크트리 (채용만)**: 최소 셋팅 (vite/next + scss/tailwind 마크업 가능 최소만, PR 안 감)
- **PR_1_IMPL.step-5 (채용만)**: PR1 진행으로 정식 구축. FOUNDATION 두 커밋 위에 셋팅 커밋. **항목 누락 방지를 위해 본 목록을 베이스로 후보 도출**:
  - 린트 (ESLint 룰·플러그인)
  - 포맷 (Prettier + ignore)
  - **커밋 컨벤션 강제** (commitlint + husky **commit-msg** hook)
  - **pre-commit hook** (husky + lint-staged)
  - tsconfig 강화
  - 빌드·스타일링 (vite/next + scss/tailwind)
  - 환경 일관성 (.editorconfig·.nvmrc 등)
- **실무**: 기존 정식 환경 그대로. FOUNDATION 자체 없음

**husky 도입 시 hook 종류 양쪽 모두 고려**: husky를 PR1 후보에 박는 순간 commit-msg(commitlint)와 pre-commit(lint-staged) hook 둘 다 같이 가는 것이 표준이다. 한쪽만 떠올리고 다른쪽을 빠뜨리지 않는다 — husky = pre-commit 단독 연상은 사고 패턴.

MARKUP은 모드 무관 동일 동작 — 마크업 코드 → markup 워크트리 PR 안 감 → PR_{N}_IMPL이 페이지 단위로 코드를 그대로 가져감. 차이는 시작 환경뿐.
