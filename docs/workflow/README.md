# AI 협업 워크플로우 가이드 (Workflow Index)

이 폴더는 **AI와 함께 효율적으로 코드를 작성하기 위한 전체 프로세스**와 규칙을 담고 있습니다.

모든 작업은 `[계획] -> [구체화] -> [구현]`의 단계로 이루어집니다.

---

## 📂 파일 및 단계별 설명

### 0. 공통 컨텍스트
- **[background.md](./background.md)**:
  - 프로젝트의 **공통 경로(Context Path)**, **코드 작성 규칙(Naming, Type, Typography)**, **도메인별 레퍼런스 커밋**을 정의합니다.
  - 모든 작업 시작 시 AI가 가장 먼저 숙지해야 할 문서입니다.

### 1. 목적 정의 (Motivation)
- **[step-1.md](./step-1.md)**:
  - **목표**: "왜 이 기능을 만드는가?"를 정의합니다.
  - **Output**: `/plan/motivation.md`

### 2. 커밋 계획 수립 (Commit Sequence)
- **[step-2.md](./step-2.md)**:
  - **목표**: 구현 목표를 달성하기 위한 **커밋 단위의 로드맵**을 짭니다.
  - **Output**: `/plan/commit-sequence.md`

### 3. 상세 명세 스캐폴딩 (Task Scaffolding)
- **[step-3.md](./step-3.md)**:
  - **목표**: 커밋 계획을 바탕으로 **개발 명세서의 뼈대(파일 경로, 목적)**를 잡습니다.
  - **Output**: `/plan/tasks/[순서]-[작업키워드].md` **파일 생성 후 기본 내용 작성**

### 4. 상세 명세 구체화 (Task Refinement)
- **[step-4.md](./step-4.md)**:
  - **목표**: Step 3에서 생성된 스캐폴딩 파일에 **사용자 정보(피그마, 타입 등)**를 반영하여 **완벽한 개발 명세서**를 완성합니다.
  - **Output**: 위에서 생성된 `/plan/tasks/*.md` 파일을 **구체화**
