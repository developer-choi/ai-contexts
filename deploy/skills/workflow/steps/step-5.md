# Step 5: 구현

> **이 단계의 목표: 구현 방침에 따라 코드를 작성한다**

`/plan/pr{N}/overview.md` 구현 방침을 바탕으로 코드 작성 및 커밋.

---

## [CRITICAL] 한번에 전부 구현 금지

단계별로 나눠서 진행하고, 각 단계 완료 후 사용자 리뷰를 받는다.

---

## 참고 컨벤션 (최초 1회)

[coding-standards/README.md](../../../contexts/coding-standards/README.md)를 참조하여 이번 PR 작업에 필요한 컨벤션을 확인한다.

---

## 보고 내용

각 단계 완료 시:
- 커밋 목록
- 자가 점검 결과

## gotchas

- 기존 모듈을 대체할 때 바로 삭제하지 말고 `@deprecated` 처리 먼저. 다른 곳에서 참조 중일 수 있다.
