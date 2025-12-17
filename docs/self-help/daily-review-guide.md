# 일일 작업 회고 피드백 가이드

Claude가 제공할 수 있는 일일 작업 피드백 유형들입니다.

## Claude가 스캔할 프로젝트 경로

### ~/workspace/langdy/*
- langdy-admin
- langdy-student
- langdy-teacher
- design-system
- langdy-utils

### ~/WebstormProjects/*
- dsa-playground
- react-playground
- test-playground
- forworkchoe

### 중요: 모든 브랜치 스캔
- 각 프로젝트에서 현재 브랜치뿐만 아니라 **모든 브랜치**의 커밋을 확인해야 함
- `git log --branches --since="날짜"` 사용하여 브랜치에 올라간 커밋만 조회
- **주의**: `--all` 대신 `--branches` 사용 (reflog만 있는 커밋 제외)
- 브랜치별로 어떤 작업이 진행되었는지 파악

### 중요: Author 필터링
- 내가 작성한 커밋만 조회해야 함
- Author: `forworkchoe@gmail.com` 또는 `yujin.choe@langdy.net`
- `git log --branches --author="forworkchoe@gmail.com\|yujin.choe@langdy.net" --since="날짜"` 사용

### 중요: 회고 결과물 저장
- 회고 결과는 마크다운 형태로 작성
- 저장 위치: `~/Downloads/daily-review-YYYY-MM-DD.md`
- 예: `~/Downloads/daily-review-2025-12-16.md`

---

## 1. 작업 흐름 & 효율성

### 분석 포인트
- 커밋 순서와 작업 진행 방향이 효율적이었는지
- 막힌 부분이 있었다면 다른 접근법은 없었을까
- 시행착오를 줄일 수 있는 방법은
- 작업 우선순위 설정이 적절했는지

---

## 2. 커밋 품질

### 분석 포인트
- 커밋 메시지의 명확성
- 커밋 단위가 적절했는지 (너무 크거나 작지 않은지)
- 기능별로 잘 분리되어 있는지
- 커밋 히스토리가 리뷰어가 이해하기 쉬운 스토리를 만드는지

### 예시 질문
- "하나의 큰 커밋보다 여러 개의 작은 커밋으로 나눴으면 좋았을까?"
- "커밋 메시지가 변경 의도를 명확히 전달하는가?"

---

## 피드백 형식

피드백은 다음 형식으로 제공됩니다:

### ✅ 잘한 점
- 구체적으로 어떤 부분이 좋았는지
- 이유와 근거

### ⚠️ 개선 제안
- 어떤 부분을 개선하면 좋을지
- 구체적인 대안 제시

### 💡 학습 포인트
- 오늘 작업에서 배울 수 있는 점
- 다음 작업에 적용할 인사이트

### 🔧 액션 아이템
- 당장 또는 나중에 처리할 구체적인 작업
- 우선순위 표시
