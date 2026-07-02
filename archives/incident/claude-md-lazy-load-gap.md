# CLAUDE.md Lazy 로드 갭 — 실측과 해소 기록

## 목적

하위 디렉터리 CLAUDE.md의 lazy 로드 메커니즘을 실측으로 확정하고, "폴더 규칙이 배치 결정보다 늦게 도착하는 갭"을 hook + workflow 보강으로 해소한 기록이다. 이후 컨텍스트 주입 시점 문제(스킬·hook·메모리 설계)를 다룰 때 판단 기준으로 사용한다.

## 발단 사고 (2026-06-12, MP)

- MP 모노레포 루트 세션에서 예제 페이지 배치를 **계획 단계**에 `app/form/radio-rhf/`로 결정·승인받음.
- **구현 중** `apps/examples` 파일을 처음 Read하자 `apps/examples/CLAUDE.md`(한 줄 포인터) → `docs/meta/AGENT.md` → `docs/meta/ARCHITECTURE.md` 체인이 lazy 주입되며 "분류명에 라이브러리 이름 금지 + 라이브러리 스펙 테스트는 `sandbox/{라이브러리}/{스펙}`" 규칙을 뒤늦게 발견.
- 이미 만든 4파일을 버리고 `sandbox/react-hook-form/radio-group/`으로 재배치하는 재작업 발생.

## 실측 결과 (2026-06-12~13)

방법: 격리 임시 폴더 + 프로젝트 로컬 `InstructionsLoaded` hook 로깅(`claude -p` 헤드리스 4세션) + 3계층 암구호 마커 인터랙티브 테스트.

| 행동 | 하위 CLAUDE.md 로드 |
|---|---|
| 세션 시작 | cwd와 그 조상 체인만 |
| Glob/Grep (결과 목록에 CLAUDE.md 경로가 보여도) | X |
| Write (그 폴더 안에 새 파일을 만들어도) | X |
| 서브에이전트 Read | X — 이벤트만 발동, 본문이 메인·서브 어느 컨텍스트에도 미주입 |
| **메인 에이전트 Read** | **O — 읽은 파일부터 루트까지 조상 체인 전체 로드** |

- Edit은 Read 선행이 강제라 독립 측정 불가 (Read 시점에 이미 로드).
- 공식 문서 교차 확인: "Instead of loading them at launch, they are included when Claude reads files in those subdirectories."
- 핵심 갭: **트리거가 Read 도구뿐**인데 계획 단계의 주력 도구는 Glob/Grep → 폴더 규칙이 배치·네이밍 결정보다 늦게 도착한다. 탐색을 서브에이전트에 위임하면 아예 도착하지 않는다.

## 해소안 토론 (ideator/reviewer 팀 에이전트 + 사용자)

### 채택 — 2층 + 사용자 보강

1. **hook (주력, 일반 세션 차단선)**: `deploy/hooks/surface-claude-md.js` — PreToolUse(Glob/Grep)에서 탐색 대상 경로의 미로드 CLAUDE.md **경로만**(본문 0) additionalContext로 주입 + "포인터면 끝까지 추적" 지시. 세션·경로당 1회 dedup(tmpdir 마커). permissionDecision 미출력 → 도구 정상 통과. 사고가 **workflow 밖 일반 세션**에서 났으므로 기계 강제 hook만이 일반 세션을 덮는다.
   - Glob pattern의 정적 접두를 path에 결합해 대상 깊이를 계산한다 — 사고 케이스가 "루트에서 `apps/examples/**` 탐색"이라 path 조상만으로는 못 잡는다.
   - cwd 조상의 CLAUDE.md는 제외(세션 시작 시 이미 로드 — 실측 근거).
2. **workflow 보강 (사용자 제안으로 단순 step-4 보강에서 확장)**:
   - **step-1.1 컨벤션 소스 수집 단일화**: 이름만 Glob 스캔(내용 읽기 금지 — 컨텍스트 오염 방지) → 사용자 선제안 → `background/retained/conventions-index.md`("경로 + 한 줄 트리거" 인덱스, 본문 요약 금지).
   - **step-3 축소**: 인덱스 선별·소비만, PR마다 재수집·재질문 금지 — 기존엔 step-1과 step-3이 사용자에게 같은 질문을 중복으로 했다.
   - **step-4**: grep 의무 대상 목록에 "조상 체인 CLAUDE.md (포인터 끝까지)" 추가 — 기존 목록(`docs/ARCHITECTURE.md` 등)에 CLAUDE.md 형태가 빠져 있어 workflow를 따라도 같은 자리에서 뚫리는 구조였다.

### 기각

- **루트 CLAUDE.md에 하위 규칙 목차 수동 정리**: 외부 레포의 루트 CLAUDE.md를 AC가 관리 불가 + 레포·하위 CLAUDE.md마다 수동 유지 비현실.
- **AC 글로벌 rules에 선읽기 일반 규칙**: hook이 기계 강제로 대체하므로 불필요 + 전 작업에 적용돼 과넓음.
- **Write 트리거 추가**: Write 시점은 이미 오염된 승인 *뒤*라 사고 방지 기여 약함. 탐색 없이 Write 직행하는 잔여 갭은 대체로 사용자가 경로를 직접 지정한 경우(배치 결정 주체가 AI 아님)라 수용 — 실사고 발생 시 그때 추가 (dedup 마커 풀 공유라 확장 비용 낮음).

### 잔여 한계 (인지하고 수용)

- hook이 보장하는 것은 "경로 알림 도착"까지 — 실제 Read·포인터 추적은 LLM 수행 (hook은 발동만 보장한다는 구조적 한계).
- 도구를 안 쓰고 기억만으로 배치를 결정하는 케이스는 미커버 — workflow step-3·4 보강이 그쪽 이중화.

## 반영 커밋

- `b42a48c` feat(settings): hook 신설 + projection 매처(`search: ['Glob','Grep']` fan-out) + verify 계약
- `ff41fdd` feat(skills): workflow step-1·3·4 + plan-folder.md + SKILL.md 세션표 + foundation.md 이연 분기

## 검증

- `npm run verify:settings` 통과 + echo-pipe 6케이스(사고 시나리오 재현·dedup·self-skip·비존재 경로) 통과.
- PreToolUse additionalContext 주입·무결정 통과는 공식 hooks 문서로 확인 ("next to the tool result" / "continues through the normal permission flow").
- 실발동 확인은 sync 후 별도 수행 (additionalContext + PreToolUse 조합의 우리 코드 첫 선례).
