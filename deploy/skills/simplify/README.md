# 개요

라이브러리 소스코드를 학습 목적으로 간소화하는 작업 가이드입니다.
원본 코드에서 핵심 개념과 무관한 기능을 점진적으로 제거하여 이해하기 쉬운 코드로 만듭니다.

---

# AI 행동 가이드

## 새 프로젝트 시작

1. **초기 세팅**: `initialize.md` 읽기

## 단순화 작업 진행

> **(이 저장소)** = ai-contexts, **(간소화 프로젝트)** = simplified-[라이브러리명]

1. **작업 프로세스**: (이 저장소) `main.md` 읽기
2. **유지/삭제 패턴 참고**:
   - (이 저장소) `common-keep-patterns.md` — 공통 유지 패턴
   - (이 저장소) `common-simplification-patterns.md` — 공통 삭제 패턴
   - (간소화 프로젝트) `instructions/keep-patterns.md` — 라이브러리 특화 유지 패턴
   - (간소화 프로젝트) `instructions/simplification-patterns.md` — 라이브러리 특화 삭제 패턴
3. **문서 양식 참고** (필요 시): (이 저장소) `[타입]/format/` 하위 파일 읽기
   - `[타입]`: 컴포넌트 라이브러리 → `component`
4. **코드 변환**: (이 저장소) `convert.md` 읽기

## 코드 리뷰

1. **리뷰 프로세스**: `review.md` 읽기
