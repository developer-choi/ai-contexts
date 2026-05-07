# BG 산출물 깊이 가이드

BACKGROUND_SESSION에서 작성하는 산출물(`/plan/background/cross-analysis.md` 등)의 깊이를 잡는 기준. PLAN/IMPL 세션에 미루어야 할 것을 BG에서 적으면, 다음 세션이 같은 정보를 다시 다루게 되어 중복·혼선이 생긴다.

## 산출물별 깊이

| 산출물 | 적는 것 | 적지 않는 것 |
|---|---|---|
| `cross-analysis.md` | 추론한 평가 기준 / 원본 교차 분석 / **라이브러리 선택** / **아키텍처 패턴** / 가정 | 구현 task 단위 (middleware 추가, 컴포넌트 신설 등), 정확한 validation 규칙·메시지·글자수·문자 종류 |
| `pr{N}/overview.md` (PLAN) | 구현 단위 / 함수·컴포넌트 명세 / validation 규칙 / props·타입 | (구현 코드 자체) |
| `pr{N}/implementation.md` (IMPL) | 실제 구현 메모 / 주의사항 | — |

## 작성 전 자가 체크

각 항목을 적기 전 스스로 묻는다:

- **"이 항목이 PR PLAN 또는 IMPL 세션에서 결정해도 되는가?"** → YES면 BG에 넣지 않는다. validation 규칙·필드 명세 같은 정확 디테일은 PLAN, 함수 시그니처·구현 코드는 IMPL.
- **"이건 라이브러리·아키텍처 선택인가, 단일 구현 단위인가?"** → 전자만 cross-analysis OK.

## BG 시안 정독 깊이

시안·기획서를 정독할 때 어디까지 산출물에 옮길지:

| 항목 | BG에서 다루나 |
|---|---|
| 어떤 페이지/모달이 있는가 | 다룬다 |
| 페이지별 어떤 컬럼/필드가 있는가 (api 매핑 위해) | 다룬다 |
| 페이지별 핵심 동작 (필터·토글·페이지네이션 유무) | 다룬다 |
| validation 정확한 메시지·규칙 | 다루지 않는다 — PLAN 세션 |
| 정확한 props·타입 정의 | 다루지 않는다 — IMPL 세션 |
| 함수 시그니처 | 다루지 않는다 — IMPL 세션 |

## Anti-pattern

cross-analysis.md에 구현 단위 항목 혼입:

```
❌ | 라우트 보호 | (선택) middleware에서 매니저/뷰어가 /users 접근 시 redirect | 어드민 핵심 패턴 |
```

→ middleware 추가는 PR 구현 단위. PR 분할 산출물(project.md)이나 PR PLAN 세션에서 다룬다.

```
✅ | 권한 mock | 쿠키에 role 저장. Zustand 대신 쿠키 택한 이유: SSR/middleware 활용 |
```

→ 라이브러리·아키텍처 선택이라 OK.

cross-analysis.md에 정확 validation 규칙 명시:

```
❌ | 사용자 폼 | 아이디 9~50자 이메일 / PW 8~15자 영문+숫자+특수문자 / 이름 한글·영문 1~16자 |
```

→ 정확한 글자수·문자 종류·메시지 원문은 PR PLAN 세션의 폼 스키마 결정 영역.

```
✅ | 폼·validation | RHF + zod 채택. 어드민의 입력 폼 다수 + 서버 에러 통합 처리 필요 |
```

→ 라이브러리 선택과 채택 근거.
