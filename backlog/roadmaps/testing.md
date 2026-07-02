# Testing Roadmap

흩어진 테스트 재료(KA·MP·백로그)를 하나로 모으고, 최종 산출물까지의 경로를 목차로 정리하는 상위 로드맵.

## 최종 목표

**글 2편 (서사 척추)** — 읽는 순서:

1. Why to test?
2. How to test?

각 글은 세부 글·산출물을 참조한다 (예: 컴포넌트 테스트 작성 → PR 링크 / 스토리북 배포 링크).

**산출물 3종** (글 2편에 가로질러 걸침):

- ① 블로그 글 + PR/스토리북 링크
- ② 실제 코드 산출물 (테스트 코드)
- ③ 테스트 코딩스탠다드 — 이후 AI에게 테스트 작성 시킬 때 포함

## 글 작성 규칙

- **모든 설명 섹션에는 예시 코드블록을 반드시 넣는다.** 주장만 쓰지 말고 실제 테스트 코드(또는 PR·스토리북 배포 링크)로 보여준다. 채용 리뷰어용이라 "말"보다 "코드"가 설득력이다. 리뷰어 지적("받아쓰기 말고 본인 사례로")의 직접 처방이기도 하다.

## 재료 인벤토리 (현재 흩어진 위치)

| 위치 | 경로 |
|------|------|
| MP | `docs/patterns/testing/TestWriting.md`, `docs/patterns/testing/WhatToTest.md` |
| KA | `knowledge/frontend/testing/{rtl-overview, philosophy, trophy, unit-test}.md` (+ `explained/` 미러) |
| AC 백로그 | testing-mindset 분리 파일: [테스트-우선순위](../projects/knowledge-archive/testing/테스트-우선순위.md)(→How), [부모-자식-테스트-분배](../projects/knowledge-archive/testing/부모-자식-테스트-분배.md)(→How) — 무출처, 검증 대기 |
| AC 백로그 | [MP auth 테스트케이스 정리](../projects/monorepo-playground/auth/테스트케이스-정리.md), [MP vitest 가이드↔실제 차이](../projects/monorepo-playground/testing/projectsetup-vitest-related-가이드-실제-차이.md) |
| AC 백로그 | [mocking 로드맵](./mocking.md) — 진입점 → `mocking/{mocking-roadmap, qna}.md` |

> 배치 표기: 아래 「Why/What/How」의 참조 재료는 모두 파일 내용을 직접 확인 후 배치 확정됨. 향후 파일명만 보고 추가하는 항목은 `(추정)`으로 표기하고, 확인 후 마커를 뗀다.

---

## Why to test?

- **골격·필기**: MP `docs/guides/testing/why-to-test.md` ✅
- **딸린 세부 글·산출물**: [TODO] (PR/스토리북 링크 등)
- **코딩스탠다드 반영분**: [TODO]

## How to test?

- **골격·필기**: MP `docs/guides/testing/how-to-test.md` ✅
- **참조 재료** (위 골격 흡수재료 외 미흡수분):
  - MP `docs/patterns/testing/TestWriting.md` (테스트 구조·쿼리·네이밍·검증 범위), `setup/TestSetup.md` (Vitest+RTL+jsdom 셋업·설정)
  - AC 백로그 MP `testing/projectsetup-vitest-related-가이드-실제-차이.md` (lint-staged vitest related 자동 실행 — 보류 상태)
- **딸린 세부 글·산출물**: [TODO]
- **코딩스탠다드 반영분**: [TODO]
- **하위 로드맵 — Mocking** (다음 스프린트):
  - [mocking 로드맵](./mocking.md) 참조 — `roadmaps/mocking/`에 별도 트리로 유지

---

## 가로축 산출물 (글 2편 공통)

### ② 코드 산출물 인덱스

테스트 코드 실제 산출물 + PR/스토리북 링크 모음. 어느 글에서 인용되는지 표기.

- [TODO]

### ②-1 MP 패턴 문서 — ✅ 발행 완료, GitHub 프로필 연동됨

- MP `docs/patterns/testing/WhatToTest.md` ✅
- MP `docs/patterns/testing/TestWriting.md` ✅
- 블로그 글에서 "실제 규칙·코드는 이 문서"로 cross-link 예정

### ③ 테스트 코딩스탠다드

AI에게 테스트 작성 시킬 때 포함할 표준. 어느 위치(AC `deploy/`?)에 둘지 미정.

- [TODO]

---

## 나중에 추가할 것 (deferred)

미룬 주제는 전부 여기 모은다. 로드맵 하나만 따라가면 "무엇이 남았는지" 다 보이게.

| 주제 | 들어갈 글 | 추적 재료 | 비고 |
|------|----------|----------|------|
| 모킹 | How | [mocking 로드맵](./mocking.md) | 하위 트리 유지 |
| 통합테스트 | How | — | |
| 테스트 우선순위 | How | [테스트-우선순위.md](../projects/knowledge-archive/testing/테스트-우선순위.md) | 백로그 유지, 검증 후 How에 흡수 |
| E2E | How | — | 다음에 학습. **단 이번에 개념·키워드 정도는 문서에 언급** |
| 시각 회귀 (Chromatic) | How | [chromatic.md](../projects/knowledge-archive/testing/chromatic.md) | How의 children 절 "실제로 보이는지는 Chromatic"에 일부 흡수. 깊은 학습·실습(스토리북 배포) deferred |
| CSS 상태 회귀 (invalid+focus) | How | [MP inputbase-invalid-focus-회귀](../projects/monorepo-playground/active/testing/inputbase-invalid-focus-회귀.md) | jsdom이 못 잡는 box-shadow 캐스케이드 회귀. Chromatic vs Vitest browser mode 실증 사례로 흡수 예정 |
