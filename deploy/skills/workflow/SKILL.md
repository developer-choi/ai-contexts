---
name: workflow
description: 기획서, 피그마, 피그마 디자인토큰, 채용과제를 PR로 변환하는 워크플로우. 배경 파악 → PR 분할 → 구현 → 코드리뷰 → PR 작성까지 단계별 진행. 커밋, PR 작성, 코드리뷰 요청 시 반드시 이 스킬을 사용한다.
argument-hint: <세션 이름> <채용|실무|개인>
---

# 워크플로우

## 목적

기획서·피그마·디자인토큰·채용과제처럼 코딩의 바탕이 되는 원본 문서를 받아, 배경 파악부터 코드리뷰까지의 단계를 거쳐 PR까지 만들어내는 공정이다.

서로 기다릴 필요 없는 일을 겹쳐 돌려, 앞 단계가 끝날 때까지 뒤가 노는 대기를 없애는 것이 목적이다.

## 호출

`/workflow <세션 이름> <모드>`

- 세션 이름 디폴트 `BG`. 모드 디폴트 없음 — 사용자가 명시 전달하고, 폴더 검사 등으로 자동 감지하지 않는다.
- 세션 이름: `BG` / `FOUNDATION` / `MARKUP` / `PR_{N}_PLAN` / `PR_{N}_IMPL` / `WRITING_IDEATOR` / `WRITING_REFINER` / `FINALIZE`
- 모드: `채용` / `실무` / `개인`

## 세션

워크플로우 세션 종류. 각 세션은 컨텍스트 격리.

| 세션 | (1) 진입 조건 | (2) 입력 컨텍스트 | (3) 출력 산출물 + 라이프사이클 폴더 | (4) 후속 트리거 | (5) 컨텍스트 처리 | (6) 권장 모델 |
|---|---|---|---|---|---|---|
| **BG** | `/workflow BG <모드>` 호출 (유일 루트) | 사용자 제공 자료 (기획서·요구사항·채용 원본·개인 마크업 시안) | `background/persistent/`: 공고·메일·과제요구사항 (채용만) / `background/retained/`: tech-constraints.md·conventions-index.md / `background/consumable/`: todo.md·page-{페이지명}.md (페이지별 분석 — PR 확정 시 `pr{N}/consumable/page.md`로 이동) / (채용) 작업 레포 — private 원격 + `master` 초기 커밋 | (실무·개인) step-1.1 후 → MARKUP, 동일 `<모드>` 인자 / **PR을 확정할 때마다 → 그 PR의 PR_{N}_PLAN**, 동일 `<모드>` 인자 / (채용) `PRESET_FOUNDATION` PR을 확정하면 → FOUNDATION ([conventions/pr-split.md](conventions/pr-split.md)) | 컨텍스트 격리. 세션 종료 시 산출물 자가 검토. 후속 안내 전 사용자 리뷰 (「세션 spawn 안내 메커니즘」) | **Opus** |
| **FOUNDATION** (채용만) | `/workflow FOUNDATION 채용` + BG.step-1.1 완료 + BG 「레포 세우기」 완료 + `todo.md`에 이 PR 확정 | BG `background/persistent/` (채용 원본) | **`PRESET_FOUNDATION` PR을 자기 브랜치·워크트리에서 완결** (폴더 구조 마이그레이션 + 코딩 스탠다드 마이그레이션) — 절차는 전용 단계가 아니라 **표준 step-3~6**(불필요한 절차는 건너뜀) / `background/retained/folder-structure.md` / markup 워크트리 최소 셋팅. **도구 세팅(`PRESET_SETUP`)은 별개 PR**이며 정상 도미노가 처리 | **markup 워크트리 최소 셋팅 완료 시 → MARKUP** (`/workflow MARKUP 채용`) / 세션 종료 후 → 다른 PR의 PLAN을 여기서 띄우지 않는다 (PLAN spawn은 BG 몫). 이 PR에 의존하는 PR이 있으면 자기 진입 조건으로 출발한다 | 자기 PR 워크트리 (+ markup 워크트리). 다른 PR의 워크트리로 이동하지 않음 | **Sonnet** |
| **MARKUP** | (채용) FOUNDATION이 markup 워크트리 최소 셋팅을 마친 뒤 / (실무·개인) BG.step-1.1 후, `/workflow MARKUP <모드>` 호출 | (채용·실무) step-1.1 수집 figma·시안 자료 / (개인) step-1.1 수집 마크업 시안(`retained/mockup/`) — 페이지·섹션·위젯·컴포넌트 단위 | **markup 워크트리의 디자인 진실 원천 0건 완성 마크업 코드(`.tsx`·`.module.scss`)** (메인 산출물) + **공통 컴포넌트 확정·독립 산출**(전 페이지 직독, 2군데 이상=공통 → PR 확정이 소비하는 단방향 입력) + 입력: (채용·실무) `background/retained/figma-url.md`·`figma/` / (개인) `background/retained/mockup/`(+선택 `retained/spec.md`) | 없음 (PR_{N}_IMPL이 페이지 단위 마크업 코드를 그대로 가져감) | 마크업 워크트리. **포트 3000 점유** | **Sonnet** (figma URL 기준) / **Opus** (캡처-only·개인) |
| **PR_{N}_PLAN** | **`todo.md`에 이 PR 절이 확정됨** + (채용) BG 「레포 세우기」 완료 + 의존 PR이 있는 경우에 한해 (그 PR이 stub 만든 경우 그 PR.step-4 stub, 안 만든 경우 그 PR.step-6 IMPL 완료 — 의존 PR은 직전 번호가 아닐 수 있고 여럿일 수 있다. `todo.md` 해당 PR 절의 의존 항목이 출처). 의존이 없으면 확정 즉시 진입 가능 | `background/consumable/todo.md` 해당 PR 섹션 + BG 산출물 + 이미 끝난 PR들의 `persistent/` (decisions, reference, implementation — 번호상 앞선 PR이 아니라 실제로 완료된 PR) | `pr{N}/persistent/`: decisions.md, reference.md, **implementation.md**, overview.md / `pr{N}/retained/`: markup.md (UI 컴포넌트 PR만, 개인 제외) / **가벼운 PR은 step-4에서 코드 변경 + 커밋을 직접 산출**(문서만 내는 세션 아님) | step-3 종료 → WRITING_IDEATOR (PR 본문 초안, step-4 진입 전 같은 세션 도중 안내) / step-4 종료 → PR_{N}_IMPL spawn / step-4 stub 확정 시 → **본 PR의 시그니처만 필요한 PR의 출발 게이트 해제 안내** (`todo.md`의 의존 항목에서 찾는다. 세션을 새로 띄우라는 spawn 안내가 아니라 게이트가 풀렸다는 안내 — PLAN spawn 자체는 BG의 PR 확정이 유일 트리거) | PR_{N} 워크트리. 학습 인수인계 후 진입 대기 적용 | **Opus** |
| **PR_{N}_IMPL** | PR_{N}_PLAN.step-4 종료 (필수) + (페이지 코드 포함 PR이면) MARKUP의 해당 페이지 코드 (필수) + (의존 PR이 stub 만든 경우) 그 stub 시그니처 확정 (필수) | implementation.md, markup.md, MARKUP 페이지 코드, decisions·reference | 코드 변경 + 커밋 (로직 stub 위에 본체 채움; 마크업은 MARKUP 완성본 import) / `pr{N}/consumable/`: review.md, user-test-cases.md | step-6 끝 후(IMPL 세션 종료) → WRITING_REFINER / 마지막 IMPL이면(전 PR IMPL step-6 완료) → FINALIZE (fan-in) | PR_{N} 워크트리. 본 PR 하나에 집중 | **Sonnet** — stub에 `// TODO [AI_IMPL]` 한글 명세가 남아 있으면 Opus |
| **WRITING_IDEATOR** | PR_{N}_PLAN.step-3 종료 (초안 트리거) | `pr{N}/persistent/overview.md` + `pr{N}/persistent/decisions.md` (step-3 초기본, 토론 없으면 부재 가능) + `pr{N}/persistent/reference.md` + `background/consumable/todo.md` (PR 착수 시 판정 대상 — writing.md) | `pr{N}/consumable/pr-body.md` **초안**(배경·문제·접근·근거; 상세 코드블록 제외) — overview는 persistent라 **읽기만**, 어느 소비처도 삭제하지 않음 | 후속 spawn 없음 (REFINER는 IMPL·step-6 후 별도 트리거). per-PR·유연 타이밍 | **코드 워크트리 무관 — main repo `/plan/` 절대경로 참조** | **Opus** |
| **WRITING_REFINER** | PR_{N}_IMPL.step-6 종료 | WRITING_IDEATOR 입력 + `implementation.md` + 커밋 로그 + `decisions.md` 갱신분(step-6.6) + `pr{N}/consumable/` 잔여(review.md·user-test-cases.md). **pr-body 초안 부재 시 IDEATOR의 초안 만들기 선행**(write-init 앞 준비 단계 포함) | `pr{N}/consumable/pr-body.md` **확정** → PR 본문 복사·게시·삭제 / overview.md는 persistent라 읽기만(큐레이션), 삭제 안 함 / 자기 PR의 `pr{N}/consumable/` 잔여 소비·정리 (`/plan/` 전체 잔존 점검은 FINALIZE) / `pr{N}/persistent/`는 제외 (영구 보존) | 후속 spawn 없음 (per-PR·유연 타이밍 — IMPL 직후 또는 나중에 몰아서. 머지·최종화는 FINALIZE 담당) | **코드 워크트리 무관 — main repo `/plan/` 절대경로 참조**. 커밋 로그 조회 시 pr{N}→브랜치는 `git worktree list` + FOUNDATION 명명규칙(실무·개인은 worktree list 직접) | **Opus** |
| **FINALIZE** | 전 PR의 IMPL(step-6) 완료 (fan-in) | 전 PR 커밋 히스토리 + WRITING 잔여 산출물 | 재배치·메시지 최종화된 히스토리 + force-push 요청 (폴더 산출물 없음) | 채용 → 같은 세션이 recruitment 1번부터 이어서 수행 (「채용과제 마무리」) / 실무·개인 → 머지 안내 (스택은 바텀업, 독립 브랜치는 순서 무관) | 다중 브랜치, 단계별 cwd ([conventions/session/finalize.md](conventions/session/finalize.md) 「cwd」) | **Opus** |

(6) 권장 모델은 **세션 구동 모델**(사용자가 `/workflow`로 띄우는 본 세션)이다. MARKUP·IMPL이 내부에서 spawn하는 reviewer 서브에이전트는 impl-review-loop의 모델 분할을 따른다.

PLAN(step-4)은 구현을 수행하는 세션이며, 가벼운 PR은 그 자리에서 실행·커밋한다. IMPL은 PLAN이 stub으로 분해한 무거운 구현을 이어받고, PR 무게와 상관없이 **모든 PR의 step-5·6을 돈다**. PLAN이 실행 가능한 작업을 "IMPL 몫"이라며 미루지 않고, step-4에서 step-5·6을 이어 돌지도 않는다.

모드 간 차이는 MARKUP의 디자인 진실 원천·진실검사뿐이고 세션 구성·후속 관계는 같다 — 모드별 축은 [conventions/modes.md](conventions/modes.md) 매트릭스.

### 세션 spawn 안내 메커니즘

각 세션의 끝·분기점 step에서 위 「세션」 표를 참조해 후속 spawn 안내를 출력한다.

**안내는 지금 띄울 수 있는 후속이 있을 때만 나가는 출력이다.** 없으면 분기점의 응답을 그 step의 종료 결과와 다음 할 일만으로 채우고, 후속 세션이라는 화제 자체를 꺼내지 않는다 — 모드·조건 때문에 띄울 세션이 없다는 설명도, 조건이 차면 안내하겠다는 예고도 그 화제다.

**분기점 시점 인식**: 자기 세션의 표 (4) 컬럼에 적힌 트리거가 분기점이다. 두 종류가 있다.

- **step 종료형** — "step-X 후" 같은 트리거. 그 step이 세션의 끝이거나 분기점이다.
- **사건 발생형** — "PR을 확정할 때마다" 같은 트리거. **세션 한복판에서 여러 번 발동한다.** BG의 PR 확정이 여기 해당한다.

어느 쪽이든 트리거 즉시 본 절차를 발동한다 — 분석할 자료가 남아 있어도 다음 step·분석성 출력·산출물 작성을 본 절차 전에 시작하지 않는다.

- **사건 발생형에서는 안내 후 분석을 이어간다.** PR을 확정했으면 그 자리에서 안내를 내고, 남은 정독·분석을 계속한다.
- **모아뒀다 한꺼번에 안내하지 않는다.**

**fan-in 후속 (FINALIZE)**: PR_{N}_IMPL이 step-6을 끝낼 때 방금 끝낸 PR이 마지막 IMPL인지 판정(「작업 진행 순서 > FINALIZE」의 마지막 PR 판별 기준)하고, 마지막일 때만 WRITING_REFINER 안내에 더해 FINALIZE 진입도 안내한다.

**세션 경계 지키기**: 세션 종료 보고에서 남은 단계를 나열할 때는 항목마다 담당 세션을 붙인다. 종료한 세션에서 사용자가 다른 세션 몫을 지시하면 바로 받지 않고, 어느 세션 몫인지 한 번 짚은 뒤 사용자가 고르게 한다.

분기점 LLM 절차:
0. (BG, 자료 받기 종료 분기점 제외) 안내 전 사용자 리뷰 — `node {{skill_dir}}/scripts/review-ledger.mjs pending --plan /plan`을 돌려 나온 것이 없으면 1로 간다. 나왔으면 이번 분기점까지 정한 핵심을 요약한 뒤 나온 파일을 하나씩 보여주며 리뷰받는다 — 요약은 리뷰의 머리말이지 대신이 아니고, 리뷰 뒤 바뀐 파일은 스크립트가 낸 바뀐 줄만 보여준다. 사용자가 확인한 파일은 `mark --plan /plan <파일...>`로 기록하고, 리뷰 중 고친 파일은 다시 `pending`에 뜨므로 바뀐 줄을 확인받는다. `pending`이 비어야 1로 간다
1. 후속 명단 추출 — 자기 행 (4)에서 이번 트리거의 후속을 뽑는다. 이 세션의 앞선 분기점에서 조건 미충족으로 뺀 후속이 있으면 그것도 넣는다
2. 조건 판정 — 각 후속의 조건은 **그 후속 행의 (1) 진입 조건**에서 분해한다. 자기 행 (4)는 명단만 정하고 조건의 출처가 아니다
   - 자기 세션이 끝낸 step·자기 spawn 사실로 충족되는 항목 → ✓
   - 이 세션이 직접 기록하는 산출물로 판정되는 항목(`todo.md`에 PR 절이 있는가 등) → 지금 열어 판정한다. 하나라도 미충족이면 그 후속을 명단에서 뺀다
   - 다른 세션이 진행해야 차는 항목(의존 PR의 stub·IMPL 완료 등) → 그 흔적을 파일로 볼 수 있어도 판정하지 않고, 미충족 가능 단서로 표시해 명단에 둔다
3. 명단에 남은 후속만 안내한다 — 명단에서 빠진 세션은 언급하지 않고, 명단이 비었으면 아무것도 출력하지 않는다. 명단이 남았으면 후속별 spawn 가능 조건 안내 출력 (`/workflow <세션> <모드>` 인자 포함). 표 (6) 권장 모델도 함께 출력. MARKUP은 입력 모달리티(figma URL이면 Sonnet / 캡처-only면 Opus)에 따라 분기 안내. 사용자가 단서 보고 spawn 판단
4. 세션이 이 분기점에서 끝나면 후속 명단 유무와 무관하게 `/pre-exit` 호출을 한 줄로 안내한다. 세션이 이어지는 분기점에서는 내지 않는다. 보강·augmentation 디테일은 적지 않는다 (/pre-exit 내부 처리)

## 구조

- 각 step은 조건에 해당하는 **하위 스킬을 모두 로드**하는 오케스트레이터이거나, 그 자체가 실행 로직
- 해당 스킬이 여러 개이면 **순서대로 하나씩** 실행한다 (동시 로드 불가)
- 각 step의 **산출물이 다음 step의 입력**
- 하위 스킬은 워크플로우 세션의 절차(step 또는 step 없는 세션 본문) 안에서만 호출된다 (독립 호출 없음)
- MARKUP은 step 번호가 없는 세션 — 본문은 [conventions/session/markup/index.md](conventions/session/markup/index.md)(모드 공통) + 모드 파일([figma.md](conventions/session/markup/figma.md)·[personal.md](conventions/session/markup/personal.md)). WRITING·FINALIZE 본문은 아래 「작업 진행 순서」의 해당 절

## /plan/ 폴더 구조

폴더 트리·라이프사이클 규칙(persistent/retained/consumable 동작)·consumable 자가 정리 안내문 양식·피그마 URL·캡처 캐싱 룰은 [conventions/plan-folder.md](conventions/plan-folder.md) 참조.

## 작업 진행 순서

각 세션의 step 매핑. FOUNDATION은 자기 PR을 표준 step-3~6으로 수행하며, 고유 입력·제약은 [conventions/session/foundation.md](conventions/session/foundation.md) 참조.

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

PR 1~N 본문을 연속 작성하는 상시 2세션. 본문은 [conventions/session/writing.md](conventions/session/writing.md).

### FINALIZE (전 PR IMPL 완료 후, step 없음)

전 PR IMPL 완료 후 1회 실행하는 종료 페이즈 세션. replace(오배치 재배치)·메시지 최종화·머지 안내는 [conventions/session/finalize.md](conventions/session/finalize.md) 참조.

**마지막 PR(=마지막 IMPL) 판별**: `todo.md`를 읽어 IMPL이 아직 안 끝난 PR이 남았는지 본다. 남아 있지 않으면 방금 끝낸 IMPL이 마지막이다. `todo.md`에 PR 절이 없거나 비어 있으면 브랜치·PR 목록을 폴백 원천으로 쓴다. `pr{N}` 디렉토리 존재는 보조 신호일 뿐이고, **번호는 확정 순서라 완료 순서가 아니므로 "가장 높은 번호"로 판정하지 않는다**.

### 채용과제 마무리 (FINALIZE 본문 후 같은 세션, 채용과제만)

채용 모드에서는 FINALIZE 세션이 자기 본문을 마친 뒤 새 세션을 띄우지 않고 [recruitment](recruitment/SKILL.md)를 1번부터 이어서 수행한다. 7번(자산 회수)은 컨텍스트가 커졌으면 사용자가 새 세션으로 옮겨도 된다.

## step 경계 (전환·세션경계·후속)

각 step이 끝날 때의 전환·세션경계는 이 표를 따른다.

| step | 세션 내 위치 | 종료 직후 전환 | 세션 경계 |
|---|---|---|---|
| step-1.1 | BG 분기점 (실무·개인) | (실무·개인) 후속 안내 메커니즘 발동(분석 전) → step-1.2 / (채용) → step-1.2 | 분기점 (세션 계속) |
| step-1.2 | BG 마지막 | 후속 안내 메커니즘 발동 | BG 세션 종료 |
| step-3 | PLAN 중간 | → step-4 (WRITING_IDEATOR 초안 트리거는 메커니즘 소관) | 아니오 |
| step-4 | PLAN 마지막 | PR_{N}_IMPL로 메커니즘 | PLAN 세션 종료 |
| step-5 | IMPL 중간 | → step-6 | 아니오 |
| step-6 | IMPL 마지막 | 후속 안내 메커니즘 발동 | IMPL 세션 종료 |

공통 종료 절차(자가검토·부정명시 점검·보고)는 「step 종료 시퀀스 미스킵」·「자가 검토 필수」·「부정 명시 메아리 자가 점검」을 따른다.

## 지킬 원칙

### 기억 의존 금지
- 각 단계 시작 전 직전 산출물 다시 읽기 (기억 의존 금지, 파일 현재 상태 기준)

### 단계별 승인 대기
- 각 단계 완료 후 **반드시 사용자 승인** 후 다음 단계

### 검증 기준 = 진실 원천

리뷰·검증 단계의 기준은 항상 진실 원천(figma 원본 URL, 컨벤션 1차 소스, 사용자 발화 등)이다. **AI 산출물(matching 표, 산출물 md 등)을 검증 기준으로 쓰지 않는다.**

AI 산출물의 역할은 **Implementer 캐시·인덱스**로만 한정한다 — figma 호출 비용 절약, 컨벤션 경로 빠른 조회 등. Reviewer 절차에는 진실 원천 직접 fetch·참조를 명시한다.

### step 진입 시퀀스

각 세션·step 진입 시점에 다음을 **순서대로** 수행한다. SKILL.md만 보고 자기 지식·기억으로 진행하지 않는다.

1. **해당 step.md 전체를 즉시 Read** — SKILL.md 「작업 진행 순서」 표에서 자기 세션의 step 파일 경로를 찾아 처음부터 끝까지 읽는다. 산출물 작성 시점에 부분 Read 하지 않는다.
2. **도입부 절차부터 실행** — step.md 도입부에 적힌 절차(Plan mode 진입 / 컨벤션 사전 참조 / 입력 산출물 탐색 / 사용자 질문 등)를 산출물 작성보다 먼저 실행한다.
3. **사용자 질문 절은 건너뛰지 않는다** — step.md에 "사용자에게 X를 질문한다"는 절이 있으면 반드시 묻는다. "이미 알고 있다"·"입력 산출물에서 추정 가능"으로 자기 면제 금지.

### 워크트리 cwd 이동은 사용자 세션으로

작업 위치가 워크트리인 step에서 메인 세션이 직접 cwd를 옮길 수 없으면, 그 워크트리 디렉토리에서 세션을 이어 진행하도록 사용자에게 안내한다. 세션을 새로 띄우든 기존 세션을 옮기든 사용자가 정한다. 이 안내는 cwd를 옮기기 위한 세션 연속이지 다음 세션으로의 핸드오프가 아니다 — 담당 step은 그대로다.

### 사용자 강도 표현 가드

사용자 발화에 강도·범위 강조 표현이 등장하면 (예: "풀로", "전부 다", "만만히 보지 마", "세게", "빠짐없이", "엄격하게", "꼼꼼히") 이는 **AI의 1차 후보 범위가 부족할 수 있다는 신호**다. 사용자가 본 1차 후보 안의 풀셋을 뜻하는 게 아니라, AI가 더 큰 1차 소스로 재검증할 것을 요구하는 발화로 해석한다.

발동 절차:
1. MP `docs/best-practices/`와 거기서 이어지는 `docs/patterns/` 본문을 즉시 탐색·Read
2. 1차 소스에서 발견한 항목이 AI 1차 후보보다 많으면, **추가 항목을 사용자에게 자동 제안** (사용자가 묻기 전에)
3. 추가 항목이 PR 범위 안인지 사용자 확인 후 implementation에 반영

### Plan mode 강제 진입

step.md 도입부에 "**Plan mode 필수**" 표기가 있는 step(step-3·step-4 등)에 진입할 때 EnterPlanMode 도구를 명시 호출한다.

사용자의 짧은 OK 발화("ㅇ", "좋아", "step-4 진입해", "ok")는 plan mode 면제 트리거가 아니다. 사용자가 명시적으로 "plan mode 끄고 진행"·"바로 작성"이라 발화하지 않는 한 plan mode 진입.

산출물 초안 제시 + 사용자 승인 라운드를 plan mode 안에서 진행.

### step 종료 시퀀스 미스킵

각 step 본문의 종료 절(번호 매겨진 마지막 절들)을 **모두** 실행한다.

사용자의 짧은 OK 발화("ㅇ", "좋아", "ok")가 spawn 안내·보고 출력으로 즉시 흘러가도록 휩쓸지 않는다. 산출물 OK ≠ step 종료 — 종료 절 실행 후가 step 종료다.

특히 빠뜨리기 쉬운 절차:
- **Reviewer 팀 에이전트 spawn** — 산출물 OK 발화는 reviewer 진입 트리거지 종료 트리거가 아니다.

종료 절은 보고·spawn 안내 출력 전에 모두 끝나야 한다. 종료 절 실행 결과는 보고에 합산.

### 자가 검토 필수

각 세션 경계에서 산출물을 2단으로 검증한다.

- **세션 종료 시 셀프 리뷰**: 그 세션에서 생성·수정한 산출물 파일을 검증 소스와 1:1 대조한다. 검증 소스는 LLM이 자율 식별한다 (직전 산출물, 세션 입력 자료 중 검증 근거가 되는 자료).
  - **핵심 명세(Figma 명세 같은 1차 입력)는 항목 체크리스트로 점검**. 명세의 모든 항목을 한 줄씩 ✓/누락 표기.
- **다음 세션 시작 시 외부 검증**: 새 세션이 진입하면 이전 세션의 산출물을 외부 시각으로 한 번 더 검증한다.
- 같은 세션 안의 step 전환(예: 같은 BG 세션 안 step-1.1→1.2)에는 적용하지 않는다.
- 산출물 파일이 없는 세션(예: 코드 작업 위주의 IMPL 세션)은 reviewer 에이전트 파이프라인이 검증을 담당하므로 일반 자가 검토는 적용하지 않는다.
- 발견된 이슈는 수정한 뒤 보고에 포함한다.
- **핵심 결정 사항을 요약하여 보고**한다.
- 보고 형식: 항목별 체크리스트·근거를 화면에 줄줄이 노출하지 않는다.
- 각 step의 "보고 내용" 섹션에 정의된 추가 항목이 있으면 함께 따른다.

### 부정 명시 메아리 자가 점검

산출물 파일을 저장한 직후, 사용자에게 보고하기 전에 반드시 점검한다. 사용자가 발화에서 부정 지시("X 쓰지 마", "Y 만들지 마")한 항목을 산출물에 메아리("X 안 쓴다", "Y 미적용", "Z 안 만든다")로 다시 적었는지 확인하는 절차. **사용자가 적지 말라고 한 모든 것을 적지 않는 게 디폴트**다.

절차:

1. 산출물 텍스트에서 부정 표현이 등장하는 라인을 찾는다. 찾는 갈래는 [conventions/negative-mirror-patterns.md](conventions/negative-mirror-patterns.md) 참조.
2. 걸린 각 라인을 분류:
   - **사용자 메아리** — 발화의 부정 지시를 산출물에 다시 적은 것. 삭제. **인용 블록·"사용자 발화" 섹션 등 인용 형식으로 박은 것도 메아리에 해당**.
   - **자체 판단 + 명시 근거 동반** — 같은 문장 또는 인접 라인에 측정값·기존 패턴·BG 결정 등 근거가 명시되어 있음. 유지.
   - **자체 판단인데 근거 없음** — 자체 판단이라도 근거 없으면 노이즈. 삭제 또는 근거 보강.
3. 사용자 메아리·근거 없는 자체 판단이 1건이라도 있으면 삭제·보강 후 1번부터 재실행. 0건이거나 모두 근거 동반일 때 종료.

**판정 우선순위**: 위 2번의 분류는 트리거 보조이고, 첫머리의 디폴트를 위반하면 어느 갈래에도 안 걸려도 메아리로 처리한다. "발화 원문이라 인용일 뿐"·"근거 동반 형식이라 정상"으로 자기 면죄 금지.

산출물 파일을 만드는 세션에서 작성하는 모든 산출물에 적용한다. 위 「자가 검토 필수」의 1:1 대조와 별개 갈래로 보고, 두 점검을 모두 통과해야 산출물 종료다.

### 입력 산출물 비판적 검토

세션·step 진입 시 입력 컨텍스트로 받은 **AI가 만든 결정·narrative 산출물**을 그대로 수용하지 않고 비판적으로 검토한다.

- **대상**: 위 「세션」 표 「(2) 입력 컨텍스트」 컬럼의 산출물 중 AI 결정·narrative만. figma·코드·사용자 발화·1차 입력은 제외 (그쪽은 「검증 기준 = 진실 원천」 담당)
- **범위**: 자기가 참조·재사용·확장하는 부분에 한정 (전부 다 의심하지 않는다)
- **기준**: 자기가 이미 로드한 컨벤션 + 보안·성능·정확성. 검증을 위해 추가 컨벤션 로드 금지
- **도전 트리거**: 정당화 근거가 로드된 컨벤션·보안·성능·정확성이 아니라 관성적 사유(있어 보임, 그럴듯함, "보통 이렇게 함")면 도전
- **발견 시 처리**: 사용자에게 보고. 별 PR/이슈로 분리할지 이번 영역에서 다룰지는 사용자가 결정. AI 단독 폐기·수용 금지 — "재결정했다"·"정정했다"·"교체했다"·"폐기했다" 같은 결과 단정 표현으로 입력 결정을 자기 권한으로 뒤집지 않는다. 보고 형식은 "BG/이전 세션 결정 X에 우려 Y 발견 → 어떻게 진행할지 결정 필요" 식의 결정 위임 형태로 출력한다. 새 산출물(decisions.md 등)에는 "보류"·"플래그" 절로 표기하고, 사용자 결정 후 확정

### 선행조건 자가체크
- 각 step은 `/plan/`을 탐색하여 이전 단계 산출물과 맥락을 스스로 파악한다. 탐색 결과 중 AI 결정·narrative 성격 산출물은 메타 룰 「입력 산출물 비판적 검토」 적용
- 필요한 맥락이 부족하면 사용자에게 질문한다
- 이전 step을 거치지 않고 진입해도 자연스럽게 대응 (step 스킵 허용)

### 코드 경계 재설정은 사용자가, AI는 네이밍

이미 존재하는 코드를 **옮기거나 쪼개는 편집**(컴포넌트 추출, 코드블록 분리, 파일·폴더 이동, 공용 위치로의 승격)은 경계 결정도 실행도 사용자가 직접 한다. 사용자가 코드를 옮겨놓으면 AI는 그 결과물에 **네이밍 후보를 제시**한다.

- 대상은 기존 코드의 재배치다. 새 코드를 처음 쓰면서 파일을 나누는 것은 대상이 아니다.
- **예외**: 판정 기준까지 문서에 박아 AI에게 경계 판정을 맡긴 합의 절차는 그 절차를 따른다 (예: [markup 컨벤션](conventions/session/markup/index.md) 「공통 컴포넌트 확정」의 공통성 판정).

### todo.md 산문·초기 셋업 CLI는 사용자가

위임했을 때 검증 왕복이 직접 하는 것보다 비싼 것은 그 자리에서 사용자에게 넘긴다.

- **todo.md의 산문 서술** — 프로젝트 설명·설계 결정 서술처럼 이어 쓰는 글은 사용자가 쓴다. AI는 넣을 항목·방향을 후보로 제시하고 기다린다. **완성문을 지어놓고 "이대로 갈까요"로 승인받는 방식도 대상이다**.
- **프로젝트 생성기** (`yarn create vite` 류) — 실행할 명령을 안내하고 사용자 실행을 기다린다.
- **레포 세우기** (`git init`·gitignore·초기 커밋) — 실무·개인 모드는 명령을 안내하고 사용자 실행을 기다린다. 채용 모드는 원격까지 BG가 한다. 절차: [레포 세우기](requirement-review/recruitment/guide.md#레포-세우기)

경계:

- TODO·발견 항목·기술 결정 후보 같은 **리스트**는 AI가 todo.md에 직접 기록한다. 넘기는 것은 산문뿐이다.
- 초기 셋업 이후의 일반 git 조작은 대상이 아니다.
- 효율을 이유로 대신 쓰거나 대신 실행하지 않는다.

### 곁길 주제는 별도 세션으로 빼자고 묻는다

세션 본래 일이 아닌 결정·버그 추적이 생기면 [conventions/session/side-session.md](conventions/session/side-session.md)를 따른다.

### 학습 인수인계 후 세션 진입 대기 (PR_{N}_PLAN 한정)

- step-1의 "작업 익숙도 판별"에서 인수인계 문서가 작성되었으면, **PR_{N}_PLAN 진입 안내** 시 **"사용자가 인수인계 문서 학습을 완료한 뒤 진입하라"** 는 조건을 함께 안내한다.
- 학습 완료 여부를 사용자에게 확인하지 않은 채 PR_{N}_PLAN 진입을 단정적으로 권하지 않는다.
