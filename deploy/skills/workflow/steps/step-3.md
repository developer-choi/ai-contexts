# Step 3: 과제 정의

> **이 단계의 목표: 과제를 정의하고 기술 전략을 수립한다**

> **Plan mode 필수**. AI가 제시한 과제는 사용자 승인을 거쳐야 하며, 승인된 과제만 Step 4에서 구현 방침을 작성한다.

---

### 스킬 로드

아래 조건에 해당하는 스킬을 **모두** 로드합니다. 여러 개면 위에서부터 순서대로 하나씩 실행합니다.

| 순서 | 조건 | 스킬 | 실행 | 설명 |
|:---:|------|------|------|------|
| 1 | 채용과제 | [prefer-packages](../requirement-review/recruitment/prefer-packages.md) | — | 선호 패키지 참조 |

### 컨벤션 사전 참조

overview.md 작성 전에 아래를 읽고 기술 전략에 반영한다:

- [coding-standards/map.md](../../../contexts/coding-standards/map.md)에서 현재 작업과 관련된 규칙 확인
- 사용자에게 프로젝트별 컨벤션(회사 컨벤션 등)이 있는지 확인하고, 있으면 함께 참조

여기서 파악한 컨벤션은 `/plan/pr{N}/persistent/reference.md`에 초기 작성한다. 책임·포함 항목·소비처는 [conventions/artifact/reference-curation.md](../conventions/artifact/reference-curation.md) 참조.

### overview.md 생성 + 기술 전략 수립

`/plan/pr{N}/` 하위와 `/plan/background/`를 탐색하여 기존 산출물을 읽고, overview.md를 작성한다. 이 단계에서는 읽기만 하며, 원본 산출물을 삭제하지 않는다 (소비는 Step 4에서).

이 단계는 "무엇을 구현할지"를 결정한다. "어떻게 구현할지"는 Step 4에서 다룬다.

#### step-3 작업 흐름 — overview.md를 단일 캔버스로

step-3 진행 중에는 overview.md가 **단일 작업 캔버스** 역할을 한다. 결정·근거·트레이드오프·기술 선택·외부 자료 링크 등을 일단 overview.md에 모두 적어 사용자가 한 화면에서 검토할 수 있게 한다.

**트레이드오프 작성 주체**: 각 결정의 trade-off(유리한 축 / 불리한 축)는 사용자가 직접 채운다. AI는 결정 후보를 나열하고 각 후보 옆에 비어 있는 trade-off 칸만 만들어 둔 뒤 "이 결정의 trade-off를 적어 주십시오"라고 질문하며, 임의로 trade-off를 채우지 않는다. 사용자가 채운 trade-off 위에서 AI는 빠진 축·과장된 축을 검증·보강한다.

step-3 종료 직전(사용자 승인·토론 마무리 후) 각 갈래를 분배한다:

| 갈래 | 분배 대상 |
|---|---|
| 의사결정 근거·트레이드오프·거부 대안·발화 흐름 | `pr{N}/persistent/decisions.md` |
| 외부 자료 링크·회사·프로젝트 컨벤션·베스트프랙티스 경로 | `pr{N}/persistent/reference.md` |
| 기술 선택 결과 (채택안) | `pr{N}/persistent/decisions.md` 채택안 절 — overview에 안 남김 |
| 의도(목표·범위·열려있는 질문) | `pr{N}/consumable/overview.md`에 남김 |

분배 완료 시점부터 overview.md는 의도만 가진 단순 산출물이 된다. step-4부터 다른 step은 분배 완료 상태를 가정한다.

step-3 진행 중에 overview.md가 비대해도 무방 — 작업 캔버스 시점이므로 짧은 코드 블록·근거 본문이 일시 공존. 분배 직전이 정리 시점.

### 산출물: `/plan/pr{N}/consumable/overview.md`

PR별로 아래 항목을 포함한다. **의도 수준만 기술**한다 — 상세 스펙·구체적 기술 키워드(라이브러리명, px값, 토큰명 등)·코드 블록(zod 스키마 본문, JSX, SCSS, 함수 시그니처 외 본문)은 넣지 않는다.

상단에 큐 모델 자가 정리 안내문을 박는다 ([conventions/plan-folder.md](../conventions/plan-folder.md) 「consumable/ 산출물 자가 정리 안내문」). 본 파일 모든 절의 마지막 소비자는 step-7 (PR 본문 작성). step-7에서 PR 본문에 녹인 뒤 일괄 폐기.

본문 항목:

- 이 PR의 목표
- 범위 요약 (뭘 만드는지의 경계)
- **열려있는 질문** — 본 PR **외부 의존성** (백엔드 합의·디자인 검수·인프라 결정 등 본 PR 안에서 해소 안 되지만 다른 PR로 옮기지도 않는 항목). step-7에서 PR 본문 "Known issues / Follow-up" 절로 녹임

**PR 이연 항목은 「열려있는 질문」이 아니라 `/plan/background/consumable/project.md`의 해당 PR 섹션에 적는다**. project.md가 PR 분할·TODO 인덱스이므로 이연 항목은 그 PR 항목의 TODO로 직접 들어가는 게 자연스럽다 — overview.md를 거치면 후속 PR이 본 PR의 overview를 다시 봐야 하는 모순이 생긴다.

외부 참조 자료 링크는 overview.md에 적지 않고 reference.md(아래)에 누적한다.

**산출물 분담 (overview vs decisions vs reference vs markup/logic)**:

| 산출물 | 책임 | 코드 블록 |
|---|---|---|
| `overview.md` | **의도만** — 목표·범위·열려있는 질문. 기술 선택·근거는 decisions.md | 코드 블록 없음 |
| `decisions.md` | **기록 대상 결정의 근거** + 의사결정 흐름 (사용자 발화 단계 + 거부/채택 사유) | 사용자 발화 인용은 그대로. 코드는 시그니처 수준만 |
| `reference.md` | 외부 자료 링크 + 회사·프로젝트 컨벤션·베스트프랙티스 경로 인덱스 | 코드 없음 |
| `markup.md` | **Figma 원본 링크 인덱스(사용자 입력)** + 토큰 매핑표·매칭표 | 코드 블록 없음 (링크·도표만) |
| `implementation.md` | 구현 순서·커밋 분할·회귀 체크리스트 | 시그니처·함수명 OK |

「열려있는 질문」 절의 역할:
- 본 PR 안에서 해소 안 되는 외부 의존성 (백엔드 응답 형상 확정, 디자인 검수 라운드 결과, 인프라 결정 등 PR이 아닌 외부 작업)
- step-5에서 코드 안 `TODO` 마커는 본 PR 안에서 모두 해소되어야 하므로, 본 PR이 처리 못 하는 외부 의존성은 본 절에서 관리
- step-7에서 PR 본문 "Known issues / Follow-up" 절로 녹인 뒤 overview.md 폐기 (consumable)

**PR 이연 항목은 본 절 대상이 아니다** — `/plan/background/consumable/project.md`의 해당 PR 섹션에 적는다. 예: "PR4에서 만료 안내 배너 추가" 같은 항목은 PR4의 project.md TODO로 직접 들어간다.

### 산출물: `/plan/pr{N}/persistent/reference.md`

본 step에서 초기 작성. 명세는 [conventions/artifact/reference-curation.md](../conventions/artifact/reference-curation.md) 참조.

### [CRITICAL] Project 문서 간소화

`/plan/background/consumable/project.md`가 존재하면, 현재 PR의 상세 내용을 삭제하고 제목만 남긴다. TODO는 `/plan/pr{N}/consumable/overview.md`에 옮기고, 사용자에게 옮겼다고 안내한다.

### 의사결정 토론

overview.md 작성 후, 토론할 의사결정 항목을 식별하여 사용자에게 안내한다. 자동으로 토론에 진입하지 않으며, 사용자의 명시적 허가가 있을 때에만 진행한다.

- **안내 내용**: overview.md에서 도출한 토론 후보 항목 목록 + 항목별 핵심 쟁점 한 줄 요약. "토론할까요?"만 묻고 끝내지 않는다 — 사용자가 항목을 보고 진행 여부와 범위를 판단할 수 있어야 한다. 각 후보 항목 옆에 trade-off 칸을 비워두고 사용자가 채우게 한 뒤, 그 위에서 토론을 진행한다 (AI가 trade-off를 미리 채우지 않는다)
- **진입 조건**: 사용자가 명시적으로 허가한 경우에만 토론 진입. 사용자가 일부 항목만 선택하면 그 범위로 진행하고, 생략을 원하면 토론 없이 다음 단계로 넘어간다
- **방식 (허가 시)**: 반대 입장 에이전트(opus)를 spawn하여, 메인 에이전트가 overview.md의 기술 선택을 방어한다
- **반대 에이전트 행동 규칙**: [/discussion 원칙](../../discussion/SKILL.md) 적용 — 정확성 우선, 모호한 근거 수용 금지
- **종료 조건**: 허가된 항목에 대해 도전이 완료되면 종료

### 산출물: `/plan/pr{N}/persistent/decisions.md`

본 step에서 초기 작성. 책임·포함·제외 기준·세 갈래 양식·작성 양식·생성 게이트(단발 발화 확인)는 [conventions/artifact/decisions-lifecycle.md](../conventions/artifact/decisions-lifecycle.md) 참조.

---

## 보고 내용

- 이 PR의 목표 한 줄 요약
- 핵심 기술 선택과 그 이유
- 주요 trade-off나 열려있는 질문 (있는 경우)

### [CRITICAL] 산출물 파일 존재 확인

보고 전에 산출물 파일이 실제로 생성되었는지 확인한다 (`/plan/pr{N}/consumable/overview.md` 필수, `/plan/pr{N}/persistent/reference.md` 필수, `/plan/pr{N}/persistent/decisions.md`는 토론했거나 사용자 명시 결정이 있는 경우). 구두 보고만으로 완료 처리하지 않는다.
