---
step: pr-body-final
session: WRITING_REFINER
scope: project
entry: PR_{N}_IMPL의 verify 종료
model: Opus
next: []
---

# pr-body-final: PR 본문 확정

구현·커밋이 완료된 뒤 IDEATOR 초안([pr-body-draft.md](pr-body-draft.md))을 실제 산출물과 정합시켜 확정하고, consumable을 정리한다.

이 세션도 **상시 세션**이다.

## 입력·산출물·작업 위치

- **입력**:
  - WRITING_IDEATOR 입력([입력](pr-body-draft.md#입력산출물작업-위치): overview·decisions·reference·todo.md) +
  - `pr{N}/persistent/implementation.md`
  - 커밋 로그 (브랜치 유도는 아래 「cwd」)
  - `decisions.md`의 [verify 「decisions.md 최신화」](verify.md#step-66-decisionsmd-최신화) 갱신분
  - `pr{N}/consumable/` 잔여 산출물
- **산출물**: `pr{N}/consumable/pr-body.md` **확정** → PR 본문 복사·게시·삭제 / 자기 PR의 `pr{N}/consumable/` 잔여 소비·정리 (`pr{N}/persistent/`는 제외)
- **작업 위치**: main repo `/plan/` — 코드 워크트리 무관 (아래 「cwd」)

## cwd

코드 워크트리 무관 규칙은 [cwd — 코드 워크트리 무관](pr-body-draft.md#cwd--코드-워크트리-무관)을 따른다.

REFINER가 커밋 로그를 읽을 때 pr{N}→브랜치명은 워크트리 목록과 [PR 워크트리 명명규칙](realize-plan.md#사전-준비-브랜치워크트리-생성)으로 유도한다.

## fallback — pr-body 초안 부재 시 (IDEATOR 역할 흡수)

**IDEATOR의 [초안 만들기](pr-body-draft.md#초안-만들기)를 준비 단계부터 그대로 거쳐 초안을 만든 뒤 refine한다.** write-init 호출만 떼어 부르지 않는다.

## 절차

[「PR 착수 시 todo.md 판정」](pr-body-draft.md#pr-착수-시-todomd-판정)을 거친 뒤 `/write-refine <pr-body 경로>`를 호출해 표현을 다듬고([「장기세션 재사용」](pr-body-draft.md#장기세션-재사용)대로 같은 REFINER 세션에서 이어 한다), 실제 구현·커밋과 어긋난 서술을 바로잡고 코드블록을 채워 확정한다. 본문에 담는 재료는 [write-init pr-body 템플릿](../../write-init/templates/pr-body.md)을 따른다.

## 산출물 정리

확정된 `pr-body.md`를 PR 본문으로 복사·게시한 뒤 삭제한다. 이어서 `/plan/pr{N}/consumable/`의 각 산출물 절을 PR 본문 및 코드와 대조하여 **소비**한다. consumable 소비 후 정리는 큐 모델을 따른다 ([소비→삭제 메커니즘 SSOT](../conventions/plan-folder.md#소비삭제-메커니즘-ssot--소비처-step은-소비만-선언)).

- **PR 본문·코드와 대조하고도 남은 절은, 지우거나 다른 곳으로 옮기기 전에 같은 내용이 이미 다른 파일에 있는지 검색한다.** 그 절의 핵심 사실·수치·판단을 낱말로 잡고 같은 사실을 가리키는 다른 표현(제품명과 엔진명, 한글과 영문)도 함께 넣어 `/plan/` 전체(그 파일 자신은 빼고)를 검색하고, `/plan/` 밖으로 옮기면 옮겨갈 곳도 검색한다. 검색에 걸린 곳이 같은 사실이 아니면 사본을 찾은 것으로 치지 않고 다른 낱말로 다시 찾는다. 있으면 판본 차이만 그곳에 옮긴 뒤 지운다. 없으면 `persistent/`나 사용자와 정한 곳으로 옮긴다. 다른 consumable 파일로는 옮기지 않는다.
- **`/plan/pr{N}/persistent/` 하위는 정리 대상에서 제외** — 영구 보존 자료. 대조도 수행하지 않는다.

대조 자체는 수행하되, 사용자에게는 소비·유지 파일 목록(유지 시 한 줄 사유)만 보고한다. 내용 매핑을 항목별로 줄줄이 노출하지 않는다. 단, 위 검색을 거친 절은 무엇으로 어디를 찾았고 결과가 어땠는지 한 줄씩 적는다.

## 전역 최종화·머지는 FINALIZE 담당

메시지 최종화·오배치 커밋 재배치·머지 안내는 WRITING이 아니라 **전 PR IMPL 완료 후 FINALIZE 세션**에서 1회 수행한다.
