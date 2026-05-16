## 스킬·프롬프트 수정 시 사전 참조

`deploy/skills/` 또는 `.claude/skills/` 하위를 수정할 때, 작업 시작 전에 `/scw` 스킬 본체와 그 특화 체크리스트(`.claude/skills/scw/specialized/`)에서 해당 스킬의 룰을 먼저 확인한다.

- 같은 스킬을 반복 수정하면서 같은 패턴 실수가 재발하는 것을 막기 위함이다 (세션·파일명 하드코딩, 절차 분기 패턴 등).
- 특화 체크리스트가 있으면 그 항목을 사전 점검표로 쓰고, 없으면 일반 `/scw` 절차(「프롬프트 감사」)를 적용한다.
- 수정 후에만 점검하면 위반이 산출물에 들어간 뒤에 잡히므로, 사전 참조 흐름이 더 효율적이다.

## 프롬프트 수정 시 감사 규칙 역제안

이 프로젝트의 프롬프트(`deploy/`) 수정 시:

1. 요청된 수정을 수행
2. 패턴성 판단 (동일 요청 재발 가능성 — 전환 문장, 이모지, 중복 병기 등)
3. 패턴성이면, scw의 특화 체크리스트(`.claude/skills/scw/specialized/`)에 추가할 규칙을 구체적 문안과 함께 역제안

## 프롬프트 작성 원칙

- 구체적인 개수를 본문에 하드코딩하지 않는다.
- 프롬프트를 추가하기 전에, 그 규칙이 프롬프트가 아닌 다른 메커니즘으로 강제할 수 있는지 먼저 확인한다.
- 입력 타입 조합 규칙을 추가할 때는 트리거 지점(어느 가이드의 어느 단계에서 판단하는지), 실행 경로(선행 조건이 충족되는지), 판단 기준(어떤 입력이 조합을 활성화하는지)을 함께 정의한다.

## 배포 스크립트 변경 원칙

- `npm run update`가 새 경로·파일·설정을 배포하도록 바꿀 때는, `npm run uninstall`이 같은 대상을 제거할 수 있도록 함께 수정한다.
- 배포와 제거는 같은 기준으로 검증한다. update만 성공하고 uninstall 후 잔여 파일이 남는 구조를 만들지 않는다.

## 로컬 스킬 원본 기준

- 프로젝트 로컬 스킬의 원본은 `.claude/`이다.
- `.agents/` 하위 로컬 스킬은 `.claude/`에서 배포된 산출물로 간주한다.
- 로컬 스킬을 수정해야 하면 `.agents/`를 직접 수정하지 않고 `.claude/` 원본을 수정한 뒤 배포한다.
- 전역 스킬은 `deploy/`에서 Claude와 Codex 타겟으로 함께 배포되므로 이 제약과 구분한다.

## contexts 하위 디렉토리 관리

- `deploy/contexts/` 하위에 `map.md`가 있는 디렉토리는, 파일을 추가·삭제·이동할 때 `map.md`를 함께 갱신한다
- 내용을 추가·수정·삭제할 때 `map.md` 상단의 "역할" 섹션을 확인하고 적합한 위치에 배치한다

### coding-standards 배치 기준

콘텐츠를 AC `deploy/contexts/coding-standards/`에 둘지, KA·MP 등 인접 프로젝트로 보낼지는 MP `docs/meta/placement.md`의 분업 표를 따른다.

## 백로그 관리

- `plan/` 하위의 백로그 파일은 상시 워크트리(`~/WebstormProjects/main/ai-contexts-backlog/`)에서 관리한다
- AC 본체에서 backlog 브랜치로 전환하지 않는다
- 워크트리가 없으면 `git worktree add`로 자동 생성한다

## README 관리

- README 수정은 일반 작업에서 직접 수행하지 않는다.
- README 변경이 필요하면 `full-refresh` 스킬 절차를 통해서만 갱신한다.

### 티어 기준

| Tier | 기준 |
|------|------|
| 1 | 다음 작업에서 바로 착수할 항목 |
| 2 | 가까운 시일 내 착수할 항목 |
| 3 | 언젠가 할 항목 |
| 4 | 우선순위 낮음 / 아이디어 단계 |

### 상태

| 상태 | 의미 |
|------|------|
| `ready` | 수정 대상·내용이 확정되어 바로 구현 가능 |
| `draft` | 방향은 잡혔으나 설계·범위 구체화 필요 |
| `ideation` | 아이디어만 있는 단계 |

### 파일 구조

세 영역으로 분리한다.

- `plan/this/` — AC 자체 백로그
  - `index.md` — 미분류 아이디어
  - `tier-{N}/index.md` — 해당 tier 파일 목록과 상태 요약
  - `tier-{N}/{target}.md` — target별 백로그 항목. 내용 없는 빈 파일은 만들지 않는다
- `plan/projects/{project}/` — 타 프로젝트(MP, DC 등) 전용 백로그
  - `tier-{N}/index.md`, `tier-{N}/{item}.md` (파일명에 프로젝트 접두사 없이)
- `plan/topics/{topic}/` — 코드 주제(예: react, error, zod)에 대한 사고 흔적
  - `index.md`, `{subtopic}.md` (tier 없음, Ready 게이트 미적용)

## 배포 스크립트 관리

`scripts/update.js` 또는 `scripts/uninstall.js`의 동작이 바뀌면 `meta/INSTALLATION_GUIDE.md`도 같이 최신화한다. 가이드는 AI 에이전트가 코드를 안 읽고 가이드만 보고 실행하는 것을 전제로 작성되어, 어긋나면 잘못된 결과로 이어진다.

## 임시 호환 파일 (삭제 예정)

GitHub 외부 링크(이력서 등)의 404 방지를 위해 옛 경로에 README를 복제해둔 파일. 외부 링크가 새 경로로 전환되면 삭제한다.

- `deploy/skills/workflow/spec-review/README.md` → 원본: `deploy/skills/workflow/requirement-review/README.md`
- `deploy/skills/workflow/code-review/README.md` → 원본: `deploy/skills/code-review/README.md`
