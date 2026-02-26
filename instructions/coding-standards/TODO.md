# coding-standards 개편 계획

## 목표

`conventions/` + `code-quality/` → `coding-standards/`로 통합 재편

## 핵심 분류 기준

- **coding/**: 형식 규약 — 맞다/틀리다로 판단 가능 (린터 수준)
- **quality/**: 품질 원칙 — 정도의 문제, 사람이 판단 (설계, 가독성)
- **testing/**: 테스트 코드 작성 규칙
- **writing/**: 코드 산출물 문서 작성 톤
- **git/**: Git 작업 규칙

## 현재 구조

```
coding-standards/
├── README.md                  # AI 행동 가이드 (작업 유형별 로딩 규칙) — 재작성 필요
├── TODO.md
│
├── coding/                    # 코드 작성 규칙
│   ├── general.md
│   ├── imports.md
│   ├── naming.md
│   ├── structure.md
│   ├── zod.md
│   ├── markup/
│   │   ├── html.md
│   │   └── style.md
│   ├── react/
│   │   ├── api.md
│   │   ├── basics.md
│   │   ├── button.md
│   │   ├── design.md         # quality? coding? 리뷰 후 결정
│   │   ├── error-handling.md
│   │   └── tanstack-query.md
│   └── typescript/
│       ├── advanced.md
│       └── basic.md
│
├── quality/                   # 품질 원칙
│   ├── README.md
│   ├── readability.md
│   ├── maintainability.md
│   ├── testability.md
│   └── examples/
│       └── product-list.md
│
├── testing/                   # 테스트 코드 작성 규칙
│   ├── convention.md
│   ├── pattern.md
│   └── queries.md
│
├── writing/                   # 코드 산출물 문서 작성 톤
│   └── tone.md
│
└── git/                       # Git 규칙
    └── rules.md
```

## 리뷰 필요 후 결정할 파일

| 파일 | 현재 위치 | 이슈 | 예상 행선지 |
|------|-----------|------|-------------|
| design.md | coding/react/ | 원칙 성격 → quality? coding? | 리뷰 후 결정 |

## 미결 사항

- [ ] coding/, testing/, writing/ 파일 내용 리뷰 미완료 — 리뷰 후 추가 이동/병합 발생 가능

## 남은 작업 순서

1. coding/, testing/, writing/ 파일 내용 리뷰 → 미결 사항 확정
2. 미결 사항 일괄 결정
3. 내용 수정 반영 (파일 내용 확정)
4. 영향 범위 파악
5. 참조 경로 일괄 수정
6. coding-standards/README.md AI 행동 가이드 재작성

## 영향 범위 파악 (5번 상세)

폴더명이 `conventions/`, `code-quality/` → `coding-standards/`로 바뀌었으므로, 기존 경로를 참조하는 모든 곳을 파악해야 한다.

### 이 레포 내부
- 문서 간 상호 참조 (상대 경로 링크, README.md 등)
- instruction-map.md, CONTRIBUTING.md 등 메타 문서
- CLAUDE.md 등 에이전트 설정 파일

### 외부 레포
- 다른 레포의 CLAUDE.md 등에서 GitHub raw URL로 이 레포의 파일을 직접 참조하는 경우
  - 예: `https://raw.githubusercontent.com/.../instructions/conventions/...`
  - 예: `https://github.com/developer-choi/ai-contexts/blob/main/instructions/conventions/...`
- 개편 후 기존 URL이 전부 깨지므로, 외부 레포도 경로 업데이트 필요
