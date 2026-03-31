# Step 4: 구현 방침 상세화

> **이 단계의 목표: 구현 방침을 구체적으로 설계한다**

> **Plan mode 필수**. Step 3에서 승인된 과제에 대해서만 작성한다.

Step 3이 "뭘 쓸지"를 결정했다면, 이 단계는 "어떻게 구현할지"의 큰 그림을 잡는다. `/plan/pr{N}/overview.md`에 구현 방침을 추가한다. Step 3의 기술 선택·결정·근거를 반복하지 않는다.

---

## page.md 잔여 흡수

spec-review 산출물(page.md, global.md, layout.md)이 남아 있으면 나머지를 모두 흡수하고 원본을 삭제한다.

---

## 코딩 스탠다드 · 베스트프랙티스 참조

[coding-standards/README.md](../../../contexts/coding-standards/README.md)에서 `file-folder-structure` 태그가 붙은 문서를 확인하고, 파일·컴포넌트 구조 설계에 반영한다.

MP(`~/WebstormProjects/main/monorepo-playground`)의 `docs/best-practices-map.md`를 확인하여 현재 구현에 매칭되는 패턴이 있는지 탐색한다.
- 매칭되는 엔트리가 있으면 overview.md에 참조 패턴으로 기록한다
- 매칭되는 엔트리가 없으면 사용자에게 어떤 패턴을 따를지 문의한다

---

## [CRITICAL] PR 분할 재검토

작업량이 많아 보이면 PR 분할을 제안한다:
- 예상 커밋 8개 이상
- 수정/추가 파일 10개 이상
- 독립적 기능이 하나의 PR에 묶임

---

## overview.md 리뷰

구현 방침 작성이 끝나면, 서브에이전트로 overview.md를 리뷰한다.

- overview.md에 적힌 내용 기반으로 관련 코딩 컨벤션을 찾아 대조한다 (컴포넌트 설계가 있으면 컴포넌트 컨벤션, 테스트 계획이 있으면 테스트 컨벤션)
- 모순, 누락, 컨벤션 위반이 발견되면 사용자에게 보고한다

---

## 보고 내용

- 추가된 구현 방침 핵심 요약
- PR 분할 재검토 필요 여부
- overview.md 리뷰 결과
