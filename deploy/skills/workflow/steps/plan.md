---
step: plan
session: PR_{N}_PLAN
scope: per-pr
entry: >-
  BG 「레포 확보」 + (종류 COMPONENTS) MARKUP 「공통 컴포넌트 확정」 완료. 학습 인수인계 후 진입 대기 적용
  (채용이고 이 PR의 종류가 FOUNDATION이면 제외). PR 확정과 의존 PR의 realize-plan 커밋은 스크립트가 판정한다
model: Opus
next:
  - to: realize-plan
  - to: pr-body-draft
---

# plan: 과제 정의

> **이 단계의 목표: 과제를 정의하고 기술 전략을 수립한다**

> **Plan mode 필수**. AI가 제시한 과제는 사용자 승인을 거쳐야 하며, 승인된 과제만 구현 단계에서 구현한다 (실행 또는 stub 분해).

---

### 입력·산출물·작업 위치

- **입력**: `background/consumable/todo.md` 해당 PR 섹션 + BG 산출물 + 이미 끝난 PR들의 `persistent/` (decisions, reference, implementation — 번호상 앞선 PR이 아니라 실제로 완료된 PR)
- **산출물**: `pr{N}/persistent/`: overview.md, decisions.md, reference.md
- **작업 위치**: main repo `/plan/`. PR_{N} 워크트리는 아직 없다 — realize-plan이 만든다

### 컨벤션 사전 참조

overview.md 작성 전에 아래를 읽고 기술 전략에 반영한다:

- [code-map.md](../../../contexts/code-map.md)의 탐색 절차로 현재 작업과 관련된 규칙·구현 패턴 확인
- `/plan/background/retained/conventions-index.md`(자료 수집 단계 산출물)에서 이번 PR 관련 항목을 **선별**한다. 프로젝트 컨벤션을 여기서 재수집하거나 사용자에게 재질문하지 않는다 — 인덱스에 없는 갭이 의심될 때만 그 갭을 콕 집어 질문한다
- 인덱스가 없으면(이전 단계 스킵 등) fallback으로 사용자에게 프로젝트별 컨벤션(회사 컨벤션 등)이 있는지 확인하고, 있으면 함께 참조

여기서 선별한 컨벤션은 `/plan/pr{N}/persistent/reference.md`에 초기 작성한다. 책임·포함 항목·소비처는 [conventions/artifact/reference-curation.md](../conventions/artifact/reference-curation.md) 참조.

### overview.md 생성 + 기술 전략 수립

`/plan/pr{N}/` 하위와 `/plan/background/`를 탐색하여 기존 산출물을 읽고, overview.md를 작성한다. 이 단계에서는 읽기만 하며, 원본 산출물을 삭제하지 않는다 (소비는 구현 단계에서).

이 단계는 "무엇을 구현할지"를 결정한다. "어떻게 구현할지"는 구현 단계에서 다룬다.

#### plan 작업 흐름 — overview.md를 단일 캔버스로

plan 진행 중에는 overview.md가 **단일 작업 캔버스** 역할을 한다. 결정·근거·트레이드오프·기술 선택·외부 자료 링크 등을 일단 overview.md에 모두 적어 사용자가 한 화면에서 검토할 수 있게 한다.

**트레이드오프 작성 주체**: 각 결정의 trade-off(유리한 축 / 불리한 축)는 사용자가 직접 채운다. AI는 결정 후보를 나열하고 각 후보 옆에 비어 있는 trade-off 칸만 만들어 둔 뒤 "이 결정의 trade-off를 적어 주십시오"라고 질문하며, 임의로 trade-off를 채우지 않는다. 사용자가 채운 trade-off 위에서 AI는 빠진 축·과장된 축을 검증·보강한다.

plan 종료 직전(사용자 승인·토론 마무리 후) 각 갈래를 분배한다:

| 갈래 | 분배 대상 |
|---|---|
| 의사결정 근거·트레이드오프·거부 대안·발화 흐름 | `pr{N}/persistent/decisions.md` |
| 외부 자료 링크·회사·프로젝트 컨벤션·베스트프랙티스 경로·라이브러리별 공식 가이드 확인 결과(아래 「라이브러리에 기대는 기술 선택은 공식 가이드부터 찾는다」) | `pr{N}/persistent/reference.md` |
| 기술 선택 결과 (채택안) | `pr{N}/persistent/decisions.md` 채택안 절 — overview에 안 남김 |
| 의도(목표·범위·열려있는 질문) + (있으면) PR 종류 + 이 PR 몫 TODO | `pr{N}/persistent/overview.md`에 남김 |

분배 완료 시점부터 overview.md는 의도만 가진 단순 산출물이 된다. realize-plan부터 다른 step은 분배 완료 상태를 가정한다.

plan 진행 중에 overview.md가 비대해도 무방 — 작업 캔버스 시점이므로 짧은 코드 블록·근거 본문이 일시 공존. 분배 직전이 정리 시점.

#### 라이브러리에 기대는 기술 선택은 공식 가이드부터 찾는다

라이브러리 API·패턴에 기대는 기술 선택을 사용자에게 내기 전에, 같은 문제를 다룬 가이드를 아래 찾을 곳에서 모두 찾는다. 한 곳에서 답이 나왔다고 나머지를 건너뛰지 않고, 선택이 기대는 라이브러리마다 본다.

- 그 라이브러리의 공식 문서: 설치 버전 판과 최신 stable 판 둘 다. 최신 stable이 몇인지는 레지스트리(`npm view <패키지> version`)로 먼저 확인한다. 문서 사이트가 최신판만 보여 주면 설치 버전 판은 공식 저장소의 그 버전 태그에 든 문서에서 본다. 설치 버전만 보면 그 뒤에 들어온 내장 해법을 놓친다 — 최신 stable이 같은 문제를 푸는 API를 갖고 있으면 버전을 올리는 것도 선택지다
- 공식 저장소의 이슈·PR·릴리스 노트: 그 API가 왜·어떻게 들어왔는지가 여기 있다
- MP(monorepo-playground) docs

입력 문서(todo.md 등)가 해법을 적어 넘겼어도 같다. 입력이 적은 재현 결과는 원인의 근거일 뿐 그 해법이 맞다는 근거가 아니다.

찾는 일은 라이브러리마다 일회성 서브에이전트를 나란히 띄워 맡긴다. 넘기는 것은 라이브러리 이름·설치 버전·풀려는 문제, 위 찾을 곳 목록, 아래 「기술 선택을 낼 때」 문단의 칸 양식이고, 돌려받는 것은 그 문단이 정한 표의 그 라이브러리 행이다. 메인이 혼자 찾으면 라이브러리×찾을 곳만큼 조회가 쌓여 뒤쪽 칸을 「조회하지 않았다」로 남긴다.

찾은 가이드·예시가 같은 문제를 서로 다른 방식으로 풀고 있으면 — 서로를 반대한다고 적혀 있지 않아도 — 하나를 골라 채택안으로 내지 않고, 각각을 원문과 함께 선택지로 낸다.

기술 선택을 낼 때는 그 선택이 기대는 라이브러리를 행으로, 위에서 찾을 곳을 열로 둔 표를 먼저 낸다. 칸마다 확인 결과를 적고, 빈칸을 남기지 않는다.

확인 결과는 근거가 된 가이드의 원문 인용(문장만 옮기고 코드는 링크로 가리킨다)이거나, 찾지 못했으면 「찾아봤는데 없음」과 찾아본 곳(검색어·사이트·파일)이다. 「조회하지 않았다」는 확인 결과가 아니라서, 한 칸이라도 그렇게 남기지 않는다.

원문 인용은 요약을 거치지 않은 본문에서 옮긴다. 공식 문서 페이지가 요약으로 돌아오거나 열리지 않으면(응답 오류·페이지 없음) 그 칸의 찾아본 곳에 실패한 URL을 적고, 같은 판(설치 버전 칸은 그 버전 태그)의 공식 저장소 docs 폴더·README 원본 파일(raw)에서 다시 가져온다.

프로젝트가 쓰지만 이 선택이 기대지 않는 라이브러리는 표의 행에서 빼고, 표 아래에 왜 기대지 않는지 한 줄 적는다.

### 산출물: `/plan/pr{N}/persistent/overview.md`

PR별로 아래 항목을 포함한다. **의도 수준만 기술**한다 — 상세 스펙·구체적 기술 키워드(라이브러리명, px값, 토큰명 등)·코드 블록(zod 스키마 본문, JSX, SCSS, 함수 시그니처 외 본문)은 넣지 않는다.

본문 항목:

- 이 PR의 목표
- 의존 — `todo.md` 이 PR 절의 「의존」을 그대로 옮긴다(realize-plan이 base 브랜치 판단거리로 읽는다). 없으면 `- 없음`
- 범위 요약 (뭘 만드는지의 경계)
- **열려있는 질문** — 본 PR **외부 의존성** (백엔드 합의·디자인 검수·인프라 결정 등 본 PR 안에서 해소 안 되지만 다른 PR로 옮기지도 않는 항목)
- `## TODO` — 고정 헤딩. `todo.md` 이 PR 절의 TODO를 옮겨 오고, 소비 뒤에 생기는 이 PR 몫 TODO도 여기 쌓인다. 없으면 `- 없음`

**PR 이연 항목은 「열려있는 질문」이 아니라 그 PR의 TODO로 적는다** ([PR 몫 TODO 등록처](../conventions/pr-split.md#pr-몫-todo-등록처)).

외부 참조 자료 링크는 overview.md에 적지 않고 reference.md(아래)에 누적한다.

**산출물 분담 (overview vs decisions vs reference vs markup/logic)**:

| 산출물 | 책임 | 코드 블록 |
|---|---|---|
| `overview.md` | **의도만** — 목표·의존·범위·열려있는 질문 + 이 PR 몫 TODO. 기술 선택·근거는 decisions.md | 코드 블록 없음 |
| `decisions.md` | **기록 대상 결정의 근거** + 의사결정 흐름 (사용자 발화 단계 + 거부/채택 사유) | 사용자 발화 인용은 그대로. 코드는 시그니처 수준만 |
| `reference.md` | 외부 자료 링크 + 회사·프로젝트 컨벤션·베스트프랙티스 경로 인덱스 + 라이브러리별 공식 가이드 확인 결과 | 코드 없음 |
| `markup.md` | **Figma 원본 링크 인덱스(사용자 입력)** + 토큰 매핑표·매칭표 (figma 없는 모드는 N/A — [modes.md](../conventions/modes.md)) | 코드 블록 없음 (링크·도표만) |
| `implementation.md` | **구현 계획** ([conventions/artifact/implementation-spec.md](../conventions/artifact/implementation-spec.md) 단일 출처) | 신설 시그니처·함수명 OK (rename류 기존 식별자 전사 X — grep 일괄치환 지시로) |

### 산출물: `/plan/pr{N}/persistent/reference.md`

본 step에서 초기 작성. 명세는 [conventions/artifact/reference-curation.md](../conventions/artifact/reference-curation.md) 참조.

### todo.md 현재 PR 절 소비

`/plan/background/consumable/todo.md`가 존재하면 **현재 PR 절을 `/plan/pr{N}/persistent/overview.md`로 소비한다** (TODO는 overview `## TODO`로 이관) 후 사용자에게 안내. 소비 후 처리는 [라이프사이클 규칙](../conventions/plan-folder.md#라이프사이클-규칙)을 따른다.
### 의사결정 토론

overview.md 작성 후, 토론할 의사결정 항목을 식별하여 사용자에게 안내한다. 자동으로 토론에 진입하지 않으며, 사용자의 명시적 허가가 있을 때에만 진행한다.

- **안내 내용**: overview.md에서 도출한 토론 후보 항목 목록 + 항목별 핵심 쟁점 한 줄 요약. "토론할까요?"만 묻고 끝내지 않는다 — 사용자가 항목을 보고 진행 여부와 범위를 판단할 수 있어야 한다. trade-off는 위 「트레이드오프 작성 주체」를 따른다.
- **진입 조건**: 사용자가 명시적으로 허가한 경우에만 토론 진입. 사용자가 일부 항목만 선택하면 그 범위로 진행하고, 생략을 원하면 토론 없이 다음 단계로 넘어간다
- **방식 (허가 시)**: 반대 입장 에이전트(opus)를 spawn하여, 메인 에이전트가 overview.md의 기술 선택을 방어한다
- **반대 에이전트 행동 규칙**: [/discussion 원칙](../../discussion/SKILL.md) 적용 — 정확성 우선, 모호한 근거 수용 금지
- **종료 조건**: 허가된 항목에 대해 도전이 완료되면 종료

### 산출물: `/plan/pr{N}/persistent/decisions.md`

본 step에서 초기 작성. 책임·포함·제외 기준·갈래별 양식·생성 게이트(단발 발화 확인)는 [conventions/artifact/decisions-lifecycle.md](../conventions/artifact/decisions-lifecycle.md) 참조.

---

## 보고 내용

- 이 PR의 목표 한 줄 요약
- 핵심 기술 선택과 그 이유
- 주요 trade-off나 열려있는 질문 (있는 경우)

### 산출물 파일 존재 확인

보고 전에 산출물 파일이 실제로 생성되었는지 확인한다 (`/plan/pr{N}/persistent/overview.md` 필수, `/plan/pr{N}/persistent/reference.md` 필수, `/plan/pr{N}/persistent/decisions.md`는 토론했거나 사용자 명시 결정이 있는 경우). 구두 보고만으로 완료 처리하지 않는다.
