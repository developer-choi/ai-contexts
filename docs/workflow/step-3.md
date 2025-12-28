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

## 3. 작업 내용 (commit-sequence 내용 그대로 복사)
**[CRITICAL]** `/plan/commit-sequence.md`에 해당 커밋에 대해 작성된 **모든 내용을 빠짐없이 복사**합니다.

예시:
```
- `src/types/post.ts` 생성
  - Post 인터페이스 (id, userId, title, body, category, tags, createdAt)
  - Category Enum (NOTICE, QNA, FREE)
  - PostListParams 인터페이스 (offset, limit, title, body, category, orderBy, order)
  - PostListApiResponse 인터페이스 (list: Post[])
```
---

## 작성 시 주의사항 (CRITICAL)

### ✅ Step 3에서 해야 할 것
1. **commit-sequence의 모든 내용을 그대로 포함**:
   - 생성할 파일 목록
   - 구현할 인터페이스/함수/컴포넌트 **이름**
   - 각 모듈의 역할 및 포함 사항
   - 더미 데이터 사용 여부 등

2. **commit-sequence보다 부실하면 안 됩니다**: Step 3 문서는 commit-sequence와 **최소한 동일한 수준** 이상이어야 합니다.

3. 다 옮겼으면, commit-sequence.md 에 있던 내용중 옮겨진 내용은 커밋메시지를 제외하고 모두 삭제합니다.

### ❌ Step 3에서 하지 말아야 할 것
Step 4에서 추가할 내용들 (아래는 Step 3에서 작성하지 않음):
- 타입 시그니처 상세 (Input/Output, Props 인터페이스)
- 핵심 로직 스니펫 (localStorage, cookies 등)
- 엣지 케이스 처리 방법
- 테스트 케이스 체크리스트

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