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

1. 이 문서 하단의 rules·principles 파일 리스트와 MP [best-practices-map.md](~/WebstormProjects/main/monorepo-playground/docs/best-practices-map.md)를 함께 훑고, 현재 작업과 관련된 파일을 선별한다
2. 선별한 파일을 Read한다. 파일명만 보고 판단하지 않는다
3. 매칭되는 패턴이 있으면 해당 문서의 코드 스타일을 엄격하게 따른다. 프로젝트 상황과 맞지 않아 판단이 어려운 부분은 임의로 변형하지 않고 사용자에게 명시적으로 확인한다.

## 태그

| 태그 | 의미 | 사용 시점 |
|------|------|-----------|
| `file-folder-structure` | 파일·폴더 분리 기준 | Step 4에서 구현 구조 설계 시 |

## rules (중간 모델 이상 대조 가능, e.g. sonnet)

rules/personal/general.md [file-folder-structure]
rules/personal/naming.md [file-folder-structure]
rules/personal/next/basics.md
rules/personal/react/api.md
rules/personal/markup/style.md
rules/personal/react/basics.md
rules/personal/react/react-hook-form.md
rules/personal/typescript/basic.md
rules/personal/zod.md [file-folder-structure]
rules/universal/general.md
rules/universal/markup/html.md
rules/universal/markup/style.md
rules/universal/react/basics.md

## principles (최상위 모델 판단 필요, e.g. opus)

principles/personal/general.md [file-folder-structure]
principles/personal/quality/co-location.md [file-folder-structure]
principles/personal/quality/readability.md
principles/personal/typescript/advanced.md
principles/universal/quality/maintainability.md [file-folder-structure]
principles/universal/quality/readability.md
principles/universal/testability.md
principles/universal/quality/examples/product-list.md
principles/universal/react/basics.md
principles/universal/typescript/advanced.md
