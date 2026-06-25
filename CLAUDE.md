## 스킬·프롬프트 수정 시 사전 참조

`deploy/` 또는 `local/` 하위를 수정할 때, 작업 시작 전에 `/scw` 스킬 본체와 그 특화 체크리스트(`deploy/skills/scw/specialized/`)에서 해당 스킬의 룰을 먼저 확인한다.

- 같은 스킬을 반복 수정하면서 같은 패턴 실수가 재발하는 것을 막기 위함이다 (세션·파일명 하드코딩, 절차 분기 패턴 등).
- 특화 체크리스트가 있으면 그 항목을 사전 점검표로 쓰고, 없으면 일반 `/scw` 절차(「프롬프트 감사」)를 적용한다.
- 수정 후에만 점검하면 위반이 산출물에 들어간 뒤에 잡히므로, 사전 참조 흐름이 더 효율적이다.

## 프롬프트 수정 시 감사 규칙 역제안

이 프로젝트의 프롬프트(`deploy/`) 수정 시:

1. 요청된 수정을 수행
2. 패턴성 판단 (동일 요청 재발 가능성 — 전환 문장, 이모지, 중복 병기 등)
3. 패턴성이면, scw의 특화 체크리스트(`deploy/skills/scw/specialized/`)에 추가할 규칙을 구체적 문안과 함께 역제안

## 프롬프트 작성 원칙

- 구체적인 개수를 본문에 하드코딩하지 않는다.
- 프롬프트를 추가하기 전에, 더 강한 강제 메커니즘으로 내릴 수 있는지 먼저 검토하고 사용자에게 역제안한다 — 사다리·게이트·도메인별 수단·경계는 [`deploy/contexts/rules-as-code.md`](deploy/contexts/rules-as-code.md)를 따른다.
- 입력 타입 조합 규칙을 추가할 때는 트리거 지점(어느 가이드의 어느 단계에서 판단하는지), 실행 경로(선행 조건이 충족되는지), 판단 기준(어떤 입력이 조합을 활성화하는지)을 함께 정의한다.
- 단방향 cross-ref 원칙: A가 B를 참조하면 B는 A의 식별자(이름·경로)를 본문에 호명하지 않는다. 양방향 결합은 작성 시점에 금지. 호출자는 호출 컨텍스트 쪽, 참조 대상은 일반·재사용 가능한 쪽(컨벤션·메타 룰).

## 프롬프트 수정 후 자가점검

md 파일 수정 직후:

1. 변경된 식별자 식별 — 헤딩 이름, 룰 명칭, 인용된 경로(파일·라인), 절 이름
2. 각 식별자로 워크스페이스 grep
3. 참조처에서 stale 표현 잔존 점검
4. 발견 시 수정하거나 사용자에게 보고

이름·식별자가 안 바뀌어도 룰 본문이 의미 변경되면 cross-ref하는 위치의 정합성도 점검.

## 배포 시스템 수정 규약

다음을 수정·추가할 때 [meta/deploy-conventions.md](meta/deploy-conventions.md)를 먼저 본다.

- `scripts/sync-*.js`·`unsync-*.js` 또는 sync/unsync 타겟
- `deploy/hooks/`(전역)·`local/hooks/`(AC 로컬)의 정책 hook
- `deploy/base-settings.json`·`local/base-settings.json` 등 settings 생성 소스
- settings.json의 PreToolUse/PostToolUse hook
- AC 작업용 worktree 생성

## 로컬 스킬 원본 기준

- 프로젝트 로컬 스킬의 원본은 `local/skills/`이다.
- `.claude/skills/`(Claude가 읽음)와 `.agents/skills/`(Codex가 읽음)는 `local/skills/`에서 배포된 산출물로 간주한다 (gitignore).
- 로컬 스킬을 수정해야 하면 산출물(`.claude/skills/`·`.agents/skills/`)을 직접 수정하지 않고 `local/skills/` 원본을 수정한 뒤 배포한다.
- 전역 스킬은 `deploy/`에서 Claude와 Codex 타겟으로 함께 배포되므로 이 제약과 구분한다.

## 폴더 규칙

### 대주제 (이 콘텐츠가 AC에 속하는가)

콘텐츠 추가 전 [`deploy/contexts/placement.md`](deploy/contexts/placement.md)(글로벌 분업 정책)를 본다. AC로 갈지, KA(학습 노트)·MP(예제 코드)로 갈지 먼저 판단한다.

### 소주제 (AC 안에서 어디로)

- `deploy/contexts/` 하위 → 각 디렉토리의 `map.md` 역할 섹션 (「contexts 하위 디렉토리 관리」 참고)
- `deploy/skills/` (전역 배포) / `local/skills/` (AC 로컬) — 「로컬 스킬 원본 기준」 참고

## contexts 하위 디렉토리 관리

- `deploy/contexts/` 하위에 `map.md`가 있는 디렉토리는, 파일을 추가·삭제·이동할 때 `map.md`를 함께 갱신한다
- 내용을 추가·수정·삭제할 때 `map.md` 상단의 "역할" 섹션을 확인하고 적합한 위치에 배치한다

## 백로그 관리

- `backlog/` 하위의 백로그 파일은 상시 워크트리(`~/WebstormProjects/main/ai-contexts-backlog/`)에서 관리한다
- AC 본체에서 backlog 브랜치로 전환하지 않는다
- 워크트리가 없으면 `git worktree add`로 자동 생성한다

## README 관리

- README 수정은 일반 작업에서 직접 수행하지 않는다.
- README 변경이 필요하면 `refresh-projects` 스킬 절차를 통해서만 갱신한다.

### 상태

| 상태 | 의미 |
|------|------|
| `ready` | 수정 대상·내용이 확정되어 바로 구현 가능 |
| `draft` | 방향은 잡혔으나 설계·범위 구체화 필요 |
| `ideation` | 아이디어만 있는 단계 |

### 파일 구조

아래 영역으로 분리한다.

- `backlog/this/` — AC 자체 백로그. 목차·인덱스 파일을 두지 않는다 (상태 라벨이 각 파일 섹션 제목에 인라인, 조망은 `grep '^## \[' *.md`)
  - `{target}.md` — target별 백로그 항목. 내용 없는 빈 파일은 만들지 않는다. 우선순위는 frontmatter `priority`(`1`/`2`)로 표기
- `backlog/projects/{project}/{topic}/` — 외부 레포(KA·MP·DC 등) 작업·지식·참고. 주제별 디렉토리 (Ready 게이트·리뷰/실행 모드 미적용 비-트래커). destination(레포)은 캡처 intent로 가린다 — 지식 이해용이면 `knowledge-archive`, 구현 참고·레포 작업이면 그 레포
  - `{topic}/{item}.md` (디렉토리에 프로젝트·주제가 박혀 있으므로 파일명에 접두사 없이). 외부 레포 작업이라 AC 실행 모드 대상 아님
  - `{topic}/index.md` — read-later References 전용. item 목차(파일 목록·요약 표)는 두지 않는다. 나중에 읽을 참고 링크를 `## References`에 적재한다 (item 본문과 섞지 않음). AI·LLM 글 등 코드 주제가 아니어도 주제별로 모은다. References가 없으면 index.md를 두지 않는다
- `backlog/articles/` — 기술블로그에 발행할 포스트 재료. 포스트(글) 1편 단위 (Ready 게이트·리뷰/실행 모드 미적용 — projects/와 같은 비-트래커)
  - `{slug}.md`, 재료가 커지면 `{slug}/` 디렉토리로 승격. 인덱스 파일은 두지 않는다(비-트래커 + 발행 시 삭제 → 순배럴)
  - projects/(내부 작업·지식)와 구분: 발행 의도가 있는 외부 공개용 재료다. 발행되면 파일을 삭제한다 (발행 이력 미보존)
- `backlog/roadmaps/` — 주제별 **학습 로드맵**. 사용자가 앞으로 학습할 분량이 많은 주제를 순서대로 쌓아두는 곳 (예: monorepo 단계별 학습 코스)
  - `{topic}.md` — 학습 순서·전체 개요 (필수)
  - `{topic}/step{N}-*.md` — 단계가 여러 개로 쪼개진 경우의 step 본문 (선택)
  - 상태 체계 미적용, index.md 없음
  - **사용자가 명시적으로 추가하는 영역**. `/backlog` 스킬·자동 분류 대상 아님. AI는 사용자가 어떤 주제·원본을 옮길지 지시할 때만 파일을 만들거나 수정한다. 외부 레포(KA·DC 등)에서 로드맵을 발견해도 사용자의 명시 지시 없이 선제적으로 복사하지 않는다
  - 학습할 항목이 아닌 작업·지식 백로그는 `this/`·`projects/`로, 종결 자료는 `history/`로 보낸다
- `backlog/history/` — 종결된 자료 아카이브 (옛 회의자료 PDF, 결정 끝난 고민 흔적 등)
  - 자유 파일·서브폴더. 참조 전용 — 발전·갱신 없음
  - `/backlog` 스킬 대상 아님. doc-router 라우팅 또는 사용자가 직접 적재
