## 프롬프트 수정 시 감사 규칙 역제안

이 프로젝트의 프롬프트(`deploy/`) 수정 시:

1. 패턴성 판단 (동일 요청 재발 가능성 — 전환 문장, 이모지, 중복 병기 등)
2. 패턴성이면, scw의 특화 체크리스트(`deploy/skills/scw/specialized/`)에 추가할 규칙을 구체적 문안과 함께 역제안

## 프롬프트 작성 원칙

- 구체적인 개수를 본문에 하드코딩하지 않는다.
- 프롬프트를 추가하기 전에, 더 강한 강제 메커니즘으로 내릴 수 있는지 먼저 검토하고 사용자에게 역제안한다 — 사다리·게이트·도메인별 수단·경계는 [`deploy/contexts/rules-as-code.md`](deploy/contexts/rules-as-code.md)를 따른다.
- 입력 타입 조합 규칙을 추가할 때는 트리거 지점(어느 가이드의 어느 단계에서 판단하는지), 실행 경로(선행 조건이 충족되는지), 판단 기준(어떤 입력이 조합을 활성화하는지)을 함께 정의한다.
- 단방향 cross-ref 원칙: A가 B를 참조하면 B는 A의 식별자(이름·경로)를 본문에 호명하지 않는다. 양방향 결합은 작성 시점에 금지. 호출자는 호출 컨텍스트 쪽, 참조 대상은 일반·재사용 가능한 쪽(컨벤션·메타 룰).

## 프롬프트 수정 후 자가점검

md 파일을 고친 직후, 바뀐 식별자(헤딩 이름·룰 명칭·인용된 경로·절 이름)를 워크스페이스에서 찾아 참조처에 낡은 표현이 남았는지 본다.

이름·식별자가 안 바뀌어도 룰 본문이 의미 변경되면 cross-ref하는 위치의 정합성도 점검.

## 배포 시스템 수정 규약

다음을 수정·추가할 때 [meta/deploy-conventions.md](meta/deploy-conventions.md)를 먼저 본다.

- sync/unsync 스크립트 또는 sync/unsync 타겟
- `deploy/hooks/`(전역)·`local/hooks/`(AC 로컬)의 정책 hook
- `deploy/base-settings.json`·`local/base-settings.json` 등 settings 생성 소스
- settings.json의 PreToolUse/PostToolUse hook
- AC 작업용 worktree 생성

## 로컬 스킬 원본 기준

- 프로젝트 로컬 스킬의 원본은 `local/skills/`이다. `.claude/skills/`(Claude가 읽음)와 `.agents/skills/`(Codex가 읽음)는 거기서 배포된 산출물이다 (gitignore).
- 전역 스킬의 원본은 `deploy/skills/`이며, `sync:system`이 전 타겟에 함께 배포한다.

## 폴더 규칙

### 대주제 (이 콘텐츠가 AC에 속하는가)

콘텐츠 추가 전 [`deploy/contexts/placement.md`](deploy/contexts/placement.md)(글로벌 분업 정책)를 본다. AC로 갈지, KA(학습 노트)·MP(예제 코드)로 갈지 먼저 판단한다.

### 소주제 (AC 안에서 어디로)

- `deploy/contexts/` 하위 → 그 영역의 인덱스가 정한 자리에 둔다. 코드 작업 자산은 [`code-map.md`](deploy/contexts/code-map.md), 글쓰기 자산은 [`writing-guide/map.md`](deploy/contexts/writing-guide/map.md)이고, 각 「역할」 절이 무엇을 받는지 정한다. 어느 인덱스에도 안 걸리는 자산은 `deploy/contexts/` 바로 아래 단일 파일로 둔다 — 인덱스 없는 하위 디렉토리를 새로 만들면 그 안의 문서를 아무도 찾지 못한다.
- `deploy/skills/` (전역 배포) / `local/skills/` (AC 로컬)

## README 관리

- README 수정은 일반 작업에서 직접 수행하지 않는다.
- README 변경이 필요하면 `refresh-projects` 스킬 절차를 통해서만 갱신한다.
