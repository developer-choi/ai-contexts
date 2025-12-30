# AI 협업 워크플로우 가이드 (Workflow Index)

이 폴더는 **AI와 함께 효율적으로 코드를 작성하기 위한 전체 프로세스**와 규칙을 담고 있습니다.

모든 작업은 `[계획] -> [구체화] -> [구현]`의 단계로 이루어집니다.

---

## 📂 파일 및 단계별 설명

### 0. 공통 컨텍스트
- **[context-setup.md](./context-setup.md)**:
  - 프로젝트의 **공통 경로(Context Path)**, **코드 작성 규칙(Naming, Type, Typography)**, **도메인별 레퍼런스 커밋**을 정의합니다.
  - 모든 작업 시작 시 AI가 가장 먼저 숙지해야 할 문서입니다.

### 1. 목적 정의 (Overview)
- **[step-1.md](./step-1.md)**:
  - **목표**: "무엇을 왜 만드는가?"를 정의하고 핵심 기능 목록을 작성합니다.
  - **Output**: `/plan/overview.md`

### 2. 커밋 계획 수립 (Commit Sequence)
- **[step-2.md](./step-2.md)**:
  - **목표**: 구현 목표를 달성하기 위한 **커밋 단위의 로드맵**을 짭니다.
  - **Output**: `/plan/commit-sequence.md`

### 3. 상세 명세 작성 (Task Refinement)
- 사전 정보 전달
  - docs/for-all-projects 하위 coding/, common/ 폴더 숙지
  - 위에서 만들었던 모든 Context 다시 재전달

- **[step-3.md](./step-3.md)**:
  - **목표**: 커밋 계획을 바탕으로 각 작업의 **상세 명세서(타입, UX, 테스트 케이스 등)**를 작성합니다.
  - **Output**: `/plan/tasks/[순서]-[작업키워드].md`

