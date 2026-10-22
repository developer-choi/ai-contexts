---
name: workflow-requirement-review
description: 기획서, 디자인 시안, 채용과제 요구사항을 개발자 관점에서 리뷰한다. 모호한 부분, 엣지케이스를 찾아내고 산출물을 만든다.
argument-hint: "<입력 타입(planning, design, recruitment)>"
---

# 요구사항 리뷰

AI는 요구사항을 비판적으로 분석해 사용자에게 설명한다. 모호한 부분을 짚고, 엣지케이스를 먼저 꺼내며, 개선안을 제시한다. 장단점을 함께 설명한다.

## 목적

구현에 들어가기 전에 요구사항의 모호한 곳과 엣지케이스를 사용자와 함께 확정해, 다음 세션이 읽을 산출물로 남긴다.

## 입력 타입

argument로 플래그를 받는다.

- recruitment → [recruitment/guide.md](recruitment/guide.md)
- planning → [planning/guide.md](planning/guide.md)
- design → [design/guide.md](design/guide.md)

### 실행 순서

1. recruitment가 켜져 있으면 그 가이드의 「분석 과정」을 먼저 끝낸다.
2. planning·design 중 하나라도 켜져 있으면 「준비」 → 「페이지 단위 루프」 → 「종합」을 한다.
3. 「자유 검토」를 한다.

이 리뷰가 `consumable/` 아래에 새로 만드는 파일에는 만들 때 [자가 정리 안내문](../conventions/plan-folder.md#consumable-산출물-자가-정리-안내문)을 붙인다.

---

## 확정 칸에 올리는 것

플래그를 가리지 않고, 이 리뷰가 쓰는 산출물 전부(page.md·global.md·todo.md·tech-constraints.md 등)의 「확정」 칸에는 사용자가 고른 것만 올린다. AI가 권장만 한 것은 확정 칸 밖에 권장안으로 둔다.

---

## 자료 종류

가이드의 「입력 자료」는 기획서·디자인 시안을 기준으로 적혀 있다. 아래 자료로 리뷰할 때는 그 자리에 이 자료를 넣는다.

### 마크업 시안 (개인 모드)

`background/retained/mockup/`과 `background/retained/spec.md`(있으면)가 기획·디자인 원본이다.

- 색·간격·크기·글꼴·배치처럼 시안이 값을 정하는 시각 항목은 시안을 원본으로 두고, 산출물에는 의도·구조와 동작·API·메타를 적는다. 「확정」의 대조 서브에이전트에도 이 기준을 넘긴다.

### 기존 코드 (코드 대용)

`background/retained/code-target.md`가 있으면 그 파일이 적은 기존 구현 코드를 기획·디자인 자료 대신 쓰고, 체크리스트를 코드에 대입해 현재 동작을 역산한다.

대상 코드는 메인이 읽지 않고, 리뷰 동안 코드 읽기 팀원(`workflow-code-reader`) 하나에 맡긴다. 이미 떠 있으면 이어 쓴다([team-agent](../../../contexts/team-agent.md#claude-code)).

- 「준비」의 루프 대상 페이지: 팀원이 대상 코드의 라우트·화면에서 뽑은 목록
- 「같이 분석」: 페이지마다 대상 코드 경로와 적용할 체크리스트 폴더 경로를 넘기고, 페이지 유형과 체크리스트 항목별 현재 동작·근거 `파일:줄`만 돌려받아 page.md를 채운다
- 「확정」·「자유 검토」에서 원본을 확인할 일: 팀원에게 묻는다

---

## 준비

받은 자료와 이미 쓴 산출물로 답이 안 나온 페이지·항목만 짚어 요청한다.

1. 켠 가이드의 「맥락 수집」 항목을 묻는다.
2. 루프 대상 페이지를 수집된 자료에서 뽑아 사용자에게 확인받는다.
3. [output-template.md](output-template.md)의 global.md 템플릿을 `/plan/background/consumable/global.md`에, page.md 템플릿을 루프 대상 페이지마다 `/plan/background/consumable/page-{영문 슬러그}.md`에 빈 템플릿으로 만든다.
4. global.md의 「개요」·「반응형 정책」·「비기능 요구사항」 칸을 맥락 수집 답과 자료에서 확인한 내용으로 채운다.

---

## 페이지 단위 루프

아래 사이클을 페이지마다 반복한다.

planning과 design이 모두 켜져 있으면, 한 페이지에서 planning 2~3단계를 마친 뒤 design 2~3단계를 이어 하고, 4단계는 두 쪽 체크리스트를 함께 놓고 한 번 한다.

### 1. 자료 참조

requirement 「자료 받기」가 `background/`에 수집한 자료를 참조한다. figma URL·캡처의 저장 위치와 재요청은 [피그마 URL·캡처 캐싱](../conventions/plan-folder.md#피그마-url캡처-캐싱)을 따른다. 현재 리뷰 대상과 관련 없어 보이는 자료가 있으면 사용자에게 알린다.

### 2. 같이 분석

1. 페이지 유형을 식별한다. 가이드의 「체크리스트」에 더해 그 유형의 [page-type](page-type/) 체크리스트를 적용한다.
2. 가이드의 「같이 분석」대로 page.md를 채운다. 확신이 없거나 자료에서 확인되지 않는 항목은 `[?]`로 표기한다.
3. 채팅에 `[?]` 항목과 가이드의 「같이 분석」이 나열하라는 것을 구체적으로 나열한다. **여기서 멈추고 사용자 응답을 기다린다.**

### 3. 논의

`/discussion`을 사용하여 사용자와 대화하며 미결 항목의 결론을 낸다.

- 확정된 내용 → 산출물에 기록
- 사용자가 판단할 수 없는 항목 → page.md 「기획자/디자이너 질문 목록」에 `[TODO]`로
- 논의가 끝나지 않은 항목 → `[?]`로 표기

### 4. 확정

논의 결과를 산출물에 반영한다.

사용자 확인 전에 page.md·global.md와 이 페이지에 적용한 체크리스트 파일(page-type 포함)의 경로를 일회성 서브에이전트(sonnet)에 넘겨, 빠진 항목(`파일:줄`·원문)만 돌려받는다.
page.md를 쓴 세션은 직접 대조하지 않는다.
지적마다 원본 자료로 해당 여부를 확인하고, 해당하지 않는 지적은 버린다.

사용자 확인을 받고 다음 페이지로 넘어간다.

---

## 종합

모든 페이지 루프가 끝난 뒤, 페이지 단위를 넘어 전체 플로우 관점에서 점검한다.

cross-page 대조·공통화 후보 찾기·TODO 모으기는 메인이 하지 않고 일회성 서브에이전트에 맡긴다.
`node {{skill_dir}}/scripts/plan-folder.mjs requirement-files`가 낸 page.md·global.md 경로(recruitment를 켰으면 design-system.md·domain-analysis.md도)와 켠 가이드의 경로를 넘긴다.
가이드의 「종합 관점」에서 걸린 항목, 공통화 후보(후보마다 쓰이는 페이지), 페이지마다 남은 TODO·`[?]` 항목만 돌려받는다. 항목마다 근거 `파일:줄`과 그 원문 줄을 붙이게 해, 메인은 page.md를 다시 열지 않고 그 줄로 판단한다.

1. 「종합 관점」에서 걸린 항목을 사용자에게 알린다.
2. 공통화 검토 — 여러 페이지에서 쓰이는 컴포넌트·로직·UI 패턴은 사용자에게 알리고 공통 항목으로 올릴지 검토한다.
   - 올릴 곳은 global.md이고, recruitment를 켰으면 「플래그 조합」대로 가른다
   - 한 페이지에서만 쓰이면 그 page.md의 「구현할 컴포넌트 목록」에 둔다
   - 여러 페이지가 공유하는 레이아웃이 있으면 `/plan/background/consumable/layout.md`를 만들지 확인한다
3. 남은 `[?]`는 사용자와 정해 확정하거나 TODO로 돌린다. TODO는 한 페이지 몫이면 그 page.md, 여러 페이지에 걸치면 global.md의 「기획자/디자이너 질문 목록」에 모은다.

AI가 global.md에서 아직 채우지 않은 칸과, 만들기로 한 경우 layout.md의 초안을 채운다. 사용자가 리뷰한다.

---

## 플래그 조합

- recruitment와 planning을 함께 켜고 별도 기획서가 없으면, 과제요구사항과 UI 목업이 기획서 역할을 한다.
- recruitment와 함께 planning·design 중 하나라도 켜면 넣을 곳을 내용 종류로 가른다.
  - 컴포넌트: 도메인을 모르는 기본 UI(버튼·입력 등)는 design-system.md, 도메인이 들어간 여러 페이지 공유 컴포넌트는 global.md 「공통 컴포넌트」
  - 여러 화면에 걸친 스펙: 데이터·비즈니스 규칙·에러 케이스는 domain-analysis.md, 화면 동작·UI·레이아웃은 global.md

---

## 자유 검토

산출물 작성이 끝난 뒤, [free-review.md](./free-review.md)의 절차를 수행한다.
