---
description: 라이브러리 소스코드를 학습용으로 간소화하는 워크플로우 가이드
argument-hint: [init | 작업 단계]
---

# AI 행동 가이드

> **용어 정의**
> - **SIMPLIFY_SOURCE**: 이 스킬 폴더 (`deploy/skills/simplify/`). 워크플로우, 패턴 참조, 문서 양식 등 규칙 파일이 있는 곳.
> - **SIMPLIFY_TARGET**: 간소화 대상 프로젝트 (`simplified-[라이브러리명]`). 실제 코드를 읽고 단순화하는 작업 프로젝트.

## 새 프로젝트 시작

1. **초기 세팅**: `initialize.md` 읽기

## 단순화 작업 진행

1. **작업 프로세스**: `main.md` 읽기
2. **유지/삭제 패턴 참고**:
   - SIMPLIFY_SOURCE `common-keep-patterns.md` — 공통 유지 패턴
   - SIMPLIFY_SOURCE `common-simplification-patterns.md` — 공통 삭제 패턴
   - SIMPLIFY_TARGET `instructions/keep-patterns.md` — 라이브러리 특화 유지 패턴
   - SIMPLIFY_TARGET `instructions/simplification-patterns.md` — 라이브러리 특화 삭제 패턴
3. **문서 양식 참고** (필요 시): `[타입]/format/` 하위 파일 읽기
   - `[타입]`: 컴포넌트 라이브러리 → `component`
4. **코드 변환**: `convert.md` 읽기

## 코드 리뷰

1. **리뷰 프로세스**: `review.md` 읽기
