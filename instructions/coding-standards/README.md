# coding-standards

프로젝트 코딩 컨벤션, 품질 원칙, 테스트 규칙을 정의한 폴더입니다.

## 분류 기준

| 폴더 | 성격 | 판단 방식 | 예시 |
|------|------|-----------|------|
| **coding/** | 형식 규약 | 맞다/틀리다 (린터 수준) | import 경로, 네이밍, 중괄호 강제 |
| **quality/** | 품질 원칙 | 정도의 문제 (사람이 판단) | 가독성, 유지보수성, 테스트 용이성 |
| **testing/** | 테스트 작성 규칙 | 맞다/틀리다 | describe 구조, 쿼리 우선순위 |
| **writing/** | 문서 작성 톤 | 스타일 가이드 | PR body, 안내문 말투 |
| **git/** | Git 작업 규칙 | 맞다/틀리다 | 커밋 메시지, 브랜치 전략 |

## 폴더 구조

```
coding-standards/
├── coding/
│   ├── general.md
│   ├── naming.md
│   ├── zod.md
│   ├── markup/
│   │   ├── html.md
│   │   └── style.md
│   ├── react/
│   │   ├── api.md
│   │   ├── basics.md
│   │   ├── button.md
│   │   ├── error-handling.md
│   │   └── tanstack-query.md
│   └── typescript/
│       ├── advanced.md
│       └── basic.md
├── quality/
│   ├── readability.md
│   ├── maintainability.md
│   ├── testability.md
│   └── examples/
│       └── product-list.md
├── testing/
│   ├── convention.md
│   └── queries.md
├── writing/
│   └── tone.md
└── git/
    └── rules.md
```

---

# AI 행동 가이드

## 기능 구현 및 버그 수정 시

1. **공통 규칙 로드**: `coding/` 폴더에서 공통 규칙 파일(general.md, naming.md 등)을 읽으세요.

2. **기술 스택별 규칙 로드 (조건부)**: 작업 중인 코드의 기술 스택을 파악하고, `coding/` 하위 폴더에서 해당하는 규칙을 찾아 읽으세요.
   - 예: TypeScript 코드 작업 → `coding/typescript/` 읽기
   - 예: React 컴포넌트 작업 → `coding/react/`, `coding/typescript/` 읽기
   - 예: HTML/CSS 작업 → `coding/markup/` 읽기

## 테스트 코드 작성 시

1. **테스트 규칙 로드**: `testing/` 폴더의 모든 파일을 읽으세요.

## 코드 리뷰 시

1. **코딩 규칙**: `coding/` 폴더에서 해당 스택의 규칙을 읽으세요.
2. **품질 기준**: `quality/` 폴더의 파일을 읽으세요.
3. **테스트 확인**: `testing/` 폴더의 파일을 읽으세요.

## 외부 공개 문서 작성 시 (PR body, 안내문 등)

1. **문서 톤 규칙 로드**: `writing/` 폴더의 모든 파일을 읽으세요.
