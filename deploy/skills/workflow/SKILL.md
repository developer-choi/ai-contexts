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

**분기점 시점 인식**: 자기 세션의 표 (4) 컬럼에 적힌 "step-X 후" 또는 "단계-Y 후" 같은 트리거 step이 분기점이다. 그 step 종료 즉시 본 절차를 발동 — 같은 세션 안 다음 step·분석성 출력·산출물 작성을 본 절차 전에 시작하지 않는다.

**분석 욕구 가드**: 분기점 step 종료 시점에 분석할 자료가 잔뜩 있어도(시안 정독, cross-analysis, 평가 기준 추론 등) spawn 안내를 먼저 출력한다. 분석은 후속 세션이 spawn 가능한 상태가 된 후 진행. 분석성 출력 텍스트의 분량과 절차 안내의 우선순위를 혼동하지 않는다.

종료 시 LLM 절차:
1. 표에서 자기 후속 명단 추출
2. 각 후속의 선행 분해 — 자기 선행·방금 끝낸 step은 ✓ (자기 spawn 사실로 충족 추론), 병렬 세션 종료 항목은 미충족 가능 단서로 표시
3. 후속별 spawn 가능 조건 안내 출력 (`/workflow <세션> <모드>` 인자 포함). 사용자가 단서 보고 spawn 판단

## 구조

- 각 step은 조건에 해당하는 **하위 스킬을 모두 로드**하는 오케스트레이터이거나, 그 자체가 실행 로직
- 해당 스킬이 여러 개이면 **순서대로 하나씩** 실행한다 (동시 로드 불가)
- 각 step의 **산출물이 다음 step의 입력** — step마다 "참고 자료"로 입력 산출물이 명시되어 있음
- 하위 스킬은 워크플로우 step 내에서만 호출된다 (독립 호출 없음)
- FOUNDATION·MARKUP은 step 번호가 없는 세션 — 본문은 [conventions/session/foundation.md](conventions/session/foundation.md) / [conventions/session/markup.md](conventions/session/markup.md) 단일 출처

## 시작 전 준비

- `template/context-setup.md` 양식으로 레포지토리 Context 수집
  - **실무 프로젝트**: 필수
  - **채용 과제 등**: 생략 가능

## /plan/ 폴더 구조

폴더 트리·라이프사이클 규칙(persistent/retained/consumable 동작)·consumable 자가 정리 안내문 양식·피그마 URL·캡처 캐싱 룰은 [conventions/plan-folder.md](conventions/plan-folder.md) 참조.

## 작업 진행 순서

각 세션의 step 매핑. FOUNDATION·MARKUP은 [conventions/session/foundation.md](conventions/session/foundation.md) / [conventions/session/markup.md](conventions/session/markup.md) 참조.

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
- 적용 범위: PR_{N}_PLAN만. PR_{N}_IMPL·PR_{N}_WRITING은 PLAN 결정을 따라가는 AI 구현·본문 작성이라 사용자 학습 결과 직접 필요 X. BG·FOUNDATION·MARKUP은 spawn 시점에 학습 인수인계가 아직 없거나 시점 모순.
