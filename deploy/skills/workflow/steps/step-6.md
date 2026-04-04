# Step 6: 최종 점검

> **이 단계의 목표: 구현 결과를 검증한다**

모든 기능 구현 및 커밋 완료 후, **PR 생성 직전** 코드 품질을 최종 점검하는 단계입니다.

---

## 리뷰 모드

사용자에게 확인한다:

| 모드 | 설명 |
|------|------|
| **내 코드** | 본인이 작성한 코드 점검 (워크플로우 step-6 기본) |
| **남의 코드** | 타인의 PR 리뷰 (리뷰 대상은 해당 작성자가 수정한 코드에 한정) |

남의 코드 리뷰 시 PR 본문과 커밋 히스토리도 함께 읽고 변경 의도를 파악한다.

---

## 새 Spawn

step-5 리뷰어와 별개로 아래를 새로 spawn한다. 컨텍스트 주입은 [step-5.md](step-5.md)와 동일한 기준 (Figma Reviewer 제외).

- `convention-reviewer-final` ×N (sonnet) — Convention Reviewer와 동일한 분할 기준
- `advanced-reviewer-final` (opus) — coding standard 판단 + 자유 리뷰

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

Lead가 [coding-standards/](../../../contexts/coding-standards/)에서 관련 컨벤션을 확인하고 Convention-final / Advanced-final에게 전달한다.

PR 전체 diff를 대상으로 아래 파이프라인을 수행한다. **단계 간 직렬, Convention 내부만 병렬.**

```
1. Convention-final ×N (병렬) → Lead 종합 → Implementer → 반복 (0건까지)
       ↓
2. Advanced-final ↔ Implementer (직접 루프, 0건까지)
```

### 1단계: Convention-final ×N

- Convention-final ×N 병렬 리뷰 (PR 전체 diff 대상)
- 결과를 Lead에게 제출
- Lead가 종합 (중복 제거 + 이상한 지적은 사용자에게 확인)
- 검증된 이슈만 Implementer에게 한번에 전달
- Implementer 수정 후 → Convention-final ×N 병렬 재검증 → Lead 종합 → 반복 (0건까지)

### 2단계: Advanced-final

- Advanced-final ↔ Implementer 직접 DM으로 루프
- Lead 개입 없음
- 0건이면 Lead에게 보고
- **자유 리뷰 포함**: 구현 의도·컨벤션 없이 코드만 보는 외부 리뷰어 시점. 코드가 스스로 설명하지 못하는 부분·불필요한 복잡성·이상한 네이밍 등을 짚는다.
- **남의 코드 리뷰 시**: Advanced-final이 내가 작성한 코멘트의 타당성을 검증한다

---

## 산출물

결과를 `/plan/pr{N}/review.md`에 작성한다.

### 코멘트 연동 (남의 코드)

리뷰 결과를 사용자에게 제시한다. 사용자가 코멘트할 항목을 선택하면 pr-comment-write 스킬로 넘긴다.

---

## 보고 내용

산출물 작성 후 사용자에게 다음을 요약하여 보고:

- Gap Analysis 결과 (계획 대비 추가/변경된 커밋이 있는 경우)
- Convention-final: 발견된 Critical/Minor 이슈 요약
- Advanced-final: 자유 리뷰 결과
- 수정 사항
