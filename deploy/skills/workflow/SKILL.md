---
name: workflow
description: 기획서, 피그마, 피그마 디자인토큰, 채용과제를 PR로 변환하는 워크플로우. 배경 파악 → PR 분할 → 구현 → 코드리뷰 → PR 작성까지 단계별 진행. 커밋, PR 작성, 코드리뷰 요청 시 반드시 이 스킬을 사용한다.
argument-hint: <세션 이름> <채용|실무|개인>
---

# 워크플로우

## 목적

기획서, 피그마, 피그마 디자인토큰, 채용과제를 PR로 변환한다.

이 워크플로우의 목표는 작업을 가능한 한 병렬로 돌려 병목을 없애는 것이다. 어떤 PR의 구현과 그 PR에 의존하는 PR의 설계를 겹치고(stub 핸드오프), 화면 마크업을 PR 작업과 병행하며, 리뷰어를 종류별로 나눠 동시에 돌리는 것이 그 장치다.

## 호출

`/workflow <세션 이름> <모드>`

- 세션 이름 디폴트 `BG`. 모드 디폴트 없음 (사용자가 명시 전달 — 채용/실무/개인 분기 영향이 크므로 디폴트 추론 위험).
- 세션 이름: `BG` / `FOUNDATION` / `MARKUP` / `PR_{N}_PLAN` / `PR_{N}_IMPL` / `WRITING_IDEATOR` / `WRITING_REFINER` / `FINALIZE`
- 모드: `채용` / `실무` / `개인`
- 호출 예: `/workflow BG 채용`, `/workflow MARKUP 실무`, `/workflow PR_2_PLAN 개인`, `/workflow FINALIZE 채용`

BG가 후속 세션 spawn 안내를 출력할 때 동일 모드 인자를 그대로 포함한다 (다음 세션 시작 시 사용자가 같은 모드 인자로 spawn). 모드 자동 감지(폴더 검사 등) 사용 X.

## 세션

워크플로우 세션 종류. 각 세션은 컨텍스트 격리.

| 세션 | (1) 진입 조건 | (2) 입력 컨텍스트 | (3) 출력 산출물 + 라이프사이클 폴더 | (4) 후속 트리거 | (5) 컨텍스트 처리 | (6) 권장 모델 |
|---|---|---|---|---|---|---|
| **BG** | `/workflow BG <모드>` 호출 (유일 루트) | 사용자 제공 자료 (기획서·요구사항·채용 원본·개인 마크업 시안) | `background/persistent/`: 공고·메일·과제요구사항 (채용만) / `background/retained/`: tech-constraints.md·conventions-index.md / `background/consumable/`: project.md·page-{페이지명}.md (페이지별 분석 — PR 확정 시 `pr{N}/consumable/page.md`로 이동) | step-1.1 후 → FOUNDATION (채용) 또는 MARKUP (실무·개인), 동일 `<모드>` 인자 / **PR을 확정할 때마다 → 그 PR의 PR_{N}_PLAN**, 동일 `<모드>` 인자 (일괄 분할 없음 — [conventions/pr-split.md](conventions/pr-split.md)) | 컨텍스트 격리. 세션 종료 시 산출물 자가 검토 | **Opus** — PR 확정이 전 세션의 루트 결정, 오판이 도미노로 전파 |
| **FOUNDATION** (채용만) | `/workflow FOUNDATION 채용` + BG.step-1.1 완료 + `project.md`에 이 PR 확정 | BG `background/persistent/` (채용 원본) | **`PRESET_FOUNDATION` PR을 자기 브랜치·워크트리에서 완결** (폴더 구조 마이그레이션 + 코딩 스탠다드 마이그레이션) — 절차는 전용 단계가 아니라 **표준 step-3~6**(불필요한 절차는 건너뜀) / `background/retained/folder-structure.md` / markup 워크트리 최소 셋팅. **도구 세팅(`PRESET_SETUP`)은 별개 PR**이며 정상 도미노가 처리 | **markup 워크트리 최소 셋팅 완료 시 → MARKUP** (`/workflow MARKUP 채용`) / 세션 종료 후 → 다른 PR의 PLAN을 여기서 띄우지 않는다 (PLAN spawn은 BG 몫). 이 PR에 의존하는 PR이 있으면 자기 진입 조건으로 출발한다 | 자기 PR 워크트리 (+ markup 워크트리). 다른 PR의 워크트리로 이동하지 않음 | **Sonnet** — 컨벤션 이식 정형 작업, 검수 쉬움 |
| **MARKUP** | (채용) FOUNDATION이 markup 워크트리 최소 셋팅을 마친 뒤 / (실무·개인) BG.step-1.1 후, `/workflow MARKUP <모드>` 호출 | (채용·실무) step-1.1 수집 figma·시안 자료 / (개인) step-1.1 수집 마크업 시안(`retained/mockup/`) — 페이지·섹션·위젯·컴포넌트 단위 | **markup 워크트리의 디자인 진실 원천 0건 완성 마크업 코드(`.tsx`·`.module.scss`)** (메인 산출물) + **공통 컴포넌트 확정·독립 산출**(전 페이지 직독, 2군데 이상=공통 → PR 확정이 소비하는 단방향 입력) + 입력: (채용·실무) `background/retained/figma-url.md`·`figma/` / (개인) `background/retained/mockup/`(+선택 `retained/spec.md`) | 없음 (PR_{N}_IMPL이 페이지 단위 마크업 코드를 그대로 가져감) | 마크업 워크트리. **포트 3000 점유** | **Sonnet** (figma URL 기준) / **Opus** (캡처-only·개인) — URL은 노드값이 정답이라 결정론적 번역, 캡처·개인 시안은 명세 완결성이 낮을 수 있어 해석 여지가 큼 |
| **PR_{N}_PLAN** | **`project.md`에 이 PR 절이 확정됨** (BG의 PR 확정 — 일괄 분할 대기 없음) + 의존 PR이 있는 경우에 한해 (그 PR이 stub 만든 경우 그 PR.step-4 stub, 안 만든 경우 그 PR.step-6 IMPL 완료 — 의존 PR은 직전 번호가 아닐 수 있고 여럿일 수 있다. `project.md` 해당 PR 절의 의존 항목이 출처). 의존이 없으면 확정 즉시 진입 가능 | `background/consumable/project.md` 해당 PR 섹션 + BG 산출물 + 이미 끝난 PR들의 `persistent/` (decisions, reference, implementation — 번호상 앞선 PR이 아니라 실제로 완료된 PR) | `pr{N}/persistent/`: decisions.md, reference.md, **implementation.md**, overview.md / `pr{N}/retained/`: markup.md (UI 컴포넌트 PR만, 개인 제외) / **가벼운 PR은 step-4에서 코드 변경 + 커밋을 직접 산출**(문서만 내는 세션 아님) | step-3 종료 → WRITING_IDEATOR (PR 본문 초안, step-4 진입 전 같은 세션 도중 안내) / step-4 stub 만든 경우 → PR_{N}_IMPL spawn / stub 없이 실행 이연(무거운 non-stub) → PR_{N}_IMPL spawn / stub 없이 그 자리 실행·커밋 완결(가벼운 PR) → IMPL 세션 없이 WRITING_REFINER **(단 step-5·6 수행 후 — step-4 「종료 시퀀스」 가벼운 PR 분기)** / step-4 stub 확정 시 → **본 PR의 시그니처만 필요한 PR의 출발 게이트 해제 안내** (`project.md`의 의존 항목에서 찾는다. 세션을 새로 띄우라는 spawn 안내가 아니라 게이트가 풀렸다는 안내 — PLAN spawn 자체는 BG의 PR 확정이 유일 트리거) | PR_{N} 워크트리. 학습 인수인계 후 진입 대기 적용 | **Opus** — stub 시그니처가 의존 PR의 공개 계약, 오판 시 도미노 오염 |
| **PR_{N}_IMPL** | PR_{N}_PLAN.step-4 종료 (필수) + (페이지 코드 포함 PR이면) MARKUP의 해당 페이지 코드 (필수) + (의존 PR이 stub 만든 경우) 그 stub 시그니처 확정 (필수) | implementation.md, markup.md, MARKUP 페이지 코드, decisions·reference | 코드 변경 + 커밋 (로직 stub 위에 본체 채움; 마크업은 MARKUP 완성본 import) / `pr{N}/consumable/`: review.md, user-test-cases.md | step-6 끝 후(IMPL 세션 종료) → WRITING_REFINER / 마지막 IMPL이면(전 PR IMPL step-6 완료) → FINALIZE (fan-in) | PR_{N} 워크트리. 본 PR 하나에 집중 | **Sonnet** (PLAN이 방침 확정 시) — PLAN이 알고리즘 판단을 미뤘으면 Opus |
| **WRITING_IDEATOR** | PR_{N}_PLAN.step-3 종료 (초안 트리거) | `pr{N}/persistent/overview.md` + `pr{N}/persistent/decisions.md` (step-3 초기본, 토론 없으면 부재 가능) + `pr{N}/persistent/reference.md` | `pr{N}/consumable/pr-body.md` **초안**(배경·문제·접근·근거; 상세 코드블록·실제 커밋 목록 제외) — overview는 persistent라 **읽기만**, 어느 소비처도 삭제하지 않음 | 후속 spawn 없음 (REFINER는 IMPL·step-6 후 별도 트리거). per-PR·유연 타이밍 | **코드 워크트리 무관 — main repo `/plan/` 절대경로 참조** (`step-4.md:24`). 구현 맥락 없이 계획 산출물 기반 초안 | **Opus** — 계획만 보고 사용자 의도를 PR 본문 배경·근거로 녹여야 함, 의도 오독 비용 큼 |
| **WRITING_REFINER** | PR_{N}_IMPL.step-6 종료 (가벼운 PR은 PLAN이 step-5·6 수행 후) | WRITING_IDEATOR 입력 + `implementation.md` + 커밋 로그 + `decisions.md` 갱신분(step-6.6) + `pr{N}/consumable/` 잔여(review.md·user-test-cases.md). **pr-body 초안 부재 시 write-init 선행**(IDEATOR 흡수) | `pr{N}/consumable/pr-body.md` **확정** → PR 본문 복사·게시·삭제 / overview.md는 persistent라 읽기만(큐레이션), 삭제 안 함 / 잔여 consumable 소비·정리 / `pr{N}/persistent/`는 제외 (영구 보존) | 후속 spawn 없음 (per-PR·유연 타이밍 — IMPL 직후 또는 나중에 몰아서. 머지·최종화는 FINALIZE 담당) | **코드 워크트리 무관 — main repo `/plan/` 절대경로 참조**. 커밋 로그 조회 시 pr{N}→브랜치는 `git worktree list` + FOUNDATION 명명규칙(실무·개인은 worktree list 직접) | **Opus** — 구현 산출물·커밋을 사용자 의도와 정합시켜 확정, 의도 오독 비용 큼 |
| **FINALIZE** | 전 PR의 IMPL(step-6) 완료 (fan-in) | 전 PR 커밋 히스토리 + WRITING 잔여 산출물 | 재배치·메시지 최종화된 히스토리 + force-push 요청 (폴더 산출물 없음) | 채용 → recruitment 마무리 안내 (동일 `채용` 인자) / 실무·개인 → 머지 안내 (스택은 바텀업, 독립 브랜치는 순서 무관) | 다중 브랜치, 단계별 cwd ([conventions/session/finalize.md](conventions/session/finalize.md) 「cwd」) | **Opus** — 다중 브랜치 history rewrite에서 오배치 판정·연쇄 rebase 오판 비용 큼 |

(6) 권장 모델은 **세션 구동 모델**(사용자가 `/workflow`로 띄우는 본 세션)이다. MARKUP·IMPL이 내부에서 spawn하는 reviewer 서브에이전트는 impl-review-loop의 자체 모델 분할(기계적 대조=Sonnet/Haiku, 깊은 품질 판단=Opus)을 따른다 — 본 칸과 별개.

**PLAN/IMPL 분담은 경직 분업이 아니라 선택적 분해다.** PLAN(step-4)은 구현을 수행하는 세션이며, 가벼운 PR은 그 자리에서 실행·커밋해 완결한다. IMPL은 PLAN이 stub으로 분해한 **무거운 구현을 이어받는** 세션이지, "코드+커밋은 IMPL 칸"이라는 고정 배정이 아니다. PLAN이 실행 가능한 작업을 "IMPL 몫"이라며 미루지 않는다 (프레임 근거: step-4 도입부).

### 의존성 그래프

**채용:**

```
BG.step-1.1 ──→ FOUNDATION (= PRESET_FOUNDATION PR, 표준 step-3~6)
                  └─ markup 환경 셋팅 완료 ──→ MARKUP

BG가 PR을 확정할 때마다 ──→ 그 PR_{N}_PLAN (일괄 분할 대기 없음. PLAN spawn의 유일 트리거)
                            의존 PR이 있으면 그 선행이 풀린 뒤 출발
                            (의존 PR = `project.md` 해당 PR 절의 의존 항목. 직전 번호가 아닐 수 있고 여럿일 수 있다)

[구현 페이즈 — 도미노, 머지 없음. base는 사전 준비에서 사용자 확인 —
 앞 PR에 의존하면 그 브랜치 위(스택), 독립이면 기본 브랜치에서]
PR_{N}_PLAN.step-3 종료 ──→ WRITING_IDEATOR (PR 본문 초안 — step-4 진입 전, 상시 세션)
PR_{N}_PLAN.step-4 stub 만든 경우 ──→ PR_{N}_IMPL ──(step-6 끝)──→ WRITING_REFINER (per-PR·유연 타이밍)
PR_{N}_PLAN.step-4 실행 이연(무거운 non-stub) ──→ PR_{N}_IMPL ──(step-6 끝)──→ WRITING_REFINER
PR_{N}_PLAN.step-4 그 자리 실행·커밋 완결(가벼운 PR) ──→ (step-5·6 수행 후) IMPL 세션 없이 WRITING_REFINER

PR_{N}에 의존하는 PR은 여기서 띄우지 않는다 (spawn은 BG 몫). 그 PR은 자기 진입 조건으로 출발한다:
  PR_{N}이 stub 만든 경우 ──→ PR_{N}.step-4 stub 확정 시점
  PR_{N}이 stub 안 만든 경우 ──→ PR_{N}.step-6 IMPL 완료 시점 (머지 아님)

[종료 페이즈 — 전 PR IMPL 완료 후 1회, fan-in]
PR_1..n IMPL 전부 완료 ──→ FINALIZE (replace 오배치 재배치 + 메시지 최종화)
                            └─→ recruitment 마무리 안내 → (사용자) 머지·제출
                                (스택은 바텀업, 독립 브랜치는 순서 무관)

PR_{N}_IMPL은 MARKUP 워크트리의 검증된 페이지 마크업 코드를 그대로 가져옴 (재작성 X).
```

**실무·개인:**

```
BG.step-1.1 ──→ MARKUP
BG가 PR을 확정할 때마다 ──→ 그 PR_{N}_PLAN

PR 도미노(PR_{N}_PLAN → PR_{N}_IMPL, PR 본문은 step-3 후 WRITING_IDEATOR·step-6 후 WRITING_REFINER)와 종료 페이즈(전 IMPL 완료 → FINALIZE)는 채용과 동일.
FINALIZE 종료 ──→ 머지 안내 (스택은 바텀업, 독립 브랜치는 순서 무관. recruitment 마무리는 채용 전용 — 실무·개인은 곧장 머지).
```

개인은 그래프가 실무와 동일하다. 차이는 MARKUP의 디자인 진실 원천·진실검사뿐 — 모드별 축은 [conventions/modes.md](conventions/modes.md) 매트릭스.

### 세션 spawn 안내 메커니즘

각 세션의 끝·분기점 step에서 위 「세션」 표를 참조해 후속 spawn 안내를 출력한다 (본문에 후속 세션 명단을 박지 말 것 — 표 갱신이 단일 소스).

**분기점 시점 인식**: 자기 세션의 표 (4) 컬럼에 적힌 트리거가 분기점이다. 두 종류가 있다.

- **step 종료형** — "step-X 후" 같은 트리거. 그 step이 세션의 끝이거나 분기점이다.
- **사건 발생형** — "PR을 확정할 때마다" 같은 트리거. **세션 한복판에서 여러 번 발동한다.** BG의 PR 확정이 여기 해당한다.

어느 쪽이든 트리거 즉시 본 절차를 발동한다 — 다음 step·분석성 출력·산출물 작성을 본 절차 전에 시작하지 않는다.

**분석 욕구 가드**: 분기점에서 분석할 자료가 잔뜩 남아 있어도(시안 정독, cross-analysis, 평가 기준 추론 등) spawn 안내를 **먼저** 출력한다. 분석성 출력 텍스트의 분량과 절차 안내의 우선순위를 혼동하지 않는다.

- **사건 발생형에서는 안내 후 분석을 이어간다** — 이 가드는 "분석을 하지 말라"가 아니라 "안내보다 먼저 하지 말라"다. PR을 확정했으면 그 자리에서 안내를 내고, 남은 정독·분석을 계속한다.
- **모아뒀다 한꺼번에 안내하지 않는다.** 확정을 쌓아두고 세션 끝에 몰아서 안내하면 일괄 분할과 같아져 뒤 세션 대기가 되살아난다 — 이 메커니즘이 막으려는 실패 그 자체다.

**fan-in 후속 (FINALIZE)**: 대부분의 후속은 선형(한 세션 종료 → 다음 세션)이지만 FINALIZE는 **fan-in**이다 — 전 PR의 IMPL(step-6)이 끝나야 진입 가능. 이를 안내하는 주체는 **마지막 IMPL 세션**이다. PR_{N}_IMPL이 step-6을 끝낼 때(IMPL 세션 종료), 방금 끝낸 PR이 마지막 IMPL인지 판정(「작업 진행 순서 > FINALIZE」의 마지막 PR 판별 기준)하고, 마지막이면 WRITING_REFINER 안내에 더해 FINALIZE 진입도 안내한다. 마지막이 아니면 FINALIZE 안내는 출력하지 않는다.

종료 시 LLM 절차:
1. 표에서 자기 후속 명단 추출
2. 각 후속의 선행 분해 — 자기 선행·방금 끝낸 step은 ✓ (자기 spawn 사실로 충족 추론), 병렬 세션 종료 항목은 미충족 가능 단서로 표시
3. 후속별 spawn 가능 조건 안내 출력 (`/workflow <세션> <모드>` 인자 포함). 표 (6) 권장 모델도 함께 출력 (예: "Opus 권장"). MARKUP은 입력 모달리티(figma URL이면 Sonnet / 캡처-only면 Opus)에 따라 분기 안내. 사용자가 단서 보고 spawn 판단
4. 후속 spawn 안내 출력 직후, "이 세션은 종료되었습니다. 회고가 필요한 시점에 `/pre-exit` 호출하세요." 한 줄 안내. 보강·augmentation 디테일은 적지 않는다 (/pre-exit 내부 처리)

## 구조

- 각 step은 조건에 해당하는 **하위 스킬을 모두 로드**하는 오케스트레이터이거나, 그 자체가 실행 로직
- 해당 스킬이 여러 개이면 **순서대로 하나씩** 실행한다 (동시 로드 불가)
- 각 step의 **산출물이 다음 step의 입력** — step마다 "참고 자료"로 입력 산출물이 명시되어 있음
- 하위 스킬은 워크플로우 세션의 절차(step 또는 step 없는 세션 본문) 안에서만 호출된다 (독립 호출 없음). 예: MARKUP은 step 없이 본문(markup/)에서 impl-review-loop를 호출
- MARKUP·WRITING·FINALIZE는 step 번호가 없는 세션 — 본문은 [conventions/session/markup/index.md](conventions/session/markup/index.md)(모드 공통) + 모드 파일([figma.md](conventions/session/markup/figma.md)·[personal.md](conventions/session/markup/personal.md)) / [conventions/session/writing.md](conventions/session/writing.md)(WRITING_IDEATOR·WRITING_REFINER 2절) / [conventions/session/finalize.md](conventions/session/finalize.md) 단일 출처

## 시작 전 준비

- `template/context-setup.md` 양식으로 레포지토리 Context 수집
  - **실무 프로젝트**: 필수
  - **개인 프로젝트**: 필수
  - **채용 과제 등**: 생략 가능

## /plan/ 폴더 구조

폴더 트리·라이프사이클 규칙(persistent/retained/consumable 동작)·consumable 자가 정리 안내문 양식·피그마 URL·캡처 캐싱 룰은 [conventions/plan-folder.md](conventions/plan-folder.md) 참조.

## 작업 진행 순서

각 세션의 step 매핑. MARKUP·WRITING·FINALIZE는 step 번호가 없어 [conventions/session/markup/index.md](conventions/session/markup/index.md) / [conventions/session/writing.md](conventions/session/writing.md) / [conventions/session/finalize.md](conventions/session/finalize.md) 참조. FOUNDATION은 자기 PR을 표준 step-3~6으로 수행하며, 고유 입력·제약은 [conventions/session/foundation.md](conventions/session/foundation.md) 참조.

### BG (Step 1)

| 단계 | 내용 |
|------|------|
| [step-1.md](steps/step-1.md) | 배경 파악 및 문제 정의 (1.1 자료 받기 / 1.2 requirement-review 본체) + step-1 내내 PR 확정 |

PR 확정 기준·분할 원칙·의존 서술은 [conventions/pr-split.md](conventions/pr-split.md) 참조. 일괄 PR 분할 단계는 없다.

### PR_{N}_PLAN (Step 3~4)

| 단계 | 내용 |
|------|------|
| [step-3.md](steps/step-3.md) | 과제 정의 |
| [step-4.md](steps/step-4.md) | 구현 (실행 또는 stub 분해·커밋) |

### PR_{N}_IMPL (Step 5~6)

| 단계 | 내용 |
|------|------|
| [step-5.md](steps/step-5.md) | 구현 |
| [step-6.md](steps/step-6.md) | 최종 점검 |

### WRITING_IDEATOR / WRITING_REFINER (step 없음, 상시 세션)

PR별 세션이 아니라 PR 1~N 본문을 연속 작성하는 상시 2세션. IDEATOR는 각 PR `step-3` 종료 후 초안, REFINER는 각 PR `step-6` 종료 후 확정. step 번호가 없으므로 [conventions/session/writing.md](conventions/session/writing.md) 참조.

### FINALIZE (전 PR IMPL 완료 후, step 없음)

전 PR IMPL 완료 후 1회 실행하는 종료 페이즈 세션. replace(오배치 재배치)·메시지 최종화·머지 안내는 [conventions/session/finalize.md](conventions/session/finalize.md) 참조.

**마지막 PR(=마지막 IMPL) 판별**: `project.md`를 읽어 IMPL이 아직 안 끝난 PR이 남았는지 본다. 남아 있지 않으면 방금 끝낸 IMPL이 마지막이다. `pr{N}` 디렉토리 존재는 보조 신호일 뿐이고, **번호는 확정 순서라 완료 순서가 아니므로 "가장 높은 번호"로 판정하지 않는다** (PR5가 PR3보다 먼저 끝날 수 있다). 이 판정으로 마지막 IMPL 세션이 FINALIZE 진입을 안내한다 (「세션 spawn 안내 메커니즘」 fan-in 후속).

### 채용과제 마무리 (FINALIZE 종료 후, 채용과제만)

FINALIZE가 전 PR을 머지 직전 상태로 정리한 뒤 채용 모드에서 recruitment 마무리를 안내한다. 사용자가 `/refresh-projects` 등으로 README 갱신 + GitHub PR 작성 완료 직후, [recruitment](recruitment/SKILL.md)의 「4-1. 산출물 문서 채용담당자 시점 리뷰」 트리거 (사용자 발화 트리거 — 메인 에이전트 자동 호출 아님).

## step 경계 (전환·세션경계·후속)

각 step이 끝날 때의 **전환·세션경계·후속안내를 이 표가 소유**한다. step 본문은 자기 고유 종료 절차만 두고, 전환·세션경계·후속 문구를 재서술하지 않는다.

| step | 세션 내 위치 | 종료 직후 전환 | 세션 경계 | step 고유 종료 절차 (본문 잔류) |
|---|---|---|---|---|
| step-1.1 | BG 분기점 | 후속 안내 메커니즘 발동(분석 전) → step-1.2 | 분기점 (세션 계속) | 컨벤션 인덱스 게이트 |
| step-1.2 | BG 마지막 | 후속 안내 메커니즘 발동 | BG 세션 종료 | 남은 PR 확정 마무리 |
| step-3 | PLAN 중간 | → step-4 (WRITING_IDEATOR 초안 트리거는 메커니즘 소관) | 아니오 | overview 소비·의사결정 토론 |
| step-4 | PLAN 마지막/분기 | 가벼운 PR: step-5·6 수행 후 메커니즘 / stub·이연: PR_{N}_IMPL로 메커니즘 | PLAN 세션 종료 | 리뷰팀 spawn·it.todo 게이트 |
| step-5 | IMPL 중간 | → step-6 | 아니오 | it.todo/TODO 게이트·보고 |
| step-6 | IMPL 마지막 | 후속 안내 메커니즘 발동 | IMPL 세션 종료 | Gap 분석·의존 PR 게이트·산출물 정리 |

- **공통 종료 절차**(자가검토·부정명시 점검·보고)는 「step 종료 시퀀스 미스킵」·「자가 검토 필수」·「부정 명시 메아리 자가 점검」이 소유 — 표·본문에 재나열하지 않는다.
- **후속 세션 명단·모드 인자·권장 모델**은 「세션」 표 (4)+(6)과 「세션 spawn 안내 메커니즘」이 소유. **마지막 IMPL 판정(→FINALIZE)**은 「작업 진행 순서 > FINALIZE」가 단일 소스다.

## [CRITICAL] 지킬 원칙

### 기억 의존 금지
- 각 단계 시작 전 직전 산출물 다시 읽기 (기억 의존 금지, 파일 현재 상태 기준)

### 단계별 승인 대기
- 각 단계 완료 후 **반드시 사용자 승인** 후 다음 단계

### 검증 기준 = 진실 원천

리뷰·검증 단계의 기준은 항상 진실 원천(figma 원본 URL, 컨벤션 1차 소스, 사용자 발화 등)이다. **AI 산출물(matching 표, 산출물 md 등)을 검증 기준으로 쓰지 않는다.**

이유: AI 산출물은 작성 시점에 누락·오류가 있을 수 있다. 같은 AI 또는 같은 추출 패턴의 Reviewer가 그 산출물을 기준으로 코드를 검증하면, Implementer가 추출 시 놓친 항목을 Reviewer도 못 잡는다. 자기증명 루프.

AI 산출물의 역할은 **Implementer 캐시·인덱스**로만 한정한다 — figma 호출 비용 절약, 컨벤션 경로 빠른 조회 등. Reviewer 절차에는 진실 원천 직접 fetch·참조를 명시한다.

적용 사례:
- MARKUP의 Figma Reviewer는 `figma-url.md`의 URL로 figma 원본을 직접 fetch해 마크업과 대조 (매칭표는 캐시 보조)
- Coding-Standards Reviewer는 컨벤션 1차 소스 파일을 직접 읽음 (`reference.md`는 경로 인덱스 역할)
- code-review 스킬은 coding-standards 문서를 직접 참조

### step 진입 시퀀스

각 세션·step 진입 시점에 다음을 **순서대로** 수행한다. SKILL.md만 보고 자기 지식·기억으로 진행하지 않는다.

1. **해당 step.md 전체를 즉시 Read** — SKILL.md 「작업 진행 순서」 표에서 자기 세션의 step 파일 경로를 찾아 처음부터 끝까지 읽는다. 산출물 작성 시점에 부분 Read 하지 않는다.
2. **도입부 [CRITICAL]·필수 절차 실행** — step.md 도입부의 Plan mode 진입 / 컨벤션 사전 참조 / 입력 산출물 탐색 / 사용자 질문 등 명시 절차를 먼저 실행. 산출물 작성으로 곧장 흘러가지 않는다.
3. **사용자 질문 절은 건너뛰지 않는다** — step.md에 "사용자에게 X를 질문한다"는 절이 있으면 반드시 묻는다. "이미 알고 있다"·"입력 산출물에서 추정 가능"으로 자기 면제 금지.

사고 패턴: 메인 LLM이 step 진입 시 SKILL.md 본문만 보고 step-N.md 본문은 산출물 작성 시점에야 부분 Read → 도입부 [CRITICAL] 절차 100% 누락. step-3·4 도입부의 「Plan mode 필수」·「컨벤션 사전 참조」·「구현 컨텍스트 수집」이 본문에 명시되어 있어도 미발동.

산출물 작성 시점이 아니라 **step 진입 시점이 step.md Read 트리거**다. 본 절은 모든 step 적용.

### 사용자 강도 표현 가드

사용자 발화에 강도·범위 강조 표현이 등장하면 (예: "풀로", "전부 다", "만만히 보지 마", "세게", "빠짐없이", "엄격하게", "꼼꼼히") 이는 **AI의 1차 후보 범위가 부족할 수 있다는 신호**다. 사용자가 본 1차 후보 안의 풀셋을 뜻하는 게 아니라, AI가 더 큰 1차 소스로 재검증할 것을 요구하는 발화로 해석한다.

발동 절차:
1. MP `docs/best-practices/*.md`(Glob으로 전체 목록 확인 → frontmatter로 관련 파일 추림 → 매칭 항목 → `docs/patterns/...` 본문)를 즉시 탐색·Read
2. 1차 소스에서 발견한 항목이 AI 1차 후보보다 많으면, **추가 항목을 사용자에게 자동 제안** (사용자가 묻기 전에)
3. 추가 항목이 PR 범위 안인지 사용자 확인 후 implementation에 반영

자기 면제 금지: "사용자가 명시한 6항목 안만 풀로 하라는 뜻"으로 해석하지 않는다. 사용자는 1차 후보 자체의 완전성을 검증할 수 없으니 강도 표현으로 위임한 것.

### Plan mode 강제 진입

step.md 도입부에 "**Plan mode 필수**" 표기가 있는 step(step-3·step-4 등)에 진입할 때 EnterPlanMode 도구를 명시 호출한다. 진입 시퀀스 1순위.

사용자의 짧은 OK 발화("ㅇ", "좋아", "step-4 진입해", "ok")는 plan mode 면제 트리거가 아니다. 사용자가 명시적으로 "plan mode 끄고 진행"·"바로 작성"이라 발화하지 않는 한 plan mode 진입.

산출물 초안 제시 + 사용자 승인 라운드를 plan mode 안에서 진행. 승인 후 ExitPlanMode로 빠져나와 산출물 작성.

### step 종료 시퀀스 미스킵

각 step 본문의 종료 절(번호 매겨진 마지막 절들)을 **모두** 실행한다. 산출물 작성 흐름이 끝났다고 종료 시퀀스가 자동 발동되지 않는다 — 명시 점검 필요.

사용자의 짧은 OK 발화("ㅇ", "좋아", "ok")가 spawn 안내·보고 출력으로 즉시 흘러가도록 휩쓸지 않는다. 산출물 OK ≠ step 종료 — 종료 절 실행 후가 step 종료다.

특히 빠뜨리기 쉬운 절차:
- **Reviewer 팀 에이전트 spawn** — 산출물 작성 직후 "사용자 OK 받았으니 다음"으로 자연스레 흐르며 누락. [CRITICAL] 표기에도 미스. **산출물 OK 발화는 reviewer 진입 트리거지 종료 트리거 아님**.
- **부정 명시 메아리 자가 점검** — 본 SKILL.md 절 (아래)
- **자가 검토** — 본 SKILL.md 「자가 검토 필수」 절 (아래)

종료 절은 보고·spawn 안내 출력 전에 모두 끝나야 한다. 종료 절 실행 결과는 보고에 합산.

각 step의 전환·세션경계·후속안내(다음 step / 세션 종료 여부 / 메커니즘 발동)는 「step 경계」 표가 소유한다 — step 본문에서 재서술하지 않는다.

### 자가 검토 필수

각 세션 경계에서 산출물을 2단으로 검증한다. 세션 이름·개수에 의존하지 않는다.

- **세션 종료 시 셀프 리뷰**: 그 세션에서 생성·수정한 산출물 파일을 검증 소스와 1:1 대조한다. 검증 소스는 LLM이 자율 식별한다 (직전 산출물, 세션 입력 자료 중 검증 근거가 되는 자료).
  - **핵심 명세(Figma 명세 같은 1차 입력)는 항목 체크리스트로 점검**. 명세의 모든 항목(트리거 / 방향 / 크기 / 간격 / 토큰 / 화살표 등)을 한 줄씩 ✓/누락 표기. "거의 다 봤다"가 아니라 항목 단위로 명시 확인이 누락 발견을 보장한다.
- **다음 세션 시작 시 외부 검증**: 새 세션이 진입하면 이전 세션의 산출물을 외부 시각으로 한 번 더 검증한다. 같은 세션 컨텍스트의 blind spot을 잡기 위함.
- 같은 세션 안의 step 전환(예: 같은 BG 세션 안 step-1.1→1.2)에는 적용하지 않는다. 세션 분리가 외부 시각의 전제이므로 같은 세션 안은 제외.
- 산출물 파일이 없는 세션(예: 코드 작업 위주의 IMPL 세션)은 reviewer 에이전트 파이프라인이 검증을 담당하므로 일반 자가 검토는 적용하지 않는다.
- 발견된 이슈는 수정한 뒤 보고에 포함한다. 반복 횟수·수렴 기준은 글로벌 규칙 「검증은 수렴할 때까지 반복」을 따른다.
- **핵심 결정 사항을 요약하여 보고**: 사용자가 산출물 전체를 읽지 않아도 핵심을 파악할 수 있게.
- 보고 형식: 이슈 없으면 "자가 검토 통과" 한 줄로 충분. 이슈 발견 시 "검토 중 X 발견 → 수정 완료" 정도. 항목별 체크리스트·근거를 화면에 줄줄이 노출하지 않는다.
- 각 step의 "보고 내용" 섹션에 정의된 추가 항목이 있으면 함께 따른다.

### 부정 명시 메아리 자가 점검

산출물 파일을 저장한 직후, 사용자에게 보고하기 전에 반드시 점검한다. 사용자가 발화에서 부정 지시("X 쓰지 마", "Y 만들지 마")한 항목을 산출물에 메아리("X 안 쓴다", "Y 미적용", "Z 안 만든다")로 다시 적었는지 확인하는 절차. **사용자가 적지 말라고 한 모든 것을 적지 않는 게 디폴트** — 다시 적으면 노이즈만 쌓이고 사용자가 같은 지적을 반복해야 한다.

절차:

1. 산출물 텍스트에서 부정 표현이 등장하는 라인을 찾는다. 검사할 정규식 패턴 모음은 [conventions/negative-mirror-patterns.md](conventions/negative-mirror-patterns.md) 참조.
2. 매치된 각 라인을 분류:
   - **사용자 메아리** — 발화의 부정 지시를 산출물에 다시 적은 것. 삭제. 사용자는 자기가 부정한 항목을 안다. **인용 블록·"사용자 발화" 섹션 등 인용 형식으로 박은 것도 메아리에 해당 — 정규식 미매치라도 의미적으로 사용자 부정 지시가 산출물에 박혔으면 삭제**.
   - **자체 판단 + 명시 근거 동반** — 같은 문장 또는 인접 라인에 측정값·기존 패턴·BG 결정 등 근거가 명시되어 있음. 정상 정보 전달이므로 유지. 예: "queryFn 중복 호출 5건 측정으로 staleTime 추가".
   - **자체 판단인데 근거 없음** — 자체 판단이라도 근거 없으면 노이즈. 삭제 또는 근거 보강.
3. 사용자 메아리·근거 없는 자체 판단이 1건이라도 있으면 삭제·보강 후 1번부터 재실행. 0건이거나 모두 근거 동반일 때 종료.

**판정 우선순위**: 정규식 매치 결과보다 **본 절의 룰 정신(사용자가 적지 말라고 한 모든 것을 적지 않는 게 디폴트)을 우선**한다. 정규식은 트리거 보조이고, 본 정신을 위반하면 매치되지 않아도 메아리로 처리한다. "발화 원문이라 인용일 뿐"·"근거 동반 형식이라 정상"으로 자기 면죄 금지.

산출물 파일을 만드는 세션에서 작성하는 모든 산출물에 적용한다. 위 「자가 검토 필수」의 1:1 대조와 별개 갈래로 보고, 두 점검을 모두 통과해야 산출물 종료다. 반복 횟수·수렴 기준은 글로벌 규칙 「검증은 수렴할 때까지 반복」을 따른다.

### 입력 산출물 비판적 검토

세션·step 진입 시 입력 컨텍스트로 받은 **AI가 만든 결정·narrative 산출물**을 그대로 수용하지 않고 비판적으로 검토한다.

- **대상**: 위 「세션」 표 「(2) 입력 컨텍스트」 컬럼의 산출물 중 AI 결정·narrative만. figma·코드·사용자 발화·1차 입력은 제외 (그쪽은 「검증 기준 = 진실 원천」 담당)
- **범위**: 자기가 참조·재사용·확장하는 부분에 한정 (전부 다 의심하지 않는다)
- **기준**: 자기가 이미 로드한 컨벤션 + 보안·성능·정확성. 검증을 위해 추가 컨벤션 로드 금지 (영역 확장 방지)
- **도전 트리거**: 정당화 근거가 로드된 컨벤션·보안·성능·정확성이 아니라 관성적 사유(있어 보임, 그럴듯함, "보통 이렇게 함")면 도전
- **발견 시 처리**: 사용자에게 보고. 별 PR/이슈로 분리할지 이번 영역에서 다룰지는 사용자가 결정. AI 단독 폐기·수용 금지 — "재결정했다"·"정정했다"·"교체했다"·"폐기했다" 같은 결과 단정 표현으로 입력 결정을 자기 권한으로 뒤집지 않는다. 보고 형식은 "BG/이전 세션 결정 X에 우려 Y 발견 → 어떻게 진행할지 결정 필요" 식의 결정 위임 형태로 출력한다. 새 산출물(decisions.md 등)에는 "보류"·"플래그" 절로 표기하고, 사용자 결정 후 확정

### 선행조건 자가체크
- 각 step은 `/plan/`을 탐색하여 이전 단계 산출물과 맥락을 스스로 파악한다. 탐색 결과 중 AI 결정·narrative 성격 산출물은 메타 룰 「입력 산출물 비판적 검토」 적용
- 필요한 맥락이 부족하면 사용자에게 질문한다
- 이전 step을 거치지 않고 진입해도 자연스럽게 대응 (step 스킵 허용)

### AI 패턴
- 먼저 생각 제시 → 사용자 의견 구하기 (멈추고 대기)
- 정보 부족 시 역질문

### 학습 인수인계 후 세션 진입 대기 (PR_{N}_PLAN 한정)

- step-1의 "작업 익숙도 판별"에서 인수인계 문서가 작성되었으면, **PR_{N}_PLAN 진입 안내** 시 **"사용자가 인수인계 문서 학습을 완료한 뒤 진입하라"** 는 조건을 함께 안내한다.
- 학습 완료 여부를 사용자에게 확인하지 않은 채 PR_{N}_PLAN 진입을 단정적으로 권하지 않는다.
- 인수인계 문서가 없으면 이 조항은 적용되지 않는다.
- 적용 범위: PR_{N}_PLAN만.
