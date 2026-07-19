# BG 산출물 깊이 가이드

BG 세션에서 작성하는 산출물(`/plan/background/consumable/project.md` 등)의 깊이를 잡는 기준. PLAN/IMPL 세션에 미루어야 할 것을 BG에서 적으면, 다음 세션이 같은 정보를 다시 다루게 되어 중복·혼선이 생긴다.

## 산출물별 깊이

| 산출물 | 적는 것 | 적지 않는 것 |
|---|---|---|
| `cross-analysis.md` (retained) | 추론한 평가 기준만 (프로젝트 라이프타임 내내 참조) | 그 외 전부 — 원본 교차 분석 발견·라이브러리 선택·아키텍처 패턴 후보·가정은 `project.md`에 직접. 구현 task 단위, 정확한 validation 규칙·메시지·글자수·문자 종류도 적지 않음 |
| `pr{N}/persistent/overview.md` (PLAN) | 구현 단위 / validation 규칙 | (구현 코드 자체. 함수·컴포넌트 명세, props·타입은 step-4 stub 코드로 직접 옮긴다.) |
| `pr{N}/persistent/implementation.md` (IMPL) | 실제 구현 메모 / 주의사항 | — |

## 작성 전 자가 체크

각 항목을 적기 전 스스로 묻는다:

- **"이 항목이 PR PLAN 또는 IMPL 세션에서 결정해도 되는가?"** → YES면 BG에 넣지 않는다. validation 규칙·필드 명세 같은 정확 디테일, 함수 시그니처·props·타입은 PLAN(step-4 stub), 구현 코드는 IMPL.
- **"이건 프로젝트 내내 참조할 평가 기준인가, 한 번 쓰이고 옮겨질 발견인가?"** → 전자만 cross-analysis.md, 후자는 project.md에 직접.

## BG 시안 정독 깊이

시안·기획서를 정독할 때 어디까지 산출물에 옮길지:

| 항목 | BG에서 다루나 |
|---|---|
| 어떤 페이지/모달이 있는가 | 다룬다 |
| 페이지별 어떤 컬럼/필드가 있는가 (api 매핑 위해) | 다룬다 |
| 페이지별 핵심 동작 (필터·토글·페이지네이션 유무) | 다룬다 |
| validation 정확한 메시지·규칙 | 다루지 않는다 — PLAN 세션 |
| 정확한 props·타입 정의 | 다루지 않는다 — PLAN(step-4 stub) |
| 함수 시그니처 | 다루지 않는다 — PLAN(step-4 stub) |

## Anti-pattern

cross-analysis.md에 구현 단위 항목 혼입:

```
❌ | 라우트 보호 | (선택) middleware에서 매니저/뷰어가 /users 접근 시 redirect | 어드민 핵심 패턴 |
```

→ middleware 추가는 PR 구현 단위. `project.md`에서 다룬다.

cross-analysis.md에 기술 결정 혼입 (cross-analysis.md는 평가 기준 전용 — 라이브러리 선택이라도 예외 아님):

```
❌ | 권한 mock | 쿠키에 role 저장. Zustand 대신 쿠키 택한 이유: SSR/middleware 활용 |
❌ | 폼·validation | RHF + zod 채택. 어드민의 입력 폼 다수 + 서버 에러 통합 처리 필요 |
```

→ 라이브러리·아키텍처 선택도 `project.md`에 직접 적는다. cross-analysis.md엔 "이 프로젝트는 폼이 많아 입력 검증 안정성을 눈여겨본다" 같은 평가 기준만 남긴다.

cross-analysis.md에 정확 validation 규칙 명시:

```
❌ | 사용자 폼 | 아이디 9~50자 이메일 / PW 8~15자 영문+숫자+특수문자 / 이름 한글·영문 1~16자 |
```

→ 정확한 글자수·문자 종류·메시지 원문은 PR PLAN 세션의 폼 스키마 결정 영역.

```
✅ | 평가 기준 | 입력 폼이 여럿이라 검증·에러 처리 안정성을 평가 포인트로 본다 |
```

→ 판단 기준만 남기고 구현 결정(RHF+zod 등)은 project.md로.
