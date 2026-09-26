---
disable-model-invocation: true
name: refresh-projects
description: 내 프로젝트들을 한 회차로 갱신한다. 커밋 이력을 추적해 Maintain(내부 정비) → Readme(대표 창구 갱신) → Deploy(파생 산출물 배포) 순으로 최신화하고, 커밋에 안 나타나는 것(끊어진 링크·아무도 안 가리키는 문서·쌓인 백로그·남은 워크트리와 브랜치)도 같은 회차에서 전수로 턴다.
---

# Refresh Projects

## 목적

내 프로젝트들을 한 회차로 갱신한다. 갱신은 두 축이다.

- **변경을 따라가는 축** — 지난 회차 이후 쌓인 작업과 그 영향 범위를 전수조사해 정비하고, 대표 창구를 갱신하고, 그 기간에 배운 것을 파생 프로젝트로 배포한다.
- **변경과 무관하게 낡는 것을 터는 축** — 끊어진 링크, 아무도 안 가리키는 문서, 쌓인 백로그, 안 쓰는 워크트리·브랜치.

## 프로젝트 레지스트리

| 약어 | 경로 | Phase 3: Maintain | Phase 4-kq: Deploy |
|------|------|-------------------|-----------------|
| KA | `~/WebstormProjects/main/knowledge-archive` | validate (`local/skills/validate/SKILL.md`) | — |
| AC | `~/WebstormProjects/main/ai-contexts` | — | — |
| MP | `~/WebstormProjects/main/monorepo-playground` | — | — |
| KQ | `~/WebstormProjects/my-else/knowledge-quiz` | — | update-quiz (`local/skills/update-quiz/SKILL.md`) |

## state.json

진행 상태는 backlog 레포의 `refresh-projects/state.json`에 기록하고 그 레포에 커밋한다(squash 불필요).

형식:

```json
{
  "KA": { "hash": "<커밋 SHA>", "refreshedAt": "<ISO 8601>" }
}
```

- `hash`는 "여기까지 최신화 완료" 의미. 다음 실행은 `<hash>..HEAD` 범위(exclusive)만 다룬다.
- `refreshedAt`은 마지막 갱신 시각.
- Maintain 스킬이 없는 프로젝트(MP 등)도 엔트리를 유지하며, 매 실행마다 최신 커밋으로 자동 전진한다. 스킬이 생기는 시점부터 실제 최신화가 시작된다.

## 실행 흐름

[CRITICAL] AC 루트 기준 `deploy/contexts/team-agent.md`의 규칙을 따른다.

단계에 들어갈 때 그 단계의 담당 파일을 연다.

| 순서 | 단계 | 담당 | 도는 때 |
|---|---|---|---|
| 1 | Phase 0 워크트리 준비 · Phase 1 커밋 탐색 | [steps/scan.md](steps/scan.md) | 매 회차 |
| 2 | Phase 2 계획 제출 | [steps/scan.md](steps/scan.md#phase-2-최신화-계획-제출) | 변경 있는 프로젝트나 Phase 1 검출 후보가 있을 때 |
| 3 | 루트 README 전면 점검 질문 | [steps/readme.md](steps/readme.md#루트-readme-전면-점검-opt-in) | 매 회차 한 번. Phase 2 계획을 낼 때, 계획이 없는 회차면 Phase 1 뒤 |
| 4 | Phase 3 Maintain | [아래](#phase-3-maintain--내부-정비) | 변경 있는 프로젝트가 있을 때 |
| 5 | Phase 4 Readme·Deploy dispatch | [아래](#phase-4-병렬-dispatch--readme--deploy), [steps/readme.md](steps/readme.md), [steps/kq.md](steps/kq.md) | Phase 3 뒤. 변경이 없어도 README 깨진 링크가 있으면 readme만 |
| 6 | 백로그 정비 · 백로그 반영 sweep | [steps/backlog-tidy.md](steps/backlog-tidy.md), [아래](#백로그-반영-sweep) | 매 회차. Phase 4 결과를 기다리는 동안, Phase 2~4를 건너뛰는 회차면 Phase 1 직후 |
| 7 | state.json 업데이트 | [아래](#statejson-업데이트) | Phase 3·4 결과가 도착할 때마다 그 프로젝트분 |
| 8 | dispatch 산출물 정리 | [dispatch.md](dispatch.md#위임-플로우) | 모든 결과를 반영한 뒤 |
| 9 | 안 쓰는 워크트리·브랜치 정리 | [아래](#안-쓰는-워크트리브랜치-정리) | 매 회차 맨 끝 |

### Phase 3: Maintain — 내부 정비

레지스트리의 Phase 3 스킬이 등록된 프로젝트별로 팀 에이전트를 위임한다. 각 스킬이 최신화 작업을 수행하고 커밋한다.

팀 에이전트 지시:
- 대상 파일 목록: `<저장된 해시>..HEAD` diff에서 추출
- **규칙 변경 감지**: diff 범위에 그 Maintain 스킬의 SKILL.md, 참조 contexts, 또는 그 스킬이 호출하는 검증 스크립트가 포함되어 있으면, scope를 "프로젝트 전체 파일"로 확장하라

### Phase 4: 병렬 dispatch — Readme + Deploy

Phase 3(KA Maintain)이 완료되면, 부모 세션은 **Readme 갱신**과 **Deploy(KQ 변환)** 두 작업을 각각 dispatch MD로 작성해 **동시에 전달**하고 결과 수신만 대기한다. 규모와 무관하게 부모 세션에서 직접 실행하지 않는다. 사용자가 두 MD를 새 세션 둘에서 병렬로 실행할 수 있다.

- 각 서브페이즈는 부모가 먼저 dispatch에 필요한 사전 작업(대상 README 식별 / 후보 잠금·dry-run confirm)을 마친 뒤 dispatch MD를 발행한다. 발행 절차는 [위임 플로우](dispatch.md#위임-플로우)를 따른다.
- 두 dispatch MD가 준비되면 한 번에 사용자에게 전달하고, 두 `-result.md`가 모두 도착하면 [state.json 업데이트](#statejson-업데이트)로 마무리한다. 한쪽만 도착하면 그 쪽만 먼저 반영하고 나머지를 대기한다.

### state.json 업데이트

Phase 3~4까지 완료된 프로젝트의 `hash`와 `refreshedAt`을 **그 회차가 실제 처리한 SHA**로 갱신한다. 처리 SHA란 Maintain 검증을 돌린 시점, Deploy는 Phase 4-kq가 잠근 KA SHA다. **세션 중 잠금 이후 새 커밋이 쌓였으면 최신 HEAD가 아니라 처리 SHA를 기록한다** — 그 추가분이 다음 회차 범위(`<hash>..HEAD`)에 남아 처리되도록.

## 백로그 반영 sweep

각 백로그 항목이 이미 대상 프로젝트에 반영됐는지 매 회차 전수 대조해, 반영된 것으로 판정된 항목을 사용자 승인 후 삭제하는 점검. 다른 세션·기기에서 이미 처리됐지만 파일만 안 지워진 stale 항목을 걸러낸다. 파일을 읽어 대조만 하는 read-only 점검이라 파일 구조를 바꾸지 않는다.

### 대상

`projects/` 전체를 대상으로 한다. **AC 자기수정 트래커 `projects/ai-contexts/active/`도 포함한다**(「백로그 정비」와 다름).

### 대조

각 항목의 반영 여부는 backlog 레포 `projects/CLAUDE.md`의 「항목 반영 여부 판정」으로 가른다.

### 마무리

반영 판정 목록을 사용자에게 보고하고 승인받은 것만 삭제한다.

## 안 쓰는 워크트리·브랜치 정리

회차의 **맨 끝**, [state.json 업데이트](#statejson-업데이트) 커밋과 [위임 플로우](dispatch.md#위임-플로우)의 dispatch 산출물 정리가 끝난 뒤에 돈다 — 그래야 이 회차가 만든 워크트리도 후보에 오른다.

### 대상

아래 루트 바로 아래의 git 레포 전부다.

| 정리 대상 루트 |
|---|
| `~/WebstormProjects/main` |
| `~/WebstormProjects/my-else` |
| `~/WebstormProjects/recruitment` |

### 절차

1. AC에서 `node scripts/refresh-projects-scan.mjs --worktrees`
2. 표를 그대로 사용자에게 보여주고 지울 것을 한 번에 여러 개 고르게 한다. **무엇을 지울지 AI가 추리거나 권하지 않는다** — 안 푸시된 커밋이 있는 브랜치는 지우면 되살릴 수 없고, 「기본 브랜치에」·「백로그가 가리킴」 칸이 안전을 보장하지도 않는다(일부러 보존하는 브랜치가 있다)
3. 고른 행의 지정값을 `--remove`에 넘긴다. 미커밋이 있는 워크트리는 사용자가 그 수를 보고 골랐을 때만 `--force`를 붙인다. ✗로 나온 것은 완료로 치지 않고 사유와 함께 그대로 보고한다

## 커밋 단위

회차 history가 잘게 쪼개지지 않게, 각 프로젝트·Phase 산출 커밋을 종류별로 한 커밋으로 묶는다.

- Phase 3 Maintain: 한 프로젝트의 검증·수정 전체를 그 프로젝트에서 한 커밋으로 합친다. 작업 중 여러 번 커밋했으면 마지막에 squash로 합친다. 단 종류가 명확히 다르면 그 종류끼리만 분리한다.
- Phase 4-readme: 갱신한 README가 여러 건이면 한 커밋으로 묶는다.
- 종류가 다른 작업(Maintain 수정 vs README vs Deploy 산출물·state.json)은 같은 커밋에 섞지 않는다.
