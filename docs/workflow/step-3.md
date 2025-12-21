# Step 3: Task Detail 1차 - 스캐폴딩(뼈대) 작성 요청
이 단계는 `/plan/commit-sequence.md`에 정의된 커밋들의 상세 명세서를 작성하기 위해, 우선 **파일 뼈대(Skeleton)를 생성하는 단계**입니다.

# 참고 자료
- [background.md](./background.md)
- `/plan/motivation.md` (Step 1에서 생성됨)
- `/plan/commit-sequence.md` (Step 2에서 생성됨)
- [기획서 링크]
- [피그마 링크]
- [회의 음성 텍스트 요약본]
- [관련 필기]
- [간단한 개발설계]

# 요청 내용
`/plan/commit-sequence.md`에 있는 커밋 목록 중 **다음에 작업할 커밋(들)**에 대해,
`/plan/tasks/` 폴더 아래에 Markdown 파일을 생성하고 기본 정보를 작성해주세요.

**파일 명명 규칙**: `/plan/tasks/[순서]-[작업키워드].md`
(예: `/plan/tasks/01-feat-button.md`)

## 작성 양식
아래 양식 그대로 작성하여 파일을 생성해주세요.

---
# [커밋 메시지] (H1)

## 1. 개요
- **작업 파일**: `src/components/.../FileName.tsx` (예상되는 파일 경로 명시)
- **목적**: 이 작업이 왜 필요한지 세 줄 미만 요약.

## 2. 예상 영향 범위
- **수정되는 파일**: 기존 코드를 수정해야 한다면 해당 파일 목록.
- **테스트 포인트**: 이 작업으로 인해 꼭 확인해야 할 기능.
---

## 작성 시 주의사항
- 이 단계에서는 **상세한 로직이나 타입 정의를 하지 않습니다.** (Step 4에서 진행)
- 파일 경로와 목적만 정확하게 잡아주세요.

## [Completion Check] 사용자 확인 요청 (User Notice)
모든 스캐폴딩 문서 생성이 완료되면, 각 문서에 정의된 **'작업 대상 파일'들의 경로를 폴더별로 그룹화**하여 보여주세요.

### 확인 목적
- 한 폴더 내에 너무 많은 파일이 생성되어 관리가 어려워지는 것(Flat Structure)을 방지하기 위함입니다.

### 출력 예시
> **생성 예정 파일 목록 (폴더별 정리)**
>
> 📂 **`src/components/common/`**
> - `Button.tsx`
> - `Input.tsx`
> - `Modal.tsx`
> ...
>
> 📂 **`src/features/board/ui/`**
> - `BoardCard.tsx`
> - `BoardList.tsx`
>
> "특정 폴더에 파일이 너무 많이 몰려있지 않은지 확인 부탁드립니다. 폴더를 더 세분화할 필요가 있을까요?"