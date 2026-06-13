---
target:
  - monorepo-playground/package.json
  - monorepo-playground/docs/static-checking.md
  - monorepo-playground/docs/formatter.md
  - monorepo-playground/templates/recruitment/README
---

# MP repo lint-staged에 vitest related 포함 (보류)

## 동기

ProjectSetup.md L40은 lint-staged에 `vitest related --run`을 권장했으나 MP repo는 미적용 → 가이드≠실제였음. 사용자 결정: MP repo도 **포함**(커밋 단계 회귀 가드). 채용과제 템플릿 `templates/recruitment/`는 시간압박(잦은 커밋)으로 미포함 유지.

## 해소됨

ProjectSetup.md L40 불일치 → ProjectSetup을 `templates/recruitment` 포인터로 전환하며 lint-staged 인라인 자체 제거. 더는 가이드가 vitest related를 주장하지 않음.

## [draft] MP lint-staged에 vitest related 추가

### 기대상황

vitest가 셋업된 워크스페이스의 lint-staged eslint 태스크에 `vitest related --run`이 붙어, 커밋 시 관련 테스트가 돌아 회귀를 잡는다. `docs/static-checking.md`·`docs/formatter.md`의 lint-staged 예시도 정합.

### 현재상태 (보류 사유)

2026-05-31 구현 직전 vitest 상태 확인 결과, 워크스페이스마다 고르지 않음:

| 워크스페이스 | vitest |
|---|---|
| `apps/examples` | 표준 vitest (`vitest.config.mts`, `test: vitest`, v4.0.17) |
| `packages/design-system` | browser-mode (`@vitest/browser-playwright`) — pre-commit엔 부적합(커밋마다 브라우저 띄움) |
| `packages/recruitment` | 없음 |

MP 루트 lint-staged의 워크스페이스별 eslint 태스크 3개에 `vitest related`를 일괄 추가하면 → `recruitment`는 vitest가 없어 커밋이 깨지고, `design-system`은 커밋마다 브라우저가 뜸. **깔끔하게 되는 건 `apps/examples`뿐.**

### 현재 생각중인 방법

재시작 시 범위 결정:
- **(a) apps/examples만** lint-staged에 vitest related 추가 (최소·안전, 나머지 둘 제외).
- **(b)** recruitment·design-system vitest 정비(설치/non-browser 설정)까지 묶어 전 워크스페이스 적용 (큰 작업).

### 첫 행동

(a)/(b) 범위를 사용자와 결정. (a)면: `apps/examples` lint-staged 태스크를 배열로 바꿔 `eslint --fix …` 뒤에 `vitest related --run --root apps/examples` 추가 → **사용자가 커밋 1회로 동작 확인**(AI는 MP에서 vitest 실행 불가) → `static-checking.md`·`formatter.md`·템플릿 README("본체 포함/과제 미포함")·PR1 `decisions.md` 정합.

### 종료 조건

결정된 범위의 워크스페이스 lint-staged에 vitest related가 적용되고 관련 문서가 정합되면 종료.
