---
target: .claude/skills/scw/
---

# SCW

## [ideation] assertion 검증 구조 — writer/critic 쌍방

- 현재 scw가 assertion을 검증할 때 팀(Team) 구조를 사용하는 경우가 있음
- 팀 구조 대신 writer/critic 쌍방 구조가 더 나을 수도 있다는 가설
- writer가 초안 작성 → critic이 반박 → writer가 재반영하는 루프
- 팀 구조 대비 잠재 장점: 역할이 명확하고 루프가 단순, 설계 부담 낮음
- 탐색 방향: 팀 구조 vs writer/critic 쌍방의 트레이드오프 분석 (응집도, 컨텍스트 공유, 비용 등)
- 파고들기 전 현재 assertion 검증 흐름을 먼저 파악할 것

## [draft] Claude hooks 활용방안

scope: global (deploy/ 전체 스캔 — skills + contexts 모두)

- 현재 scw는 프롬프트(md) 기반으로만 스킬을 만든다
- Claude Code hooks 메커니즘을 스킬에 통합하는 방안 탐색
- 단순 md 추가가 아니라, hooks가 강제할 수 있는 규칙은 hooks로 구현하도록 scw가 안내/생성하는 방향
- CLAUDE.md의 "프롬프트를 추가하기 전에, 그 규칙이 프롬프트가 아닌 다른 메커니즘으로 강제할 수 있는지 먼저 확인한다" 원칙과 연결
- 전수조사 대상:
  - `deploy/skills/` — 스킬 프롬프트 내 절차·금지 문구
  - `deploy/contexts/rules/` — "이거 하지 마" 형태의 금지 규칙 (hook으로 강제 가능한 경우 이전 검토)
  - `deploy/contexts/` 기타 하위 — 프롬프트가 아닌 메커니즘으로 강제 가능한 규칙 전반

## [ideation] 글로벌화 — scw를 deploy/로 이전 + 영향범위 확대

scope: global (deploy/skills/scw/ 이동 + deploy/rules/global.md + AC CLAUDE.md)

### 동기

scw가 현재 AC 로컬 스킬(`.claude/skills/scw/`)이라 AC 레포 안에서만 보인다. 다른 레포(MP·PP 등)에서 로컬 스킬이나 전역 스킬을 수정할 때도 scw를 기본 참조하게 하려면 전역 배포가 필요하다.

### 기대상황

- scw가 `deploy/skills/scw/`로 이동 → `npm run sync:system`으로 `~/.claude`·`~/.codex`·`~/.gemini` 전역 배포 → 모든 레포에서 `/scw` 사용 가능.
- 스킬·프롬프트 수정 시 scw를 기본 참조하는 트리거가 `deploy/rules/global.md`에 존재.

### 현재상태 (확인된 사실, 2026-06-07)

- scw 위치: `.claude/skills/scw/`(원본) → `.agents/skills/scw/`(sync:local-skills 배포). `deploy/`에 없음.
- 공식문서 확인(code.claude.com/docs/en/skills.md): Personal(`~/.claude/skills/`) 스킬은 "All your projects"에 적용. 우선순위 Enterprise > Personal > Project ("personal overrides project"). → AC 로컬 scw를 지우고 글로벌만 둬도 AC에서 정상 호출. 단 전역+AC로컬 동시 존재 시 글로벌이 AC로컬을 섀도잉 → "고쳤는데 안 바뀜" 함정 발생.
- 경험적 증거: code-review는 글로벌(`~/.claude/skills/code-review`)이고 PP 세션(비-AC, cwd=private-playground)에서 `/code-review`가 정상 작동 → 글로벌 스킬의 크로스프로젝트 가시성 확인. PP엔 로컬 code-review 없음.

### 현재 생각중인 방법 (이전 절차)

1. `git mv .claude/skills/scw → deploy/skills/scw` (하위 전체)
2. 배포 명령 전환: sync:local-skills → sync:system
3. AC 로컬 scw 원본 + `.agents/skills/scw` 제거 (섀도잉 함정 차단 — 필수)
4. 의존 후속(별개 항목 가능): `deploy/rules/global.md:243`(전역 스킬 경로 규칙: 절대 홈 경로 대신 `../../contexts/` 식 상대경로)을 scw로 이동 / AC `CLAUDE.md`의 `## 스킬·프롬프트 수정 시 사전 참조` 절을 `deploy/rules/global.md`로 이동하되 `.claude/skills/scw/specialized/` 같은 AC 로컬 경로를 `/scw`로 일반화
5. sync:system이 외부 마켓플레이스 스킬(vercel·skill-creator)과 충돌 안 함 — 사용자 확인 완료

### 종료 조건

scw가 `deploy/skills/scw/`에 있고, 임의 레포에서 `/scw` 호출되며, AC 로컬 원본이 제거되고, global.md에 "스킬 수정 시 scw 참조" 트리거가 박힘.

### 첫 행동

sync:system의 파일 복사·제외 메커니즘(디렉토리 통째 복사 여부, exclude 지원)을 먼저 파악 — 아래 「특화 체크리스트 배치」의 배포 누수 차단과 직결.

## [ideation] 특화 체크리스트 배치 + 파일명 규약

scope: global (deploy/skills/*, deploy/contexts/* 의 특화 체크리스트 전반)

### 동기

scw를 글로벌로 옮기면 특화 체크리스트(현 `specialized/`)를 어디 두느냐가 문제. 엔진(scw)에 전부 넣으면 모든 레포의 사정이 글로벌 스킬에 쌓여 SRP 위반 — MP용 체크리스트 추가하려고 글로벌 scw를 수정하게 됨.

### 핵심 원칙

체크리스트는 "엔진"이 아니라 "검사 대상" 곁에 둔다. 글로벌 scw 엔진은 per-target 체크리스트를 담지 않고, "현재 레포의 대상 옆에서 체크리스트를 발견·로드"하는 규약만 갖는다.

- 3종류(각 레포별 특화 / AC 로컬 특화 / AC 글로벌 자산 특화) 전부 "대상을 소유한 레포에" 둔다 → 셋 다 같은 답으로 수렴.
- 글로벌 엔진엔 대상 비특정 "방법론"만 잔류: bench-operations, trigger-eval-bench, rule-ablation-bench, skill-orchestration (어떤 rules 문서든·어떤 스킬이든 적용되는 엔진 사용법).

### 현재 생각중인 파일명 규약 (사용자 ideation, 2026-06-07)

- 폴더(대상 디렉토리, 2개 이상 파일)에 영향 주고 싶다 → `<target>/scw.md`
- 특정 파일 1개에만 영향 → `<TARGET>.scw.md` (대상 파일명 접두)
- 예: 스킬 특화 체크리스트는 대부분 `deploy/skills/[name]/SKILL.scw.md`
- 예: coding-standards 디렉토리 특화는 `deploy/contexts/coding-standards/scw.md`
- 이 규약은 "한 디렉토리에 검사 대상/관점이 여럿"인 경우(고정 단일 파일명으로는 안 되는 경우)를 naming으로 해소.

### 현재상태 (기존 구조와의 어긋남)

현 scw specialized 매핑(SKILL.md:100-106)은 "스킬 단위"가 아니라 "대상 경로 단위"다. 대상에 contexts(coding-standards, writing-guide)도 포함되고, workflow는 `workflow.md`(스킬 전체) + 하위 `requirement-review.md` 2개에 걸린다 → "스킬당 1개"가 아님. 새 규약(scw.md vs [TARGET].scw.md)이 이 다중성을 자연히 흡수.

### 미해결 (배포 누수)

대상이 `deploy/skills/workflow/`처럼 배포되는 디렉토리면, 그 안에 둔 체크리스트(`SKILL.scw.md` 등)가 sync:system 때 `~/.claude/skills/workflow/`로 딸려 나감 (방금 고친 bench/ 추적 누수와 같은 클래스 — 개발/감사용 자산이 산출물에 섞임). ⇒ 규약 확정 시 sync:system이 `*.scw.md`·`scw.md`를 배포 제외하도록 묶어야 함. 실제 이전 시 sync 제외 동작 검증 필요.

### 비고

co-locate 방식 채택 결정됨(중앙 레지스트리 대비). 사용자: "전체 조망할 일이 없어. scw 단위는 최상위 스킬 단위니까."

## [draft] 특화 체크리스트 ↔ skill-creator 중복 제거 검토

### 동기

scw의 specialized 체크리스트 중 일부가 공식 플러그인 `/skill-creator:skill-creator`(`~/.claude/plugins/cache/claude-plugins-official/skill-creator/`)에 이미 있을 수 있다. 중복이면 scw에서 삭제해 단일 출처로 정리.

### 첫 행동

skill-creator의 SKILL.md + agents(analyzer/grader/comparator) + references/schemas.md를 scw specialized 8개(bench-operations·coding-standards·requirement-review·rule-ablation-bench·skill-orchestration·trigger-eval-bench·workflow·writing-guide)와 대조하여 중복 항목 식별.

### 종료 조건

중복 항목 목록 산출 + scw에서 삭제 또는 skill-creator 위임으로 정리.
