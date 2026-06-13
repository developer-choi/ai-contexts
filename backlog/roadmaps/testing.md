# Testing Roadmap

흩어진 테스트 재료(KA·MP·백로그)를 하나로 모으고, 최종 산출물까지의 경로를 목차로 정리하는 상위 로드맵.

## 최종 목표

**글 3편 (서사 척추)** — 읽는 순서:

1. Why to test?
2. What to test?
3. How to test?

각 글은 세부 글·산출물을 참조한다 (예: 컴포넌트 테스트 작성 → PR 링크 / 스토리북 배포 링크).

**산출물 3종** (글 3편에 가로질러 걸침):

- ① 블로그 글 + PR/스토리북 링크
- ② 실제 코드 산출물 (테스트 코드)
- ③ 테스트 코딩스탠다드 — 이후 AI에게 테스트 작성 시킬 때 포함

## 이번 스프린트 범위 (~일요일, 30h)

산출물 3종 **전부** 1차로 내되, How to test는 일부 축소:

- **포함**: 컴포넌트 테스트, 함수 유닛테스트
- 글 3편 모두 1차 산출. Why/What은 완결 지향, How는 위 축소 범위로.

### 제외 = 나중에 배워서 해당 글에 끼워넣을 것 (deferred 단일 색인)

미룬 주제는 전부 여기 모은다. 로드맵 하나만 따라가면 "무엇이 남았는지" 다 보이게.

| 주제 | 들어갈 글 | 추적 재료 | 비고 |
|------|----------|----------|------|
| 모킹 | How | [mocking 로드맵](./mocking.md) | 하위 트리 유지 |
| 통합테스트 | How | — | |
| 테스트 우선순위 | What | [테스트-우선순위.md](../projects/knowledge-archive/testing/테스트-우선순위.md) | 백로그 유지, 검증 후 What에 흡수 |
| E2E | What/How | — | 다음에 학습. **단 이번에 개념·키워드 정도는 문서에 언급** |

전체 로드맵 vs 이번 스프린트 구분은 맨 아래 「다음 액션」에서 `[이번]`/`[전체]` 태그로 표기.

## 글 작성 규칙

- **모든 설명 섹션에는 예시 코드블록을 반드시 넣는다.** 주장만 쓰지 말고 실제 테스트 코드(또는 PR·스토리북 배포 링크)로 보여준다. 채용 리뷰어용이라 "말"보다 "코드"가 설득력이다. 리뷰어 지적("받아쓰기 말고 본인 사례로")의 직접 처방이기도 하다.

## 재료 인벤토리 (현재 흩어진 위치)

| 위치 | 경로 |
|------|------|
| MP | `docs/patterns/testing/TestWriting.md`, `docs/patterns/testing/WhatToTest.md` |
| KA | `knowledge/frontend/testing/{rtl-overview, testing-library-philosophy, testing-trophy, unit-test-strategies}.md` (+ `explained/` 미러) |
| AC 백로그 | testing-mindset 분리 파일: [테스트-우선순위](../projects/knowledge-archive/testing/테스트-우선순위.md)(→What), [부모-자식-테스트-분배](../projects/knowledge-archive/testing/부모-자식-테스트-분배.md)(→How) — 무출처, 검증 대기. (qa와-테스트코드는 why-to-test에 병합·삭제) |
| AC 백로그 | [MP auth 테스트케이스 정리](../projects/monorepo-playground/auth/테스트케이스-정리.md), [MP vitest 가이드↔실제 차이](../projects/monorepo-playground/testing/projectsetup-vitest-related-가이드-실제-차이.md) |
| AC 백로그 | [mocking 로드맵](./mocking.md) — 진입점 → `mocking/{mocking-roadmap, qna}.md` |

> 배치 표기: 아래 「Why/What/How」의 참조 재료는 모두 파일 내용을 직접 확인 후 배치 확정됨. 향후 파일명만 보고 추가하는 항목은 `(추정)`으로 표기하고, 확인 후 마커를 뗀다.

---

## Why to test?

테스트를 *왜* 하는가 — 동기·정당화.

- **골격·필기**: [testing/why-to-test.md](./testing/why-to-test.md) (확신 명제 + ①② + 흡수 재료)
- **딸린 세부 글·산출물**: [TODO] (PR/스토리북 링크 등)
- **코딩스탠다드 반영분**: [TODO]

## What to test?

*무엇을* 테스트하는가 — 우선순위·대상 선정.

- **골격·필기**: [testing/what-to-test.md](./testing/what-to-test.md) (목차 확정 — 유스케이스 기준→트리 레벨→함수 경우의 수→델타→커버리지 보조렌즈→면제)
- **딸린 세부 글·산출물**: [TODO]
- **코딩스탠다드 반영분**: [TODO]

## How to test?

*어떻게* 테스트하는가 — 작성 기법·도구.

- **골격·필기**: [testing/how-to-test.md](./testing/how-to-test.md) (목차 확정 — RTL 도구→AAA→쿼리 우선순위→부모-자식 분배→assert once·자동화)
- **참조 재료** (위 골격 흡수재료 외 미흡수분):
  - MP `docs/patterns/testing/TestWriting.md` (테스트 구조·쿼리·네이밍·검증 범위), `setup/TestSetup.md` (Vitest+RTL+jsdom 셋업·설정)
  - AC 백로그 MP `testing/projectsetup-vitest-related-가이드-실제-차이.md` (lint-staged vitest related 자동 실행 — 보류 상태)
- **딸린 세부 글·산출물**: [TODO]
- **코딩스탠다드 반영분**: [TODO]
- **하위 로드맵 — Mocking** (다음 스프린트):
  - [mocking 로드맵](./mocking.md) 참조 — `roadmaps/mocking/`에 별도 트리로 유지

---

## 가로축 산출물 (글 3편 공통)

### ② 코드 산출물 인덱스

테스트 코드 실제 산출물 + PR/스토리북 링크 모음. 어느 글에서 인용되는지 표기.

- [TODO]

### ③ 테스트 코딩스탠다드

AI에게 테스트 작성 시킬 때 포함할 표준. 어느 위치(AC `deploy/`?)에 둘지 미정.

- [TODO]

---

## 미해결 / 다음 액션

- [ ] **KA 테스트 문서들 이해 + 불필요한 부분 날리기** (knowledge/frontend/testing/ 4개 + explained 미러)
- [ ] **AC 백로그 테스트 항목 처리** (MP auth/테스트케이스-정리, projectsetup-vitest, mocking 로드맵 — 각각 글로 흡수 / KA 복귀 / 유지 중 결정. testing-mindset은 Why/What/How 3파일로 분리 완료)
- [ ] 각 글의 핵심 주장/목차 채우기
- [ ] 코딩스탠다드 둘 위치 결정
