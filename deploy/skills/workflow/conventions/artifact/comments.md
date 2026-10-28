# 코드 주석 컨벤션

워크플로우에서 stub·구현 코드의 주석 양식·라이프사이클·TODO 잔존 검사 단일 출처.

## 적용 대상

인라인 마커는 모든 모드에 적용하고, 상단 출처 블록은 `실무` 모드에만 적용한다. `채용`·`개인` 모드는 컨벤션을 사용자가 직접 세우므로 AI가 고른 출처를 다시 검토할 거리가 적다.

### 적용 조건 해석

적용 여부는 모드만으로 정한다. 모드 말고 다른 조건을 세워 적용에서 빼지 않는다:

- "컨벤션 문서 부재 → 출처 명시 가치 낮음" — **금지**

## 상단 출처 블록 (실무 모드 한정)

신규 stub 파일 상단에 `TODO [USER_REVIEW]` 블록 주석으로 첨부한다. 항목마다 `설명 — 경로:라인번호` 한 줄. 경로는 [마커보다 오래 남는 파일만](#출처-인용은-마커보다-오래-남는-파일만) 인용한다.

- `[Convention]`: 컨벤션 문서 경로 + 라인 범위
- `[Reference]`: 그 항목이 컨벤션에 없을 때만, 기존 코드 평행 사례 경로
- 사용자가 검토하고 블록을 지운다 — 남아 있으면 [구현 전 미검토 TODO 검사](#구현-전-미검토-todo-검사)에서 IMPL에 들어가지 못한다

### 상단 vs 인라인 분리 기준

파일 전체에 걸린 근거(경로·폴더 구조·파일명 컨벤션, 파일 전체의 평행 사례)는 상단 출처 블록에, 특정 코드에 걸린 것(함수·변수 동작, 호출·분기 패턴, placeholder 의도, scss 토큰 매핑)은 인라인 마커에 둔다.

## 본문 인라인 마커

stub 본문 주석은 최소로 두고, 사용자 검토나 IMPL의 구체화가 필요한 자리에만 아래 마커를 단다.

| 마커 | 처리자 |
|---|---|
| `// TODO [USER_REVIEW]:` | 사용자(검토) |
| `// TODO [AI_IMPL]:` | AI/개발자(구체화) |

대상:

- `TODO [USER_REVIEW]`: 사용자가 정합 검토할 컨벤션 출처·placeholder 의도·"이 결정 맞나요?" 메모
- `TODO [AI_IMPL]`: IMPL이 채울 placeholder·미정 값 (scss 토큰, 미정 분기, 상수)

### 출처 명시 의무 — `TODO [AI_IMPL]`

마커에는 IMPL이 채울 정보의 출처를 `설명 — 경로:라인` 꼴로 붙인다. 아직 정해지지 않은 값이면 IMPL이 값을 정할 때 볼 자료를 인용한다.

### 출처 인용은 마커보다 오래 남는 파일만

출처는 그 TODO를 처리하러 올 때까지 남아 있는 파일만 인용한다 — 소비·분배 뒤 지워지는 파일을 가리키면 처리하러 온 쪽이 출처를 잃는다.

- ✓ `docs/conventions/*`, `docs/ARCHITECTURE.md`, `_fsd/.../*`, `plan/{prN}/persistent/*`, `plan/{prN}/retained/*`(verify에서 지워지지만 마커는 그 전에 사라진다)
- ❌ `plan/{prN}/consumable/*`, `plan/background/consumable/*`, `plan/background/retained/*`, 분배 후 삭제될 1차 입력 (사용자 작성 `page.md`, BG AI 산출물)

## 다른 PR로 미루는 마커 — 코드 안 금지

다른 PR에서 처리할 작업은 코드에 TODO로 남기지 않고 그 PR의 TODO에 등록한다 ([PR별 TODO 등록처](../pr-split.md#pr별-todo-등록처)). 다른 PR로도 옮기지 않는 본 PR 외부 의존성은 [PR 개요](../../steps/plan.md#산출물-planprnpersistentoverviewmd)의 열려있는 질문에 적는다.

## file-level(blanket) eslint-disable 라이프사이클

파일 최상단에 `/* eslint-disable -- ... */` 같은 file-level(blanket) disable 블록을 **새로 다는** 경우(정적분석 도입류 PR에서 리팩토링 전 코드를 격리할 때),
격리하는 각 파일을 그 자리에서 담당 PR의 TODO로 `{파일}: disable 제거 + 규칙 준수 수정` 한 줄씩 등록한다 ([PR별 TODO 등록처](../pr-split.md#pr별-todo-등록처)).

- 격리 마커에 `리팩토링 전 코드(정적 분석 도입 PR)`를 그대로 넣는다. 정본은 `{{skill_dir}}/scripts/check-pr-comments.mjs`의 `ISOLATION_MARKER`다.
- `{파일}`은 git diff에 나오는 레포 루트 기준 경로 그대로 적는다.
- verify의 고아 탐지는 둘을 문자열 그대로 대조한다 — 마커가 어긋나면 그 파일이 탐지에서 조용히 빠지고, 경로가 어긋나면 등록한 파일도 고아로 뜬다.

## 라이프사이클

### 생성 (신규 stub 작성 시)

- 상단 출처 블록(실무 모드) + 인라인 마커 적용
- 기존 stub 파일을 갱신할 때는 마커를 다시 달지 않는다 — 사용자가 검토하고 지운 TODO 주석이 되살아난다

### 구현 전 미검토 TODO 검사

`node {{skill_dir}}/scripts/check-pr-comments.mjs --paths <구현 대상 경로> --marker USER_REVIEW`.

### 처리 (구현 중)

- `TODO [AI_IMPL]`은 코드로 채우는 커밋에서 함께 지운다
- `TODO [USER_REVIEW]`는 사용자가 지운다. 구현 중 만나면 IMPL을 멈추고 사용자에게 보고한다

### 구현 종료 TODO 잔존 검사

`node {{skill_dir}}/scripts/check-pr-comments.mjs --paths <구현 대상 경로>`에 걸리는 것이 없어야 구현을 끝낸다. 걸린 것이 이 PR 전부터 있던 TODO면 지우지 말고 목록을 사용자에게 보고해 처리를 정하고, 사용자가 남기기로 한 것만 남았으면 끝낼 수 있다. 결과(남긴 TODO 목록 포함)를 보고에 싣는다.
