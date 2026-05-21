---
name: workflow
description: 기획서, 피그마, 피그마 디자인토큰, 버그, 채용과제를 PR로 변환하는 워크플로우. 배경 파악 → PR 분할 → 구현 → 코드리뷰 → PR 작성까지 단계별 진행. 커밋, PR 작성, 코드리뷰 요청 시 반드시 이 스킬을 사용한다.
argument-hint: <세션 이름> <채용|실무>
---

# 워크플로우

## 호출

`/workflow <세션 이름> <모드>`

- 세션 이름 디폴트 `BG`. 모드 디폴트 없음 (사용자가 명시 전달 — 채용/실무 분기 영향이 크므로 디폴트 추론 위험).
- 세션 이름: `BG` / `FOUNDATION` / `MARKUP` / `PR_{N}_PLAN` / `PR_{N}_IMPL` / `PR_{N}_WRITING`
- 모드: `채용` / `실무`
- 호출 예: `/workflow BG 채용`, `/workflow MARKUP 실무`, `/workflow PR_2_PLAN 채용`

BG가 후속 세션 spawn 안내를 출력할 때 동일 모드 인자를 그대로 포함한다 (다음 세션 시작 시 사용자가 같은 모드 인자로 spawn). 모드 자동 감지(폴더 검사 등) 사용 X.

## 세션

워크플로우 6종 세션. 각 세션은 컨텍스트 격리.

| 세션 | (1) 진입 조건 | (2) 입력 컨텍스트 | (3) 출력 산출물 + 라이프사이클 폴더 | (4) 후속 트리거 | (5) 컨텍스트 처리 |
|---|---|---|---|---|---|
| **BG** | `/workflow BG <모드>` 호출 (유일 루트) | 사용자 제공 자료 (기획서·요구사항·채용 원본) | `background/persistent/`: 공고·메일·과제요구사항 (채용만) / `background/retained/`: tech-constraints.md / `background/consumable/`: project.md / `pr{N}/consumable/`: page.md (페이지별 분석) | step-1.1 후 → FOUNDATION (채용) 또는 MARKUP (실무), 동일 `<모드>` 인자 / step-2 후 → PR_1_PLAN, 동일 `<모드>` 인자 | 컨텍스트 격리. 세션 종료 시 산출물 자가 검토 |
| **FOUNDATION** (채용만) | `/workflow FOUNDATION 채용` + BG.step-1.1 완료 | BG `background/persistent/` (채용 원본) | `background/retained/folder-structure.md` (단계 1 산출) / PR1 워크트리에 두 커밋 (폴더 마이그·코딩 스탠다드 마이그) / `background/consumable/project.md` PR1 섹션 갱신 (자연어 지시 박음) / markup 워크트리 최소 셋팅 | 단계 4 종료 후 → MARKUP (`/workflow MARKUP 채용`) + PR_1_PLAN (`/workflow PR_1_PLAN 채용`) | 단계별 cwd 분기 (메인 / PR1 / markup 워크트리) |
| **MARKUP** | (채용) FOUNDATION 단계 4 종료 / (실무) BG.step-1.1 후, `/workflow MARKUP <모드>` 호출 | 사용자 figma·시안 자료 (페이지·섹션·위젯·컴포넌트 단위) | `background/retained/figma-url.md` (URL 누적) + `background/retained/figma/[meaningful-name].[이미지확장자]` (캡처 이미지) | 없음 (PR_{N}_IMPL이 페이지 단위 코드 가져감) | 마크업 워크트리. **포트 3000 점유** |
| **PR_{N}_PLAN** | (N=1, 채용) FOUNDATION 종료 + BG.step-2 / (N=1, 실무) BG.step-2 / (N≥2) BG.step-2 + (PR_{N-1}이 stub 만든 경우 PR_{N-1}.step-4 stub, 안 만든 경우 PR_{N-1} 머지) | `background/consumable/project.md` 해당 PR 섹션 + BG 산출물 + 이전 PR `persistent/` (decisions, reference, implementation) | `pr{N}/persistent/`: decisions.md, reference.md, **implementation.md** / `pr{N}/retained/`: markup.md (UI 컴포넌트 PR만) / `pr{N}/consumable/`: overview.md | step-4 stub 만든 경우 → PR_{N+1}_PLAN + PR_{N}_IMPL 동시 spawn / stub 안 만든 경우 → PR_{N}_IMPL만 spawn | PR_{N} 워크트리. 학습 인수인계 후 진입 대기 적용 |
| **PR_{N}_IMPL** | PR_{N}_PLAN.step-4 종료 (필수) + (페이지 코드 포함 PR이면) MARKUP의 해당 페이지 코드 (필수) + (PR_{N-1}이 stub 만든 경우) PR_{N-1} stub 시그니처 확정 (필수) | implementation.md, markup.md, MARKUP 페이지 코드, decisions·reference | 코드 변경 + 커밋 (stub 위에 본체 채움) / `pr{N}/consumable/`: review.md, user-test-cases.md | step-5 끝 후 → PR_{N}_WRITING | PR_{N} 워크트리. 본 PR 하나에 집중 |
| **PR_{N}_WRITING** | PR_{N}_IMPL.step-5 종료 | implementation.md + 커밋 로그 + decisions.md + reference.md + `pr{N}/consumable/` 잔여 산출물 | `pr{N}/consumable/pr-body.md` (작성 후 PR 본문 복사 → 폐기) / overview.md 폐기 / `pr{N}/persistent/`는 제외 (영구 보존) | step-7 끝 후 → PR_{N} 머지 안내 (추상 명령 — 사용자가 write-refine 후 게시·머지). 머지 후 PR_{N+1}_PLAN spawn 안내 (PR_{N}이 stub 안 만든 경우) | 구현 맥락 없이 파일 기반으로 PR 본문 작성 |

### 의존성 그래프

**채용:**

```
BG.step-1.1 ──→ FOUNDATION (단계 0~4)
                  └─ 단계 4 종료 ──→ MARKUP
                                  ──→ PR_1_PLAN (BG.step-2도 선행)

PR_{N}_PLAN.step-4 stub 만든 경우 ──┬─→ PR_{N+1}_PLAN (도미노)
                                    └─→ PR_{N}_IMPL ──(step-5 끝)──→ PR_{N}_WRITING ──(step-7)──→ PR_{N} 머지
PR_{N}_PLAN.step-4 stub 안 만든 경우 ──→ PR_{N}_IMPL ──→ PR_{N}_WRITING ──→ PR_{N} 머지 ──→ PR_{N+1}_PLAN

PR_{N}_IMPL은 MARKUP에서 페이지 단위 코드 가져옴.
```

**실무:**

```
BG.step-1.1 ──→ MARKUP
BG.step-2 ────→ PR_1_PLAN

PR 도미노(PR_{N}_PLAN → PR_{N}_IMPL → PR_{N}_WRITING)는 채용과 동일.
```

### 세션 spawn 안내 메커니즘

각 세션의 끝·분기점 step에서 위 「세션」 표를 참조해 후속 spawn 안내를 출력한다 (본문에 후속 세션 명단을 박지 말 것 — 표 갱신이 단일 소스).

종료 시 LLM 절차:
1. 표에서 자기 후속 명단 추출
2. 각 후속의 선행 분해 — 자기 선행·방금 끝낸 step은 ✓ (자기 spawn 사실로 충족 추론), 병렬 세션 종료 항목은 미충족 가능 단서로 표시
3. 후속별 spawn 가능 조건 안내 출력 (`/workflow <세션> <모드>` 인자 포함). 사용자가 단서 보고 spawn 판단

## 구조

- 각 step은 조건에 해당하는 **하위 스킬을 모두 로드**하는 오케스트레이터이거나, 그 자체가 실행 로직
- 해당 스킬이 여러 개이면 **순서대로 하나씩** 실행한다 (동시 로드 불가)
- 각 step의 **산출물이 다음 step의 입력** — step마다 "참고 자료"로 입력 산출물이 명시되어 있음
- 하위 스킬은 워크플로우 step 내에서만 호출된다 (독립 호출 없음)
- FOUNDATION·MARKUP은 step 파일 없이 본 SKILL.md 본문에 직접 정의 (각각 「FOUNDATION」·「MARKUP」 절)

## 시작 전 준비

- `template/context-setup.md` 양식으로 레포지토리 Context 수집
  - **실무 프로젝트**: 필수
  - **채용 과제 등**: 생략 가능

## /plan/ 폴더 구조

```
/plan/
  background/
    persistent/         ← PR·프로젝트 종료 후에도 보존. 회고·재참조 가치
      공고.md           ← 채용 원본 (채용만) — BG.step-1.1 산출
      메일.md           ← 채용 메일 (채용만)
      과제요구사항.md   ← 과제 요구사항 (채용만)
    retained/           ← 사용자 제공 원본 + 누적 캐시. BG 컨텍스트(= 프로젝트 전체) 유효한 동안 보존
      folder-structure.md ← FOUNDATION 단계 1 산출 (채용만). 디렉토리 구조 명세 (PR2~N 참조)
      tech-constraints.md ← BG.step-1 기술 제약 스캔 결과
      figma-url.md      ← MARKUP 산출. 대상 이름 + URL 누적
      figma/            ← MARKUP 캡처 이미지. `[meaningful-name].[이미지확장자]` 단위
    consumable/         ← AI 산출물·분류 모호 자료. 소비 시 즉시 폐기 (큐 모델)
      project.md        ← step-2 산출물 (BG.step-2). PR별 섹션을 각 PR의 step-3에서 overview로 이관 (절 단위 큐). FOUNDATION이 PR1 섹션에 자연어 지시 추가 (채용 한정)
  pr{N}/
    persistent/         ← PR 종료 후에도 영구 보존. 미래 다른 프로젝트·후속 PR의 참조 자료
      decisions.md      ← step-3 산출물 + step-6.6 갱신. 회사·프로젝트 컨텍스트 의존 결정의 흐름 보존
      reference.md      ← step-3·4 누적. 외부 자료 링크 + 회사·프로젝트 컨벤션·베스트프랙티스 경로 인덱스
      implementation.md ← step-4 산출물. 소비 = step-5·step-5.4·step-6.1·step-6.5·step-7 (PR body 작성 시 참조). PR·프로젝트 종료 후에도 보존 (사용자 명시 폐기까지). 커밋 정리 시점이 PR 머지 이후로 길 수 있어 보존
    retained/           ← PR 라이프타임 동안 보존. step-6.5(커밋 정리·재정렬) 진입 시 일괄 폐기
      markup.md         ← step-4 산출물 (조건부 — UI 컴포넌트 PR만). **Figma 원본 링크 인덱스(컴포넌트 종류별 × 상태별, 사용자 입력)** + 토큰 매핑표·매칭표 + IMPL 시점 Figma 확인 체크리스트. step-5 Implementer/Reviewer가 링크로 figma 직접 fetch (Reviewer 자기증명 루프 회피). 마지막 소비자는 step-6.3 사용자 코드 리뷰
    consumable/         ← 소비 시 즉시 폐기 (큐 모델 — 절 단위 소비 시 절 삭제, 비면 파일 삭제)
      overview.md       ← step-3 산출물
      page.md           ← step-1 requirement-review 페이지별 분석 결과. step-3 「잔여 산출물 소비」에서 분배
      review.md         ← step-6 리뷰 결과. step-6 자체 소비
      user-test-cases.md ← step-6.4 동작 테스트. step-7 PR 본문 Test plan으로 재활용
      pr-body.md        ← step-7 산출물. PR 본문으로 복사 후 폐기
```

라이프사이클 폴더 규칙:

- **`persistent/`** — 소비 후에도 안 지움, PR·프로젝트 종료 후에도 안 지움. 회사 컨텍스트 의존 결정·컨벤션 인덱스 등 미래 비교 자료. **또는 보존 기간이 PR 라이프타임을 넘어야 하는 구현 인수인계 산출물(`implementation.md`). 이 구현 인수인계 산출물에 한해 사용자 명시 폐기 허용** (PR 라이프타임 후 더 이상 필요 없다고 판단되면 정리 발화 시 폐기). decisions.md·reference.md는 본래 영구성 정신 유지 — 사용자 명시 폐기 예외 적용 X.
- **`retained/`** — 소비 후에도 안 지움, 컨텍스트(BG는 BG 라이프타임, PR은 PR 라이프타임) 종료 시 폐기. 마지막 소비자가 보고 나면 정리.
- **`consumable/`** — 소비 시 즉시 폐기. 절 단위 큐 모델 — 사용처가 소비한 절을 삭제, 모든 절이 비면 파일 삭제.

`persistent/`·`retained/` 하위는 step-7 「산출물 정리」의 무조건 삭제 대상이 아니다.

#### consumable/ 산출물 자가 정리 안내문

`consumable/` 하위 산출물은 상단에 다음 양식의 자가 정리 안내문을 박는다. 메인이 본문 룰을 따로 떠올리지 않아도 산출물 자체가 자기 정리 책임을 알린다.

```markdown
> 이 파일은 큐 모델로 운영됩니다.
> 각 절을 **소비**한 step은 그 절을 즉시 삭제합니다.
> 모든 절이 비면 파일째 삭제합니다.
>
> **소비** = 그 절의 내용을 다른 산출물(overview·stub·PR 본문·코드 등)로 이관·녹임
> **단순 읽기·참조 조회는 소비 아님** — 사용자 질문 응답을 위해 잠시 본 케이스 등은 삭제 금지
```

산출물별 소비 step 목록은 산출물 헤더(step-3·step-4 등)에 명시되어 있으므로, 자가 안내문에는 일반 큐 룰만 박는다.

step-4의 stub 코드는 `/plan/` 하위가 아닌 **소스 디렉토리(`src/...`) 하위**에 실제 파일로 생성된다.

### 피그마 URL·캡처 캐싱

사용자가 피그마 URL을 제공하면, 그 URL이 어느 페이지·프레임·컴포넌트를 가리키는지 확인한 뒤(함께 말하지 않았으면 묻는다) `plan/background/retained/figma-url.md`에 누적 기록한다.

- 기록 형식: 대상 이름 + URL
- 파일이 없으면 새로 만든다
- 같은 대상의 피그마가 다시 필요할 때는 figma-url.md에서 조회 — 사용자에게 URL을 재요청하지 않는다

캡처 이미지는 `plan/background/retained/figma/[meaningful-name].[이미지확장자]`에 저장 (MARKUP 세션에서 누적). 페이지·섹션·위젯·컴포넌트 어느 단위 캡처든 같은 폴더에.

step-1(전체 페이지 URL) ~ step-5(컴포넌트·프레임 URL) 어느 시점에 받든 동일하게 적용한다.

## FOUNDATION (채용 한정)

채용 과제 환경 셋업 + PR1 input 준비. MARKUP을 띄울 최소 환경 + PR1 작업의 사전 조건 두 커밋을 만든다. PR1 작업 자체는 PR_1_PLAN/IMPL/WRITING이 정상 처리.

### 진입 조건
- BG.step-1.1 완료 (채용 원본 자료가 `background/persistent/`에 저장됨)
- 모드 = 채용

### 5단계

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

### 세션 간 소통 창구

project.md PR1 섹션을 소통 창구로 사용. PR_1_PLAN이 시작 시 project.md 읽고 지시문 인식 → FOUNDATION이 만든 PR1 워크트리로 이동해서 진행. project.md에는 "PR1 워크트리에서 시작" 추상 표현만, 워크트리 경로는 명명 컨벤션으로 추론.

### 워크트리 명명

- **PR 워크트리**: `{메인 디렉토리}-pr{N}` (예: `ai-contexts-pr1`)
- **그 외 목적**: `{메인 디렉토리}-{purpose}` (예: `ai-contexts-markup`, `ai-contexts-backlog`)

AI는 `git worktree list`로 메인 디렉토리 이름을 알아내 패턴 적용.

### brand-new clone 케이스

두 커밋이 없으므로 PR_1_PLAN이 폴더 마이그레이션·코딩 스탠다드 마이그레이션을 다시 수행.

### vite·scss 위치 (모드별)

- **FOUNDATION markup 워크트리 (채용만)**: 최소 셋팅 (vite/next + scss/tailwind 마크업 가능 최소만, PR 안 감)
- **PR_1_IMPL.step-5 (채용만)**: PR1 진행으로 정식 구축 (린트·포맷·tsconfig·vite/next + scss/tailwind, FOUNDATION 두 커밋 위에 셋팅 커밋)
- **실무**: 기존 정식 환경 그대로. FOUNDATION 자체 없음

MARKUP은 모드 무관 동일 동작 — 마크업 코드 → markup 워크트리 PR 안 감 → PR_{N}_IMPL이 페이지 단위로 코드 가져감. 차이는 시작 환경뿐.

## MARKUP

전 페이지 markup 생성. PR에 안 들어감 (PR_{N}_IMPL이 페이지 단위로 코드 가져감).

### 진입 조건
- (채용) FOUNDATION 단계 4 종료 후
- (실무) BG.step-1.1 후

### spawn 직후 첫 메시지

사용자에게 다음을 안내한다 — 페이지·섹션·위젯·컴포넌트 어느 단위든 피그마 자료 (URL·캡처 이미지)를 **최대한 많이** 따서 누적. 컴포넌트는 추상화 레벨 다양 (atoms·molecules·widget 등).

사용자가 전달할 때마다 LLM은 **"이 컴포넌트 이름이 뭐예요?"** 묻기 (매번 인터랙션).

### 산출물 형태

- `background/retained/figma-url.md` — `[이름] - [URL]` 쌍 누적
- `background/retained/figma/[meaningful-name].[이미지확장자]` — 캡처 이미지

### 포트 룰

마크업 세션 = **포트 3000 점유**. /workflow 시작 시 사용자에게 안내.

## 작업 진행 순서

각 세션의 step 매핑. FOUNDATION·MARKUP은 위 본문 참조.

### BG (Step 1~2)

| 단계 | 내용 |
|------|------|
| [step-1.md](steps/step-1.md) | 배경 파악 및 문제 정의 (1.1 자료 받기 / 1.2 requirement-review 본체) |
| [step-2.md](steps/step-2.md) | PR 분할 전략 수립 |

### PR_{N}_PLAN (Step 3~4)

| 단계 | 내용 |
|------|------|
| [step-3.md](steps/step-3.md) | 과제 정의 |
| [step-4.md](steps/step-4.md) | 구현 방침 상세화 + stub 커밋 |

### PR_{N}_IMPL (Step 5~6)

| 단계 | 내용 |
|------|------|
| [step-5.md](steps/step-5.md) | 구현 |
| [step-6.md](steps/step-6.md) | 최종 점검 |

### PR_{N}_WRITING (Step 7)

| 단계 | 내용 |
|------|------|
| [step-7.md](steps/step-7.md) | PR 본문 작성 |

### 채용과제 마무리 (마지막 PR 완료 후, 채용과제만)

사용자가 `/full-refresh` 등으로 README 갱신 + GitHub PR 작성 완료 직후, [recruitment](recruitment/SKILL.md)의 「4-1. 산출물 문서 채용담당자 시점 리뷰」 트리거 (사용자 발화 트리거 — 메인 에이전트 자동 호출 아님).

**마지막 PR 판별**: `/plan/` 하위에서 가장 높은 번호의 `pr{N}` 디렉토리가 현재 작업 중인 PR이면 마지막.

## [CRITICAL] 지킬 원칙

### 기억 의존 금지
- 각 단계 시작 전 직전 산출물 다시 읽기
- 기억 의존 금지, 파일 현재 상태 기준으로 진행

### 단계별 승인 대기
- 각 단계 완료 후 **반드시 사용자 승인** 후 다음 단계

### 검증 기준 = 진실 원천

리뷰·검증 단계의 기준은 항상 진실 원천(figma 원본 URL, 컨벤션 1차 소스, 사용자 발화 등)이다. **AI 산출물(matching 표, 산출물 md 등)을 검증 기준으로 쓰지 않는다.**

이유: AI 산출물은 작성 시점에 누락·오류가 있을 수 있다. 같은 AI 또는 같은 추출 패턴의 Reviewer가 그 산출물을 기준으로 코드를 검증하면, Implementer가 추출 시 놓친 항목을 Reviewer도 못 잡는다. 자기증명 루프.

AI 산출물의 역할은 **Implementer 캐시·인덱스**로만 한정한다 — figma 호출 비용 절약, 컨벤션 경로 빠른 조회 등. Reviewer 절차에는 진실 원천 직접 fetch·참조를 명시한다.

적용 사례:
- Figma Reviewer는 `markup.md` 「Figma 원본 링크 인덱스」 절의 URL로 figma 원본을 직접 fetch (markup.md의 토큰 매핑표·매칭표는 캐시 보조)
- Coding-Standards Reviewer는 컨벤션 1차 소스 파일을 직접 읽음 (`reference.md`는 경로 인덱스 역할)
- code-review 스킬은 coding-standards 문서를 직접 참조

### 자가 검토 필수

각 세션 경계에서 산출물을 2단으로 검증한다. 세션 이름·개수에 의존하지 않는다.

- **세션 종료 시 셀프 리뷰**: 그 세션에서 생성·수정한 산출물 파일을 검증 소스와 1:1 대조한다. 검증 소스는 LLM이 자율 식별한다 (직전 산출물, 세션 입력 자료 중 검증 근거가 되는 자료).
  - **핵심 명세(Figma 명세 같은 1차 입력)는 항목 체크리스트로 점검**. 명세의 모든 항목(트리거 / 방향 / 크기 / 간격 / 토큰 / 화살표 등)을 한 줄씩 ✓/누락 표기. "거의 다 봤다"가 아니라 항목 단위로 명시 확인이 누락 발견을 보장한다.
- **다음 세션 시작 시 외부 검증**: 새 세션이 진입하면 이전 세션의 산출물을 외부 시각으로 한 번 더 검증한다. 같은 세션 컨텍스트의 blind spot을 잡기 위함.
- 같은 세션 안의 step 전환(예: 같은 BG 세션 안 step-1→2)에는 적용하지 않는다. 세션 분리가 외부 시각의 전제이므로 같은 세션 안은 제외.
- 산출물 파일이 없는 세션(예: 코드 작업 위주의 IMPL 세션)은 reviewer 에이전트 파이프라인이 검증을 담당하므로 일반 자가 검토는 적용하지 않는다.
- 발견된 이슈는 수정한 뒤 보고에 포함한다. 반복 횟수·수렴 기준은 글로벌 규칙 「검증은 수렴할 때까지 반복」을 따른다.
- **핵심 결정 사항을 요약하여 보고**: 사용자가 산출물 전체를 읽지 않아도 핵심을 파악할 수 있게.
- 보고 형식: 이슈 없으면 "자가 검토 통과" 한 줄로 충분. 이슈 발견 시 "검토 중 X 발견 → 수정 완료" 정도. 항목별 체크리스트·근거를 화면에 줄줄이 노출하지 않는다.
- 각 step의 "보고 내용" 섹션에 정의된 추가 항목이 있으면 함께 따른다.

### 부정 명시 메아리 자가 점검

산출물 파일을 저장한 직후, 사용자에게 보고하기 전에 반드시 점검한다. 사용자가 발화에서 부정 지시("X 쓰지 마", "Y 만들지 마")한 항목을 산출물에 메아리("X 안 쓴다", "Y 미적용", "Z 안 만든다")로 다시 적었는지 확인하는 절차. **사용자가 적지 말라고 한 모든 것을 적지 않는 게 디폴트** — 다시 적으면 노이즈만 쌓이고 사용자가 같은 지적을 반복해야 한다.

절차:

1. 산출물 텍스트에서 부정 표현이 등장하는 라인을 찾는다. 검사할 정규식 패턴 모음은 [negative-mirror-patterns.md](negative-mirror-patterns.md) 참조.
2. 매치된 각 라인을 분류:
   - **사용자 메아리** — 발화의 부정 지시를 산출물에 다시 적은 것. 삭제. 사용자는 자기가 부정한 항목을 안다.
   - **자체 판단 + 명시 근거 동반** — 같은 문장 또는 인접 라인에 측정값·기존 패턴·BG 결정 등 근거가 명시되어 있음. 정상 정보 전달이므로 유지. 예: "queryFn 중복 호출 5건 측정으로 staleTime 추가".
   - **자체 판단인데 근거 없음** — 자체 판단이라도 근거 없으면 노이즈. 삭제 또는 근거 보강.
3. 사용자 메아리·근거 없는 자체 판단이 1건이라도 있으면 삭제·보강 후 1번부터 재실행. 0건이거나 모두 근거 동반일 때 종료.

산출물 파일을 만드는 세션에서 작성하는 모든 산출물에 적용한다. 위 「자가 검토 필수」의 1:1 대조와 별개 갈래로 보고, 두 점검을 모두 통과해야 산출물 종료다. 반복 횟수·수렴 기준은 글로벌 규칙 「검증은 수렴할 때까지 반복」을 따른다.

### 선행조건 자가체크
- 각 step은 `/plan/`을 탐색하여 이전 단계 산출물과 맥락을 스스로 파악한다
- 필요한 맥락이 부족하면 사용자에게 질문한다
- 이전 step을 거치지 않고 진입해도 자연스럽게 대응 (step 스킵 허용)

### AI 패턴
- 먼저 생각 제시 → 사용자 의견 구하기 (멈추고 대기)
- 정보 부족 시 역질문

### 학습 인수인계 후 세션 진입 대기 (PR_{N}_PLAN 한정)

- step-1의 "작업 익숙도 판별"에서 인수인계 문서가 작성되었으면, **PR_{N}_PLAN 진입 안내** 시 **"사용자가 인수인계 문서 학습을 완료한 뒤 진입하라"** 는 조건을 함께 안내한다.
- 학습 완료 여부를 사용자에게 확인하지 않은 채 PR_{N}_PLAN 진입을 단정적으로 권하지 않는다.
- 인수인계 문서가 없으면 이 조항은 적용되지 않는다.
- 적용 범위: PR_{N}_PLAN만. PR_{N}_IMPL·PR_{N}_WRITING은 PLAN 결정을 따라가는 AI 구현·본문 작성이라 사용자 학습 결과 직접 필요 X. BG·FOUNDATION·MARKUP은 spawn 시점에 학습 인수인계가 아직 없거나 시점 모순.
