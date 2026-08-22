# BG 산출물 깊이 가이드

BG 세션에서 작성하는 산출물(`/plan/background/consumable/project.md` 등)의 깊이를 잡는 기준. PLAN/IMPL 세션에 미루어야 할 것을 BG에서 적으면, 다음 세션이 같은 정보를 다시 다루게 되어 중복·혼선이 생긴다.

## 산출물별 깊이

| 산출물 | 적는 것 | 적지 않는 것 |
|---|---|---|
| `cross-analysis.md` (retained, 채용 한정) | 추론한 평가 기준만 — 프로젝트 라이프타임 내내 참조. 예: "입력 폼이 여럿이라 검증·에러 처리 안정성을 평가 포인트로 본다" | 그 외 전부 — 원본 교차 분석 발견·라이브러리 선택·아키텍처 패턴 후보·가정은 `project.md`에 직접. 구현 task 단위, 정확한 validation 규칙·메시지·글자수·문자 종류도 적지 않음 |
| `pr{N}/persistent/overview.md` (step-3) | 의도만 — 목표·범위·열려있는 질문 | 기술 선택·근거(→ `decisions.md`). 함수·컴포넌트 명세, props·타입은 step-4 stub 코드로 직접 옮긴다 |
| `pr{N}/persistent/implementation.md` (step-4) | 구현 계획 | — |

## 작성 전 자가 체크

각 항목을 적기 전 스스로 묻는다:

- **"이 항목이 PR PLAN 또는 IMPL 세션에서 결정해도 되는가?"** → YES면 BG에 넣지 않는다. validation 규칙·필드 명세 같은 정확 디테일, 함수 시그니처·props·타입은 PLAN(step-4 stub), 구현 코드는 IMPL.

## BG 시안 정독 깊이

시안·기획서를 정독할 때는 페이지·모달의 존재, 컬럼·필드(api 매핑용), 핵심 동작(필터·토글·페이지네이션 유무)까지 옮긴다. 그 아래 정확 디테일은 위 자가 체크가 가른다.
