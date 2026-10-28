---
step: plan
session: PR_{N}_PLAN
scope: per-pr
entry: >-
  BG 「레포 확보」 + (종류 COMPONENTS) MARKUP 「공통 컴포넌트 확정」 완료. BG가 학습 인수인계 문서를 썼으면 그 학습을 마친 뒤 진입한다
  (채용 모드의 FOUNDATION PR은 학습을 기다리지 않는다). PR 확정과 의존 PR의 realize-plan 커밋은 스크립트가 판정한다
model: Opus
next:
  - to: realize-plan
---

# plan: 과제 정의

> **이 단계의 목표: 과제를 정의하고 기술 전략을 수립한다**

> 이 단계는 `/plan/` 산출물만 쓴다.

---

## 입력·산출물·작업 위치

- **입력**:
  - `background/consumable/todo.md` 해당 PR 섹션
  - BG 산출물
  - (공통 컴포넌트를 받는 PR) `background/retained/component-list.md`
  - `pr list` 단계가 realized인 다른 PR들의 `persistent/`
- **산출물**: `pr{N}/persistent/`: overview.md, reference.md, decisions.md(아래 「산출물 파일 존재 확인」의 조건일 때)
- **작업 위치**: main repo `/plan/`. PR_{N} 워크트리는 아직 없다

## 읽기 위임

앞선 PR·컨벤션·background는 메인이 직접 읽지 않고 일회성 서브에이전트들에 나눠 맡긴다. 메인이 다 읽으면 맥락이 무거워져 파일을 잘라 읽거나 뒤쪽 확인을 건너뛰고, 그 자리에서 이어받을 결정이 빠진다.

띄우기 전에 메인은 todo.md 이번 PR 절을 읽고, 이어받을 PR을 가리고, `/plan/` 파일 목록에 `/plan/background/retained/conventions-index.md`(자료 수집 단계 산출물)가 있는지만 본다.

- 이어받을 PR은 `node {{skill_dir}}/scripts/steps.mjs pr list`에서 단계가 realized인 다른 PR이다. 그 목록과 `/plan/` 폴더 목록으로 가린다 — 서브에이전트가 읽을 파일을 메인이 열지 않기 위해서다.
- 인덱스가 없으면(이전 단계 스킵 등) 사용자에게 프로젝트별 컨벤션(회사 컨벤션 등)이 있는지 먼저 묻는다 — 서브에이전트는 사용자에게 묻지 못한다.

그다음 아래 서브에이전트를 한 메시지로 나란히 띄운다. 모두 이번 PR 범위(todo.md 절·`/plan/pr{N}/` 경로)를 받고, 돌려주는 항목마다 출처 파일·원문 인용을 붙인다. 띄워 둔 동안 메인은 `/plan/pr{N}/` 하위(이번 PR 분석이라 걸러 낼 것이 없다)를 직접 읽는다.

1. 이전 PR 결정
   - 넘기는 것: 메인이 가린 PR들의 `pr{M}/persistent/` 경로
   - 돌려받는 것: 이번 PR이 이어받을 결정·컨벤션, 그리고 이번 PR이 전제를 바꿔 다시 열어야 할 결정
2. 컨벤션 매칭
   - 맡기는 것: [code-map.md](../../../contexts/code-map.md)의 탐색 절차(reference.md 기록과 사용자 확인만 뺀다 — 그 둘은 메인이 한다) + conventions-index.md 선별
   - 넘기는 것: code-map 범주(`실무` → 회사 프로젝트, `채용`·`개인` → 개인 프로젝트. `file-folder-structure` 태그 파일을 포함한다), conventions-index.md 경로 또는 인덱스가 없어 메인이 받은 사용자 답
   - 돌려받는 것: 이번 PR에 매칭된 규칙 행·경로·라인 범위, 그리고 인덱스를 넘겼으면 이번 PR이 건드리는데 인덱스 트리거에 안 걸리는 영역 목록
   - 인덱스에 [표준 참고처](../conventions/artifact/conventions-index.md#표준-참고처--개인실무-모드) 레포가 올라 있으면 레포마다 이번 PR 컴포넌트에 대응하는 파일 경로도 돌려받는다. 레포 경로만으로는 받지 않는다
3. background 발췌
   - 넘기는 것: `/plan/background/` 파일 목록에서 todo.md·conventions-index.md를 뺀 경로들
   - 돌려받는 것: 이번 PR 범위에 걸리는 발췌

## 컨벤션 사전 참조

2번이 돌려준 컨벤션 매칭은 아래대로 쓴다:

- 인덱스가 있으면 프로젝트 컨벤션을 사용자에게 묻는 것은 2번이 돌려준 「인덱스 트리거에 안 걸리는 영역」뿐이다
- 그 질문은 그 영역에 따를 프로젝트 컨벤션이 있는지를 묻는다 — 그 영역의 기술 선택을 묻는 질문으로 갈음하지 않는다
- 2번의 매칭 결과로 메인이 `/plan/pr{N}/persistent/reference.md`를 초기 작성한다. 담을 항목은 [conventions/artifact/reference-curation.md](../conventions/artifact/reference-curation.md) 참조.

## todo.md 현재 PR 절 소비

`/plan/background/consumable/todo.md`의 **현재 PR 절을 `/plan/pr{N}/persistent/overview.md`로 소비한다**. 소비 후 처리는 [라이프사이클 규칙](../conventions/plan-folder.md#라이프사이클-규칙)을 따른다.

## overview.md 생성 + 기술 전략 수립

읽기 위임 결과와 메인이 읽은 todo.md 절·`/plan/pr{N}/` 하위로 overview.md를 작성한다.

### plan 작업 흐름 — overview.md를 단일 캔버스로

plan 진행 중에는 overview.md가 **단일 작업 캔버스** 역할을 한다. 결정·근거·트레이드오프·기술 선택·외부 자료 링크 등을 일단 overview.md에 모두 적어 사용자가 한 화면에서 검토할 수 있게 한다.

**트레이드오프 작성 주체**: 각 결정의 trade-off(유리한 축 / 불리한 축)는 사용자가 직접 채운다.

- AI는 결정 후보를 나열하고 각 후보 옆에 비어 있는 trade-off 칸만 만들어 둔 뒤 "이 결정의 trade-off를 적어 주십시오"라고 질문한다.
- 사용자가 채운 trade-off 위에서 AI는 빠진 축·과장된 축을 검증·보강한다.

### 라이브러리에 의존하는 기술 선택은 공식 가이드부터 찾는다

라이브러리 API·패턴에 의존하는 기술 선택을 사용자에게 내기 전에, 같은 문제를 다룬 가이드를 아래 찾을 곳에서 모두 찾는다.

- 그 라이브러리의 공식 문서: 설치 버전 판과 최신 stable 판 둘 다.
  - 최신 stable이 몇인지는 레지스트리(`npm view <패키지> version`)로 먼저 확인한다.
  - 문서 사이트가 최신판만 보여 주면 설치 버전 판은 공식 저장소의 그 버전 태그에 든 문서에서 본다.
  - 설치 버전만 보면 그 뒤에 들어온 내장 해법을 놓친다 — 최신 stable이 같은 문제를 푸는 API를 갖고 있으면 버전을 올리는 것도 선택지다
- 공식 저장소의 이슈·PR·릴리스 노트: 그 API가 왜·어떻게 들어왔는지가 여기 있다
- MP(monorepo-playground) docs

입력 문서(todo.md 등)가 해법을 적어 넘겼어도 같다. 입력이 적은 재현 결과는 원인의 근거일 뿐 그 해법이 맞다는 근거가 아니다.

찾는 일은 라이브러리마다 일회성 서브에이전트를 나란히 띄워 맡긴다. 넘기는 것은 라이브러리 이름·설치 버전·풀려는 문제, 위 찾을 곳 목록, 아래 「기술 선택을 낼 때」 문단의 칸 양식이고, 돌려받는 것은 그 문단이 정한 표의 그 라이브러리 행이다. 메인이 혼자 찾으면 라이브러리×찾을 곳만큼 조회가 쌓여 뒤쪽 칸을 「조회하지 않았다」로 남긴다.

찾은 가이드·예시가 같은 문제를 서로 다른 방식으로 풀고 있으면 — 서로를 반대한다고 적혀 있지 않아도 — 하나를 골라 채택안으로 내지 않고, 각각을 원문과 함께 선택지로 낸다.

기술 선택을 낼 때는 그 선택이 의존하는 라이브러리를 행으로, 위에서 찾을 곳을 열로 둔 표를 먼저 낸다. 칸마다 확인 결과를 적고, 빈칸을 남기지 않는다.

확인 결과는 근거가 된 가이드의 원문 인용(문장만 옮기고 코드는 링크로 가리킨다)이거나, 찾지 못했으면 「찾아봤는데 없음」과 찾아본 곳(검색어·사이트·파일)이다. 「조회하지 않았다」는 확인 결과가 아니라서, 한 칸이라도 그렇게 남기지 않는다.

원문 인용은 요약을 거치지 않은 본문에서 옮긴다. 공식 문서 페이지가 요약으로 돌아오거나 열리지 않으면(응답 오류·페이지 없음) 그 칸의 찾아본 곳에 실패한 URL을 적고, 같은 판(설치 버전 칸은 그 버전 태그)의 공식 저장소 docs 폴더·README 원본 파일(raw)에서 다시 가져온다.

프로젝트가 쓰지만 이 선택이 의존하지 않는 라이브러리는 표의 행에서 빼고, 표 아래에 그 이유를 한 줄 적는다.

## 의사결정 토론

overview.md 작성 후, 토론할 의사결정 항목을 식별하여 사용자에게 안내한다.

- **안내 내용**: overview.md에서 도출한 토론 후보 항목 목록 + 항목별 핵심 쟁점 한 줄 요약 — 사용자가 항목을 보고 진행 여부와 범위를 정할 수 있게 한다.
- **진입 조건**: 사용자가 명시적으로 허가한 항목만 토론한다
- **방식 (허가 시)**:
  - 반대 입장 에이전트(opus)를 [team-agent](../../../contexts/team-agent.md) 규칙대로 이름 있는 팀원으로 띄운다
  - 메인 에이전트는 overview.md의 기술 선택을 방어한다
  - 넘기는 trade-off는 사용자가 채운 축과 AI가 보강한 축을 나눠 표시한다. 반대 측은 AI가 보강한 축을 메인의 주장으로 보고 근거를 요구하고, 사용자가 채운 축은 /discussion의 트레이드오프 검증대로 다룬다
- **반대 에이전트 행동 규칙**: [/discussion 원칙](../../discussion/SKILL.md)

## 과제 승인과 분배

토론을 마치면 overview.md의 과제를 사용자에게 승인받는다. 승인된 과제만 다음 단계에서 구현한다. 승인되면 캔버스 내용을 아래 「산출물 분담」 표의 overview·decisions·reference 책임대로 나누고, 분배는 이 단계에서 끝낸다.

## 산출물: `/plan/pr{N}/persistent/overview.md`

PR별로 아래 항목을 **의도 수준으로만** 적는다.

본문 항목:

- 이 PR의 목표
- 의존 — `todo.md` 이 PR 절의 「의존」을 그대로 옮긴다. 없으면 `- 없음`
- 범위 요약 (뭘 만드는지의 경계)
- **열려있는 질문** — 본 PR **외부 의존성** (백엔드 합의·디자인 검수·인프라 결정 등 본 PR 안에서 해소 안 되지만 다른 PR로 옮기지도 않는 항목)
- `## TODO` — 고정 헤딩. `todo.md` 이 PR 절의 TODO를 옮겨 오고, 소비 뒤에 생기는 이 PR의 TODO도 여기 쌓인다. 없으면 `- 없음`

**다른 PR로 넘긴 항목은 「열려있는 질문」이 아니라 그 PR의 TODO로 적는다** ([PR별 TODO 등록처](../conventions/pr-split.md#pr별-todo-등록처)).

**산출물 분담**:

| 산출물 | 책임 | 코드 블록 |
|---|---|---|
| `overview.md` | **의도만** — 위 본문 항목. 기술 선택·근거는 decisions.md | 코드 블록 없음 |
| `decisions.md` | **"왜 이렇게 했나"에 답할 결정** — 채택안·기각한 대안·근거 | 코드는 시그니처 수준만 |
| `reference.md` | PR이 참조하는 자료 인덱스 — 담을 항목은 reference-curation.md의 [포함 항목](../conventions/artifact/reference-curation.md#포함-항목) | 코드 없음 |
| `implementation.md` | **구현 계획** — 이 단계에서 쓰지 않는다 | — |

## 산출물: `/plan/pr{N}/persistent/decisions.md`

목적·포함·제외 기준·적는 법은 [conventions/artifact/decisions-lifecycle.md](../conventions/artifact/decisions-lifecycle.md) 참조.

---

## 산출물 파일 존재 확인

plan을 끝내기 전에 산출물 파일이 실제로 생성되었는지 확인한다 (`/plan/pr{N}/persistent/overview.md` 필수, `/plan/pr{N}/persistent/reference.md` 필수, `/plan/pr{N}/persistent/decisions.md`는 [포함 기준](../conventions/artifact/decisions-lifecycle.md#포함제외-기준)에 걸린 결정이 있는 경우).
