# Step 6: 최종 점검

> **이 단계의 목표: 구현 결과를 검증한다**

모든 기능 구현 및 커밋 완료 후, **PR 생성 직전** 코드 품질을 최종 점검하는 단계입니다.

---

## Step 6.0. overview.md 대조 검사

구현 결과가 overview.md의 범위(목표, 기술 선택)를 빠짐없이 반영했는지 대조한다.

- overview.md의 각 항목과 실제 커밋을 1:1 대조
- 누락된 항목이 있으면 사용자에게 보고

---

## Step 6.1. Gap Analysis 및 추가 커밋 검증

계획되지 않은 추가 커밋(버그 수정, 엣지 케이스 등)을 식별하고 검증:

- **커밋 로그 분석**: `git log`로 추가된 커밋 식별
- **추가 검증**: 계획에 없던 코드에 대한 테스트 케이스 확인
- **보고서 기재 기준**: 계획 대비 차이가 있을 때만 기재. 차이가 없으면 섹션 생략.

---

## Step 6.2. 리뷰 파이프라인

`/code-review`를 호출하여 PR 전체 diff를 리뷰한다.

Lead가 [coding-standards/map.md](../../../contexts/coding-standards/map.md)에서 관련 컨벤션을 확인하고 code-review에 context로 전달한다. mode는 "내 코드".

```
code-review → 이슈 목록 → Implementer 수정 → code-review (수정 diff만) → 반복 (0건까지)
```

- code-review가 이슈 목록을 반환하면, 검증된 이슈만 Implementer에게 한번에 전달
- 수정은 step-5의 Markup/Feature Implementer가 수행한다
- Implementer 수정 후, code-review를 수정 커밋 diff만 대상으로 재호출
- 0건이 나올 때까지 반복

---

## 산출물

결과를 `/plan/pr{N}/review.md`에 작성한다.

---

## 보고 내용

산출물 작성 후 사용자에게 다음을 요약하여 보고:

- Gap Analysis 결과 (계획 대비 추가/변경된 커밋이 있는 경우)
- code-review 결과: 발견된 Critical/Minor 이슈 요약
- 수정 사항
