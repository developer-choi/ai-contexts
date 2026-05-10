# Step 6: 최종 점검

> **이 단계의 목표: 구현 결과를 검증한다**

모든 기능 구현 및 커밋 완료 후, **PR 생성 직전** 코드 품질을 최종 점검하는 단계입니다.

---

## Step 6.0. overview.md 대조 검사

구현 결과(커밋)가 overview.md의 범위(목표, 기술 선택)를 빠짐없이 반영했는지 확인한다 (대조 절차는 SKILL.md 「자가 검토 필수」 일반 규칙).

- 누락된 항목이 있으면 사용자에게 보고

---

## Step 6.1. Gap Analysis 및 추가 커밋 검증

계획되지 않은 추가 커밋(버그 수정, 엣지 케이스 등)을 식별하고 검증:

- **커밋 로그 분석**: `git log`로 추가된 커밋 식별
- **추가 검증**: 계획에 없던 코드에 대한 테스트 케이스 확인
- **보고서 기재 기준**: 계획 대비 차이가 있을 때만 기재. 차이가 없으면 섹션 생략.

---

## Step 6.2. 리뷰 파이프라인

Lead가 [coding-standards/map.md](../../../contexts/coding-standards/map.md)에서 관련 coding-standards를 선별하고, `/code-review`를 advanced 모드로 호출한다.

```
code-review(advanced) → 이슈 목록 → Implementer 수정 → code-review(advanced, 수정 diff만) → 반복 (0건까지)
```

- code-review에 전달하는 입력: PR diff, coding-standards 목록, 리뷰 모드(advanced)
- code-review가 이슈 목록을 반환하면, Implementer에게 한번에 전달
- 수정은 step-5의 Markup/Feature Implementer가 수행한다

---

## 산출물

결과를 `/plan/pr{N}/review.md`에 작성한다.

---

## 보고 내용

산출물 작성 후 사용자에게 다음을 요약하여 보고:

- Gap Analysis 결과 (계획 대비 추가/변경된 커밋이 있는 경우)
- code-review 결과: 발견된 Critical/Minor 이슈 요약
- 수정 사항

---

## 산출물 정리

리뷰 파이프라인이 완료되고 모든 이슈가 수정 커밋에 반영된 것을 확인한 뒤, `/plan/pr{N}/review.md`를 삭제한다. 리뷰 결과는 코드에 반영된 중간 산출물이므로 더 이상 유지할 필요가 없다.

---

## 세션 회고

이 세션의 마지막 step이다. 보고 후:

- 이 세션에서 새로 정립한 코드 패턴이 있으면 베스트프랙티스맵 엔트리 추가를, 선호 패키지에 변동이 있으면 목록 수정을 제안한다.
