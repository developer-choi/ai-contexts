---
step: requirement
session: BG
scope: project
entry: >-
  `/workflow BG <모드>` 호출 (유일 루트)
model: Opus
next:
  - to: markup
    on: 레포 확보
    when: FOUNDATION PR 없음, 코드 대용 아님
  - to: plan
    on: PR 확정
---

# requirement: 배경 파악

이 step은 결과물 스펙(WHAT) — 동작·기획·디자인 — 까지 정한다. "무한스크롤이 필요하다"까지다.
작업 위치는 main repo `/plan/background/`이고, 산출물은 [plan-folder.md](../conventions/plan-folder.md) 트리에서 requirement 산출·수집으로 표시된 것이다.

맨 아래 「진행 중 일어나는 일」은 순서와 무관하게 그 일이 일어날 때 한다.

---

## 자료 받기

자료를 받아 저장하는 데까지만 한다. 가진 것 중 가장 완성도 높은 원본을 여기서 받는다.

1. 채용 모드면 공고·메일·과제요구사항을 [입력 자료](../requirement-review/recruitment/step.md#입력-자료)·[입력 자료 저장 시 제외 항목](../requirement-review/recruitment/step.md#입력-자료-저장-시-제외-항목)대로 `/plan/background/persistent/`에 저장한다.
2. 모드의 시각 원본을 사용 가능한 만큼 전부 받아 [모드 매트릭스](../conventions/modes.md)의 저장 위치에 둔다.
   - 개인 모드에서 화면에 안 담기는 동작을 저자가 미리 알고 있으면 `retained/spec.md`로 함께 받는다
   - 시안·기획서 없이 기존 구현 코드만 있으면 그 코드를 [코드 대용](../requirement-review/page-review.md#준비)으로 쓸지 묻고, 쓰기로 하면 리뷰 대상 코드 경로를 `retained/code-target.md`로 받는다
   - 사용자가 이미 가진 참고 자료(디자인시스템 소스 등)도 함께 받는다
3. 받은 자료를 점검한다. figma 쓰는 모드면 [figma-asset-collection.md](../conventions/figma-asset-collection.md)대로 수집 방식을 점검한다.
   흐린 영역·식별 어려운 텍스트는 메인이 직접 훑지 않고 일회성 서브에이전트에 받은 자료 경로(figma 쓰는 모드면 figma-asset-collection.md도)를 넘겨, 다시 요청할 지점(파일·영역·무엇이 안 읽히는지) 목록만 돌려받아 다시 요청한다.
4. 작업 레포가 있으면 [conventions-index.md](../conventions/artifact/conventions-index.md)대로 컨벤션 소스를 모아 `retained/conventions-index.md`를 만든다. 레포가 아직 없으면 「레포 확보」로 미루고, 개인 모드 신규 레포면 레포 생성 명령을 안내한다.
5. `node {{skill_dir}}/scripts/step-gates.mjs artifacts`로 이 단계의 산출물이 다 있는지 센다.

## 작업 익숙도 판별

사용자에게 이번 작업에서 처음 다루는 기술이나 낯선 영역이 있는지 확인한다. 물을 때 드는 예는 자료에 이미 정해진 것(과제요구사항이 강제한 스택 등)에서만 고른다.

낯선 작업이면 공부 세션용 인수인계 문서를 쓴다.

- 이 기술이 왜 필요한지 (작업 배경, 해결하려는 문제)
- 알아야 하는 키워드, 핵심 API 등을 학습 순서대로 나열

쓴 직후 아래 안내를 따로 낸다.

> 학습 인수인계 문서를 만들었습니다: `{인수인계 문서 경로}`
> 새 세션(창)을 하나 더 띄워 이 문서를 넘기고, 그 세션에서 학습을 진행해 주세요.
> 이 세션은 학습이 끝나기를 기다리지 않고 기획을 계속 진행합니다.

## requirement-review 호출

[requirement-review](../requirement-review/SKILL.md)를 호출한다.

## 마치기

「후속 세션 안내 전 리뷰」를 받고 requirement를 마친다.

---

## 진행 중 일어나는 일

### 레포 확보

작업 레포가 생기는 때는 모드마다 다르다.

- 채용: requirement-review의 [레포 세우기](../requirement-review/recruitment/step.md#레포-세우기)를 마쳤을 때
- 실무: 기존 레포 — 「자료 받기」를 마쳤을 때
- 개인: 기존 레포면 「자료 받기」를 마쳤을 때, 신규면 사용자가 만든 뒤

레포를 확보하면:

1. 컨벤션 소스 수집을 미뤄 뒀으면 지금 한다. 이때 나가는 후속 안내(MARKUP·FOUNDATION PR)보다 conventions-index.md를 먼저 만든다.
2. FOUNDATION PR 유무를 정하고, 있으면 그 PR을 확정한다(적용 모드는 [PR 종류](../conventions/pr-split.md#pr-종류)).

### PR 확정

PR은 [pr-split.md](../conventions/pr-split.md)대로 확정·기록한다. 확정할 때마다 범위 한 줄, 선행마다 착수에 필요한 것, 열린 질문을 사용자에게 보고한다.

공통 컴포넌트 판정(MARKUP이 전 페이지를 본 뒤 나온다)에 경계가 걸리는 PR을 MARKUP 진행 중에 확정·출발시키려 하면 그 사실을 먼저 알린다.

### 후속 세션 안내 전 리뷰

후속 세션을 안내하기 전에 사용자 리뷰를 먼저 받는다. 「레포 확보」로 MARKUP만 안내할 때는 하지 않는다.

- `node {{skill_dir}}/scripts/review-ledger.mjs pending`이 빌 때까지, 이번까지 정한 핵심을 요약한 뒤 나온 파일을 출력대로 하나씩 보여 주며 리뷰받는다
- 확인받은 파일은 `mark`로 기록한다
