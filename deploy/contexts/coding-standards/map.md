# coding-standards

## 역할

프로젝트 코딩 컨벤션의 인덱스. 두 종류로 구성된다:
- **규칙** (이 디렉토리): "~해라, ~금지" 형태의 텍스트 규칙. AI가 코드를 대조할 때 참조한다.
- **구현 패턴** (best-practices-map): 실제 코드로 정립된 따라할 패턴.

같은 주제라도 역할이 다르므로 양쪽에 공존할 수 있다.

## 로드 규칙

- 회사 프로젝트: universal/ 만
- 개인 프로젝트: universal/ + personal/

### [CRITICAL] 탐색 절차

1. 이 문서 하단의 rules·principles 파일 리스트를 훑고, 현재 작업과 관련된 파일을 선별한다
2. [CRITICAL] MP [best-practices-map.md](~/WebstormProjects/main/monorepo-playground/docs/best-practices-map.md)를 **직접 Grep**한다 — "확인한다"가 아니라 도구 호출로 Grep 실행. 작업 키워드(예: PR1이면 `셋업|setup|초기|프로젝트 초기`, PR2면 `provider|api 클라이언트`, PR3+면 `컴포넌트|디자인시스템`)로 매칭 행을 찾는다.
3. 매칭 행이 가리키는 1차 소스 파일(`docs/patterns/...`, `docs/static-checking/...`, `docs/formatter.md` 등)을 직접 Read한다. 본문에서 발견한 항목은 작업 후보에 모두 흡수한다 — 사용자 1차 제안에 누락이 있어도 본 절차로 잡는다.
4. 선별한 파일(rules·principles·MP 1차 소스)을 모두 Read한다. 파일명만 보고 판단하지 않는다.
5. **매칭된 MP 행과 1차 소스 경로를 `/plan/pr{N}/persistent/reference.md`에 인용한다** — 매칭 행 텍스트 + 파일 경로(라인 범위 가능 시 포함). 인용 없이 다음 step 진입 금지 게이트.
6. 매칭되는 패턴이 있으면 해당 문서의 코드 스타일을 엄격하게 따른다. 프로젝트 상황과 맞지 않아 판단이 어려운 부분은 임의로 변형하지 않고 사용자에게 명시적으로 확인한다.

**사고 사례**: PR_1_PLAN 메인 LLM이 2번을 "이미 안다"로 자기 면제 → MP 「프로젝트 초기 세팅」 행(commitlint·stylelint·prettier·husky·lint-staged + `docs/patterns/setup/ProjectSetup.md`) 발견 실패 → PR1 셋업 항목 12개 누락. 글로벌 룰 「[CRITICAL] 마커」(반드시 Read·실행, "이미 안다고 판단해 건너뛰지 않는다") 위반.

## 태그

| 태그 | 의미 | 사용 시점 |
|------|------|-----------|
| `file-folder-structure` | 파일·폴더 분리 기준 | Step 4에서 구현 구조 설계 시 |

## rules (중간 모델 이상 대조 가능, e.g. sonnet)

rules/personal/general.md [file-folder-structure]
rules/personal/naming.md [file-folder-structure]
rules/personal/react/api.md
rules/personal/react/basics.md
rules/personal/react/react-hook-form.md
rules/personal/typescript/basic.md
rules/personal/zod.md [file-folder-structure]
rules/universal/general.md
rules/universal/markup/style.md

## principles (최상위 모델 판단 필요, e.g. opus)

principles/personal/general.md [file-folder-structure]
principles/personal/quality/co-location.md [file-folder-structure]
principles/personal/quality/readability.md
principles/personal/typescript/advanced.md
principles/universal/quality/maintainability.md [file-folder-structure]
principles/universal/quality/readability.md
principles/universal/react/basics.md
principles/universal/typescript/advanced.md
