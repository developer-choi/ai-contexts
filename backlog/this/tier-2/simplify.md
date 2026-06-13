---
target: deploy/skills/simplify/
---

# simplify

## 동기

모델과 `/simplify` 스킬은 계속 개선된다. 그래서 과거에 init·간소화된 `simplified-*` 프로젝트의 **인프라**(분석 문서 양식·패턴 분류 규칙·정리 기준·폴더 구조)는 시간이 지나면 낡은 표준이 된다. 하지만 모든 파일을 항상 최신 simplified로 유지할 필요는 없다 — 사용자는 분석하고 싶은 파일을 그때 골라 간소화하면 되고(`analysis-queue.md` 큐 방식), 진짜로 낡는 건 개별 간소화 결과가 아니라 인프라다. 따라서 **재간소화 없이 인프라만 현행 표준으로 끌어올리는 모드**가 필요하다.

## [ready] renew 모드 — init의 재생성 가능 단계(Step 3~8)만 재적용

scope: global (deploy/skills/simplify/ 전체)

### 기대상황

`/simplify renew`(이름 미확정, `refresh` 후보) 모드가 존재한다. 기존 `simplified-*` 프로젝트에서 호출하면 **init의 "재생성 가능한 단계만" 현행 표준으로 다시 적용**한다. 본질적으로 `deploy/skills/simplify/initialize.md`의 **Step 3~8을 기존 프로젝트에 재실행**하는 것이며, clone(Step 1)·git 재초기화(Step 2)·첫 간소화(Step 9)는 건너뛴다.

재적용 대상 (각 단계의 현행 의미):
- **Step 3~5 정리**: 옛 스킬이 안 지운 cruft 삭제. 예) 원본 라이브러리 `docs/`(현행 init은 삭제), monorepo/lint 설정. 변경 있으면 별도 커밋.
- **Step 6 구조**: 폴더 구조를 현행 표준에 맞춤.
- **Step 7**: `docs/codebase-structure.md`·`docs/analysis-queue.md`를 현행 양식으로 갱신.
- **Step 8**: `instructions/keep-patterns.md`·`instructions/simplification-patterns.md`를 현행 규칙으로 **재분류·재검증**. 예) simplification-patterns의 `[반복](여러 파일)` vs `[단일](한 파일 서브시스템 — 해당 target 계획에서 처리)` 분류, lanes류는 delta-over-sibling `CONTESTED` 표기.
- init 리뷰어 체크포인트(`deploy/skills/simplify/init-review.md`)를 갱신 산출물에 적용.

보존 (절대 안 건드림):
- 간소화된 소스 파일 전체 — 재간소화하지 않는다.
- `analysis-queue.md`의 `완료` 기록 — 어느 파일이 끝났는지.
- 패턴 문서의 **축적된 라이브러리 고유 내용** — 형식·분류만 현행화하고 내용은 보존한다. 패턴은 실제 간소화 작업에서 학습된 것이라 작업을 다시 하지 않으면 재발굴 불가 → renew는 "재포맷·재검증" 수준이지 "재발굴"이 아니다.

### 현재상태

renew 모드 없음. simplify에는 `init`(새 프로젝트)과 일반 작업 사이클(`main.md`)만 있다. 옛 스킬로 만든 프로젝트를 현행화하려면 수동으로 단계를 골라 적용하거나 전체 re-init(소스 재간소화 손실) 외에 길이 없다.

실제 사례: `~/WebstormProjects/simplify/simplified-radix-ui-primitives`(AC = `~/WebstormProjects/main/ai-contexts/`, 2026-06 기준 존재)는 옛 스킬로 init됨 — 리뷰어 체크포인트·`[반복]/[단일]` 패턴 분류·원본 docs 삭제·커밋 구조 표준이 모두 이전 버전. renew가 있으면 소스 재작업 없이 이 프로젝트의 문서·패턴·정리를 현행 표준으로 올릴 수 있다.

### 한계 (renew.md 본문에 반드시 명시)

git 히스토리는 renew로 못 고친다. 옛 프로젝트의 가장 큰 인프라 결함이 "원본 미보존 커밋 구조"(커밋1이 정리된 상태라 원본을 history에서 못 봄)인데, 이는 히스토리 재작성 없이는 불가 → **re-init만 해결**한다. renew는 "재생성 가능한 인프라"에 한정한다. 이 한계를 renew.md에 박아 사용자가 "renew하면 커밋 구조도 고쳐지겠지"라고 오해하지 않게 한다.

### 현재 생각중인 방법

- 새 mode arg `/simplify renew`. SKILL.md에 라우팅 1줄 + `renew.md`(절차) 추가. argument-hint를 `[init | renew | 작업 단계]`로 갱신.
- `renew.md`는 절차를 새로 쓰지 않고 `initialize.md` Step 3~8을 "기존 프로젝트" 단서(보존 규칙·재클론 금지·완료 보존)와 함께 **재사용**한다(SRP·단일 출처). 관건은 initialize.md의 해당 단계를 renew가 깔끔히 호출할 수 있게 표현하는 것 — init 전용 문구와 재사용 가능 문구의 분리.

### 첫 행동

`/scw` + `skill-creator`로 진입. `initialize.md` Step 3~8을 renew가 재사용할 수 있도록 "기존 프로젝트 재적용" 분기를 어떻게 표현할지 설계(초기화 전용 단서를 분리할지, 공용 절로 뽑을지)부터 결정한다. 그 다음 `renew.md` 작성 → SKILL.md 라우팅 + argument-hint 갱신 → `npm run sync:system` 배포.

### 종료 조건

`/simplify renew`가 배포되어, 기존 `simplified-*` 프로젝트에서 호출 시 소스·완료기록·패턴 내용을 보존한 채 문서·패턴·정리·폴더구조를 현행 표준으로 갱신하고 init 리뷰어를 통과하면 이 항목을 삭제한다. (행동 교정 룰이 아닌 기능 추가이므로 벤치 채점 재료는 해당 없음.)
