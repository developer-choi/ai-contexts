---
target: monorepo-playground
---

# Monorepo Playground

## [not-ready] 테스트 코드 도입

- MP에 테스트 코드를 추가하고, test-all / test-staged 스크립트에 통합

## [not-ready] API 함수 네이밍 통일

- MP의 API 함수가 개별 export 패턴(`getBoardListApi`)으로 되어 있음
- 컨벤션/채용과제는 `{domain}Api` 객체 패턴(`contestApi.getList()`)
- MP를 객체 패턴으로 마이그레이션 필요
