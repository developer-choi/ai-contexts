---
description: 코드 변경사항을 리뷰하고 이슈 목록을 산출한다. 코드리뷰, PR 리뷰, 코드 점검 요청 시 사용.
argument-hint: [PR URL 또는 브랜치] [--coding-standards 경로...] [--extra-standards 경로...] [--mode default|advanced]
---

# Code Review

코드 변경사항을 검증하고 이슈 목록을 산출하는 스킬. **수정은 하지 않는다** — 이슈 목록만 반환하고, 수정 여부와 방법은 호출자가 결정한다.

## 입력

| 입력 | 필수 | 설명 |
|------|------|------|
| **리뷰 대상** | O | PR diff, 커밋, 파일 |
| **coding-standards 목록** | X | 적용할 coding-standards 파일 경로 리스트. 없으면 [map.md](../../contexts/coding-standards/map.md)에서 직접 판단 |
| **추가 컨벤션** | X | coding-standards 외 경로 (사내 컨벤션 등) |
| **리뷰 모드** | X | default / advanced (기본: default) |

## 출력

이슈 목록. severity (Critical / Minor / Suggestion) 포함.

- **advanced 모드에서 coding-standards 이슈가 있으면**: coding-standards 이슈만 반환하고 "coding-standards 미통과로 advanced 미실행" 안내. 호출자가 수정 후 재호출하면 다시 판단한다.

---

## 절차

### 1. 컨텍스트 준비

coding-standards 목록이 주입된 경우 이 단계를 건너뛴다.

1. 사용자에게 **리뷰 대상**을 확인받는다
2. [coding-standards/map.md](../../contexts/coding-standards/map.md)를 읽고, 리뷰 대상에 관련된 coding-standards를 선택하여 로드한다
3. 사용자에게 추가 컨벤션이 있는지 확인한다 (사내 컨벤션 등)

### 2. 리뷰 대상 파악

- PR 본문(description)과 커밋 히스토리를 읽고 변경 의도를 파악한다
- diff를 읽는다
- 이미 달린 코멘트를 읽고, 중복 지적을 피한다
- 리뷰 대상은 해당 작성자가 실제로 수정한 코드에 한정한다. 기존 코드의 문제는 리뷰 항목에 포함하지 않는다.

### 3. 리뷰 수행

#### default 모드

단일 리뷰어 (sonnet) 1명. coding-standards 기반 검증 + 자유 리뷰를 함께 수행한다.

#### advanced 모드

TeamCreate로 팀을 구성한다 (서브에이전트가 아닌 팀 에이전트 — 다라운드 소통 필요).

1. **Coding-Standards 페이즈**: Coding-Standards Reviewer ×N (sonnet) 병렬 리뷰. coding-standards 영역별로 분할한다. Lead가 결과를 종합한다 (중복 제거, 이상한 지적은 사용자에게 확인).
2. **이슈가 있으면**: coding-standards 이슈만 반환. Advanced 페이즈 실행하지 않음.
3. **0건이면**: Advanced Reviewer (opus) 실행 — diff만 전달, coding-standards 문서 미전달. 규칙에 없는 문제를 자유 리뷰 시점으로 짚는다.

### 4. 이슈 목록 산출

발견한 이슈를 severity별로 정리하여 반환한다.

- **Critical**: 버그, 보안, 로직 오류
- **Minor**: 컨벤션 위반, 가독성
- **Suggestion**: 개선 제안

컨벤션 기반 지적에는 근거가 되는 컨벤션 파일 경로와 라인번호를 함께 명시한다 (예: `coding-standards/naming.md:12 — camelCase 규칙 위반`).

---

## 후속 연결 (사용자 판단)

이슈 목록 산출 후, 다음 단계는 호출 맥락에 따라 다르다:

- **step-6에서 호출**: step-6이 Implementer에게 수정 지시 → 재리뷰 루프
- **독립 호출**: 사용자가 코멘트할 항목을 선택하면 `/pr-comment-write`로 넘긴다
