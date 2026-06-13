---
target: deploy/contexts/
---

# Claude Code

## [ready] CLAUDE.md 로드 시점 — 갭 해소 방식 결정·반영

동기: 하위 디렉터리 CLAUDE.md가 lazy 로드라 배치·네이밍 결정(계획 단계)보다 늦게 들어와 재작업 사고가 났다. 트리거 실측은 완료(아래 표) — 남은 일은 해소 방식 결정·반영.

### 실측 결과 (2026-06-12, 격리 임시 폴더 + 프로젝트 로컬 `InstructionsLoaded` hook, `claude -p` haiku 세션)

| 케이스 | sub/CLAUDE.md 로드 이벤트 | 마커 본문 컨텍스트 주입 |
|---|---|---|
| 메인 에이전트가 `sub/dummy.ts` Read | O (`load_reason: nested_traversal`, `trigger_file_path: sub/dummy.ts`) | O (메인 transcript에 주입 확인) |
| `sub/` 하위 새 파일 Write (Read 없이) | X (`session_start` 3건뿐) | X |
| `sub/` 대상 Glob + Grep만 | X | X |
| 서브에이전트가 `sub/dummy.ts` Read | O (이벤트는 메인 session_id로 발동) | X — 마커 본문이 메인·서브 transcript·서브 meta.json 어디에도 없음 |

- **조상 체인**: 3계층(루트/src/src/deep) 암구호 테스트(2026-06-13, 사용자 인터랙티브 세션)로 추가 확정 — `src/deep/some.md` 하나를 Read하면 `src/CLAUDE.md`·`src/deep/CLAUDE.md`가 **읽은 파일부터 루트까지 전부** 로드된다 (가장 가까운 것만이 아님). Glob으로 하위 CLAUDE.md *경로가 목록에 보여도* 미로드, 그 폴더 *안에* Write해도 미로드 재확인.
- Edit은 Read 선행이 강제라 독립 측정 불가 (Read 시점에 이미 로드됨).
- 결론: **트리거는 Read 도구뿐**. 계획 단계에서 흔한 Glob/Grep·Write로는 로드되지 않아 "배치·네이밍 결정 후 구현 중 발견" 갭이 실측으로 확정됨. 서브에이전트에 위임한 탐색은 이벤트만 발동하고 본문이 어느 컨텍스트에도 주입되지 않아 갭이 더 크다.
- hook 입력에는 `file_path`·`memory_type`·`load_reason`(`session_start`/`nested_traversal` 등)·`trigger_file_path`가 들어오고, 프로젝트 로컬 `.claude/settings.json` 등록으로 동작 확인.

### 남은 일 — 해소 방식 결정·반영

- 후보: (a) 프로젝트 루트 CLAUDE.md 트리거 라인, (b) AC deploy/rules에 "plan·배치 결정 전 작업 대상 디렉터리 CLAUDE.md 선읽기" 일반 규칙, (c) hook 기반 강제 (예: PostToolUse Glob/Grep 결과에 미로드 하위 CLAUDE.md 경로가 걸리면 additionalContext로 선읽기 지시 주입).
- 결정·반영되면 이 섹션을 삭제한다.

### 현재상태 (pain point, 2026-06-12 MP 세션)

- MP 모노레포 루트 세션에서 examples 예제 페이지 배치를 **계획 단계**에 `app/form/radio-rhf/`로 결정·승인받았는데, **구현 중** `apps/examples` 파일을 처음 Read하자 `apps/examples/CLAUDE.md`(→ docs/meta/ARCHITECTURE.md)가 lazy 주입되며 "분류명에 라이브러리 이름 금지 + 라이브러리 스펙 테스트는 sandbox/{라이브러리}/{스펙}" 규칙을 뒤늦게 발견 → 이미 만든 4파일을 버리고 `sandbox/react-hook-form/radio-group/`으로 재배치하는 재작업 발생.
- MP 루트 CLAUDE.md에 트리거 라인을 박는 임시 커밋을 만들었다가 되돌림(2026-06-12) — 메커니즘 확정 전 땜질이라.

## [draft] hooks 활용 방안 조사

- Claude Code hooks로 자동화할 수 있는 패턴 탐색
- AC 프로젝트에 적용 가능한 hook 후보 정리
