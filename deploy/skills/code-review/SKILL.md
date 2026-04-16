---
description: 코드 변경사항을 리뷰하고 이슈 목록을 산출한다. 코드리뷰, PR 리뷰, 코드 점검 요청 시 사용.
argument-hint: "[PR URL 또는 브랜치] [--coding-standards 경로...] [--extra-standards 경로...] [--mode default|advanced]"
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
2. [coding-standards/map.md](../../contexts/coding-standards/map.md)를 읽고, 탐색 절차를 따라 관련 rules·principles 파일을 선별·로드한다
3. [best-practices-map.md](~/WebstormProjects/main/monorepo-playground/docs/best-practices-map.md)를 읽고, 리뷰 대상과 관련된 구현 패턴이 있는지 확인한다. 관련 패턴이 있으면 해당 섹션도 로드한다
4. 사용자에게 추가 컨벤션이 있는지 확인한다 (사내 컨벤션 등)

### 2. 리뷰 대상 파악

- PR 본문(description)과 커밋 히스토리를 읽고 변경 의도를 파악한다
- diff를 읽는다
- 이미 달린 코멘트(타인·봇 리뷰 포함)를 읽고, **동일 주제의 지적은 결과 목록에서 완전히 제외**한다. 동의·반박·심각도 교정도 별도 항목으로 올리지 않는다. 새로 발견한 이슈만 나열한다.
- 리뷰 대상은 해당 작성자가 실제로 수정한 코드에 한정한다. 기존 코드의 문제는 리뷰 항목에 포함하지 않는다.
- **테스트 자동 포함**: 구현 파일(훅, 컴포넌트, 유틸, 스키마)이 리뷰 대상에 포함되면, 같은 디렉토리 또는 인접 경로에서 해당 테스트 파일(`*.test.ts`, `*.test.tsx`)을 탐색하여 리뷰 범위에 자동 포함한다. 요청에 테스트가 명시되지 않았더라도 적용한다. 훅의 설계 적절성을 리뷰하면서 테스트 검증 수준을 확인하지 않으면, 구현과 테스트의 결합도·품질 문제를 놓치게 된다.

### 3. 리뷰 수행

#### default 모드

단일 리뷰어 (sonnet) 1명. coding-standards 기반 검증 + 자유 리뷰를 함께 수행한다.

#### advanced 모드

[CRITICAL] [team-agent](../../contexts/team-agent.md)의 규칙에 따라 팀을 구성한다.

Coding-Standards Reviewer ×N (sonnet)과 Advanced Reviewer (opus)를 **병렬 실행**한다.

- **Coding-Standards Reviewer ×N**: coding-standards 영역별로 분할하여 병렬 리뷰
- **Advanced Reviewer**: diff만 전달, coding-standards 문서 미전달. 규칙에 없는 문제를 자유 리뷰 시점으로 짚되, 아래 관점을 반드시 포함한다:
  - **책임 과다 / 추상화 필요성**: 함수·컴포넌트가 여러 관심사를 동시에 담당하고 있는지, 분리·추상화가 필요한 지점이 있는지 검토한다.

Lead가 모든 리뷰어의 결과를 종합한다 (중복 제거, 이상한 지적은 사용자에게 확인).

#### 테스트 리뷰 관점

테스트 파일이 리뷰 범위에 포함되면 아래 관점을 추가로 검토한다. 구현 코드만 봐서는 판단할 수 없는 문제들이므로, 테스트 파일을 반드시 읽은 뒤 적용한다.

1. **구현 결합도**: 테스트가 내부 구현에 결합되어 있는지 확인한다. `mock.calls[0]![0]`처럼 mock 호출 인자를 인덱스로 접근하거나, 특정 내부 메서드 호출을 검증하는 패턴은 구현이 변경되면 기능이 동일해도 테스트가 깨진다. 결과(상태, 렌더링, 사용자 관찰 가능한 행동)를 검증하는 방향으로 개선을 제안한다.
2. **it 설명의 사용자 관점**: it/describe 설명에 URL 파라미터명(`gender=F`), 변수명(`sortBy`), 메서드명(`router.replace`) 등 구현 용어가 포함되면 사용자 관점 워딩으로 교체를 제안한다. 사용자는 "gender 파라미터"가 아니라 "성별 필터"로 인식한다. 훅 테스트라도 예외가 아니다.
3. **프로젝트 컨벤션 비교**: 같은 프로젝트 내 기존 테스트 파일 최소 1개를 참조하여 구조 컨벤션(파일 내 코드 순서, describe 구조, 네이밍)을 비교한다. 셋업(vi.mock, beforeEach)과 describe 블록의 순서가 기존 파일과 다르면 지적한다.
4. **라이브러리 동작 재검증 금지**: 테스트가 프로젝트 비즈니스 로직을 검증하는지, 의존 라이브러리(zod `.catch()`, react-hook-form 기본 동작 등)의 내부 동작을 재검증하는지 구분한다. 라이브러리 API의 기본 동작만 검증하는 테스트는 삭제를 제안한다.

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
