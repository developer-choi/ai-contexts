# coding-standards

## 역할

명시적 규칙을 모아둔 곳. AI가 코드를 대조할 때 "~해라, ~금지" 형태로 참조한다.

코드 예제로 보여줄 수 있는 패턴은 MP `docs/best-practices-map.md`에 코드로 추가한다. 같은 주제라도 역할이 다르므로 양쪽에 공존할 수 있다 — 여기에는 명시적 규칙, MP에는 따라할 코드.

## 로드 규칙

- 회사 프로젝트: universal/ 만
- 개인 프로젝트: universal/ + personal/

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
rules/personal/testing/convention.md [file-folder-structure]
rules/personal/testing/queries.md
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
principles/universal/quality/testability.md
principles/universal/quality/examples/product-list.md
principles/universal/react/basics.md
principles/universal/typescript/advanced.md
