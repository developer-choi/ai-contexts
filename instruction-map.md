# 개요
AI 에이전트가 적절한 컨텍스트 문서를 찾아 로드하기 위한 라우팅 맵입니다.

사용자는 "ai-contexts" 키워드와 함께 원하는 작업을 요청하면 됩니다.

## 사용법 & AI 실행 규칙 예시
- 사용자: "ai-contexts로 복습하자"
- AI: "instructions/self-help/review-study.md 불러오면 될까요?"

## 검색 우선순위

1. **파일명/폴더명 매칭**: 아래 목록에서 파일명/폴더명으로 검색 후 매칭되는게 있다면 사용자 승인없이 불러옵니다.
   - 예: "review-study" → `instructions/**/review-study.md` 검색
   - 예: "conventions" → `instructions/conventions/README.md` 검색

2. **설명 기반 매칭**: 위 방법 실패 시 각 항목의 설명(불렛 포인트)에서 의미 매칭 후 사용자 승인 요청을 거쳐야합니다.
   - 예: "복습하자" → 설명 검색 → "instructions/self-help/review-study.md 불러올까요?"

---

## 1. 실무

```bash
instructions/workflow/README.md
```
- 기획리뷰, 디자인리뷰
- 코드-커밋-PR작성계획수립

---

## 2. 학습 & 성장

```bash
instructions/self-help/review-work.md
```
- 업무회고

```bash
instructions/self-help/tech-trends.md
```
- 기술블로그 트렌드 탐색

```bash
instructions/self-help/roadmap.md
```
- 문제해결과정 수립 & 진행
- 프로젝트 README 작성

---

## 3. 개발 작업

```bash
instructions/conventions/README.md
```
- 코드작성 / 코드수정 / 버그수정 / 리팩토링
- 코드리뷰 / 커밋리뷰 / PR리뷰

```bash
instructions/code-quality/README.md
```
- 코드 품질 리뷰 (응집도, 결합도, 구조 검증)
- 읽기 쉬운 코드 / 유지보수하기 쉬운 코드 / 테스트하기 쉬운 코드

---

## 4. 취업 준비

```bash
instructions/recruitment/recruitment-trend.md
```
- 채용공고 분석

---

## 5. 라이브러리 간소화

```bash
instructions/simplify/README.md
```
- 라이브러리 소스코드 간소화 / 단순화
- 간소화 프로젝트 초기 세팅

---

## 6. 기타

```bash
instructions/clone-code-markup.md
```
- 마크업 클론코딩

---

## 7. 문서 관리

```bash
instructions/audit/workflow/README.md
```
- workflow 문서 최신화 / 정리

```bash
instructions/audit/conventions/README.md
```
- conventions 문서 최신화 / 정리

```bash
instructions/audit/README.md
```
- 명령문 검증 체크리스트
