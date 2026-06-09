---
name: full-refresh
description: 등록된 프로젝트의 커밋 이력을 추적하여 Maintain(내부 정비) → Readme(대표 창구 갱신) → Deploy(파생 산출물 배포) 순으로 최신화한다. 레포지토리 점검, 주간 리뷰, 전체 프로젝트 최신화 요청 시 사용.
---

# Full Refresh

## 목적

내 레포들에서 특정 기간 동안 발생한 작업과 그 영향 범위를 전수조사해 최신화하고, 그 기간에 배운 것을 외부에 배포한다.

프로젝트별 커밋 이력을 state.json에 기록하여 "여기까지 최신화했다"를 추적한다. 다음 실행은 그 해시 이후 범위만 자동으로 처리한다.

## 프로젝트 레지스트리

| 약어 | 경로 | Phase 3: Maintain | Phase 5: Deploy |
|------|------|-------------------|-----------------|
| KA | `~/WebstormProjects/main/knowledge-archive` | scw-refresh → validate (`.claude/skills/validate/SKILL.md`) | — |
| AC | `~/WebstormProjects/main/ai-contexts` | scw-refresh (하단 참조) | — |
| MP | `~/WebstormProjects/main/monorepo-playground` | — | — |
| KQ | `~/WebstormProjects/my-else/knowledge-quiz` | — | update-quiz (하단 참조) |

> Blog(`~/WebstormProjects/my-else/blog`)는 explained 모델(`explained/` 산문 → `convert-explained`, 사용자가 하나씩 수동 발행)로 전환되어 **full-refresh 자동배포 대상에서 제외됨**. 옛 QnA 배포(`enrich:sync`)는 호출하지 않는다 — 호출 시 삭제된 QnA 포스트가 재생성된다.

## state.json

진행 상태는 `backlog/full-refresh/state.json`에 기록한다.

형식:

```json
{
  "KA": { "hash": "<커밋 SHA>", "refreshedAt": "<ISO 8601>" }
}
```

- `hash`는 "여기까지 최신화 완료" 의미. 다음 실행은 `<hash>..HEAD` 범위(exclusive)만 다룬다.
- `refreshedAt`은 마지막 갱신 시각.
- Maintain 스킬이 없는 프로젝트(MP 등)도 엔트리를 유지하며, 매 실행마다 최신 커밋으로 자동 전진한다. 스킬이 생기는 시점부터 실제 최신화가 시작된다.

커밋 관리: `backlog/` 하위이므로 AC **백로그 브랜치**에만 커밋한다 (master 금지). 여러 회차의 업데이트는 squash로 합친다.

## 실행 흐름

[CRITICAL] [team-agent](../../../deploy/contexts/team-agent.md)의 규칙을 따른다.

Phase 0~5는 변경분(diff)을 추적·처리하는 흐름이다. 이와 별개로 [백로그 정비](#백로그-정비)는 변경 유무·Phase 스킵과 무관하게 매 회차 무조건 수행한다.

### Phase 0: 동기화 + 사전 격리

모든 Phase 시작 전에 다음을 점검한다 (Phase 0뿐 아니라 매 Phase 진입 시 동일).

1. **원격 동기화**: 각 레지스트리 프로젝트에서 `git -C <경로> pull --ff-only`. ff 불가(divergence)이면 사용자에게 보고하고 중단.
2. **사용자 작업물 격리**: `git status`로 점검하여 staged 또는 modified 파일이 있으면:
   - 본 작업과 무관한 사용자 작업물일 가능성 → **격리** (`git restore --staged <file>` 또는 stash) 후 진행
   - 절대 묻지 않고 같이 staging·commit 금지
   - 격리된 항목은 사용자에게 보고하여 Phase 종료 후 복구 안내

### Phase 1: 커밋 탐색

state.json을 로드하고 각 프로젝트별로 `<저장된 해시>..HEAD` 범위를 조회한다.

프로젝트별 처리:
- **해시 유효 + 변경 있음**: `git log --first-parent <hash>..HEAD --oneline`으로 커밋 목록 표시
- **HEAD == 해시**: "변경 없음" 표시, Phase 3~5 스킵
- **Orphan 해시** (rebase/force-push로 해시가 현재 브랜치에 없음): 팀 에이전트에게 "직전 최신화 지점"을 재탐색시켜 해시를 복구한 뒤 진행
- **엔트리 없음**: state.json에 엔트리 추가. 프로젝트 역할별로 초기 해시 산출:
  - Readme 지배 프로젝트(AC/MP 등): README.md 마지막 **실내용 변경** 커밋. 포맷팅·리네이밍 같은 메타 커밋(style/chore)은 제외하고 커밋 메시지로 실내용 변경인지 판단
  - Deploy 원천(KA): 파생 프로젝트(KQ) 중 최근 "KA 변환" 커밋 시점 기준, 그 시점 직전의 원천 HEAD
  - Deploy 자체(KQ): 자체 최근 변환 커밋 SHA
  - 역할 불명확·스킬 완전 없음: 현재 HEAD

Orphan 유효성 체크:

```bash
git cat-file -e <hash> && git merge-base --is-ancestor <hash> HEAD
```

둘 다 통과해야 유효.

변경 있는 프로젝트가 하나도 없으면 diff 기반 최신화(Phase 2~5)를 건너뛴다.

### Phase 2: 최신화 계획 제출

Phase 1에서 "변경 있음"으로 확인된 프로젝트에 대해 Phase 3~5 계획을 제출한다.

사용자가 조정할 수 있다 ("이건 빼줘" 등). 승인 후 Phase 3으로 진행한다.

### Phase 3: Maintain — 내부 정비

레지스트리의 Phase 3 스킬이 등록된 프로젝트별로 팀 에이전트를 위임한다. 각 스킬이 최신화 작업을 수행하고 커밋한다.

팀 에이전트 지시:
- 대상 프로젝트의 스킬 파일(SKILL.md)을 읽고, 기술된 대로 실행하라
- 대상 파일 목록: `<저장된 해시>..HEAD` diff에서 추출
- **규칙 변경 감지**: diff 범위에 본 스킬의 SKILL.md 또는 참조 contexts가 포함되어 있으면, scope를 "프로젝트 전체 파일"로 확장하라 (규칙이 바뀌었으므로 기존 최신화 결과를 신뢰할 수 없음)
- 수정 후 커밋까지 완료하라

### Phase 4: Readme — 대표 창구 갱신

`<저장된 해시>..HEAD` 범위의 모든 변경 파일을 기반으로 (Phase 3 팀 에이전트 수정 + 사용자 직접 커밋 포함), 각 파일의 상위 경로에 README.md가 있는지 탐색한다. 변경은 "이 README가 낡았을 수 있다"는 신호로만 쓴다. 해당 README가 그 디렉토리의 SKILL.md(또는 핵심 문서)와 정합한지 확인하고, 어긋났으면 변경분만 덧대지 말고 SKILL.md를 기준으로 `/write-init`(사용자와 소통해 내용 채움) → `/write-refine`(톤·구조·분량 다듬기) 순으로 다시 쓴다.

**규칙 변경 감지**: 변경 범위에 `deploy/contexts/writing-guide/`(README 작성 규칙·톤)가 포함되면, 그 규칙이 적용되는 README들이 일괄로 낡았을 수 있다. 상위 경로가 바뀐 README뿐 아니라 규칙 적용 대상 README도 Phase 2 계획에 "재다듬기 대상"으로 올려 사용자에게 보고하고 scope를 정한다.

### Phase 5: Deploy — 파생 산출물 배포

KA 기반 변환이므로 Phase 3의 KA Maintain 완료 후 실행한다. KQ는 KA HEAD 시점의 후보 셋으로 변환한다.

#### 핵심 원칙

- **본 세션에서 직접 실행 금지**. Phase 5는 항상 dispatch 위임. 가벼운 KQ도 예외 없음
- **KQ는 `KA_DEPLOY_SHA` + 해당 candidates 셋으로만 변환**. 자체 KA 파일 발견·필터링 금지

#### 흐름

1. **KA HEAD 잠금**: 현재 KA HEAD를 캡처. 이 SHA를 `KA_DEPLOY_SHA`로 기억하고 Phase 5 전체에서 동일 값을 사용. 이후 KA가 변동해도 본 회차는 잠금 SHA 기준.

2. **후보 리스트업**: KA에서 `KA_DEPLOY_SHA` 시점의 후보를 산출.
   ```bash
   cd <KA 경로>
   KA_HEAD=<KA_DEPLOY_SHA> npm run list-candidates -- \
     --out backlog/full-refresh/dispatch/candidates-<KA_DEPLOY_SHA>.json
   ```
   결과 JSON을 dispatch 디렉토리에 저장.

3. **dry-run 보고**: 후보 리스트를 사용자에게 그룹화하여 제출.
   - **NEW** (KQ에 없음 — 첫 변환 대상)
   - **CHANGED** (`lastCommitDate`가 직전 회차 `state.json.KQ.refreshedAt` 이후). `lastCommitDate`는 날짜 단위라 refreshedAt와 같은 날이면 intra-day 변경(같은 날 더 늦은 시각 커밋)을 놓친다. 같은 날인 후보는 커밋 시각·`diff`로 OA·질문 실변경을 확인해 판정한다
   - **UNCHANGED** (변경 없음, 재변환 불필요)
   - **SKIPPED** (선정 기준 미달 — `skipped.reason`별로 분리)
   - 출처별 추가 분리: `official` / `google-doc` / `unverified` / 미상

4. **사용자 confirm**: 사용자에게 dry-run 그룹을 보고하고 회차 진행 승인을 받는다. **변환은 항상 전체 candidates JSON으로 실행한다 — 일부만 필터링해 넘기지 않는다.** `parse-knowledge.mts`가 passing 전체를 재생성하고 `topics.json`을 전면 재작성하며 candidates 슬러그에 없는 `generated/*.json`을 orphan으로 자동 삭제하므로, 필터링하면 confirm에서 빠진 기존 퀴즈가 삭제된다. NEW/CHANGED/UNCHANGED 분류는 사용자 보고 전용이고 변환 입력을 가르지 않는다.

5. **dispatch 발행**: md를 작성한다.
   - `backlog/full-refresh/dispatch/kq-update-quiz.md` — `KA_DEPLOY_SHA` + candidates 경로 명시

   dispatch md에는 다음을 박는다:
   - 잠금 SHA (`KA_DEPLOY_SHA`)
   - 전체 candidates JSON 경로 (절대 경로)
   - 실행 명령 예시 (`npm run parse -- --candidates <path>`)
   - 결과 md 작성 경로 (`<dispatch>-result.md`)

6. **결과 수신**: 사용자가 dispatch md를 새 세션에서 실행하고 `-result.md`를 도착시킨다. 도착하면 마무리. 누락 시 보고 + 대기.

7. **state.json 갱신 + 정리**: KA·KQ의 hash와 refreshedAt을 갱신. AC backlog 브랜치에 커밋. **dispatch 산출물(`kq-update-quiz.md` + `-result.md`, `candidates-<SHA>.json`)은 회차 종료 시점에 `git rm`으로 모두 삭제** — 다음 회차로 누적 금지. 회차 시작 시점에 `backlog/full-refresh/dispatch/` 디렉토리가 비어 있어야 한다 (남아 있으면 직전 회차 정리 누락이므로 먼저 정리).

#### 규칙 변경 감지

Deploy 스킬·스크립트(`scripts/list-candidates.mts`, `scripts/parse-knowledge.mts`) 자체가 변경된 회차에서는, dry-run 단계에서 사용자에게 보고하여 scope를 "전체 재생성"으로 확장할지 결정한다.

### state.json 업데이트

Phase 3~5까지 완료된 프로젝트의 `hash`와 `refreshedAt`을 **그 회차가 실제 처리한 SHA**로 갱신하고, AC 백로그 브랜치에 커밋한다. 이전 회차 커밋들과 squash로 합친다. 처리 SHA란 Maintain 검증을 돌린 시점, Deploy는 `KA_DEPLOY_SHA`(잠금 SHA)다. **세션 중 잠금 이후 새 커밋이 쌓였으면 최신 HEAD가 아니라 처리 SHA를 기록한다** — 그 추가분이 다음 회차 범위(`<hash>..HEAD`)에 남아 처리되도록. Maintain 스킬이 없어 잠금이 없는 프로젝트(MP 등)는 최신 커밋으로 자동 전진한다.

## 백로그 정비

누적된 백로그를 순회하며 비대해진 파일·디렉토리를 쪼개고, 흩어진 중복을 통합하고, 오배치된 항목을 옮기는 정비. 새 입력 없이 기존 파일만 대상으로 한다. 사용자 판정 없이 AI 판단으로 적용하고 커밋한다 (git 이력에 남으므로 되돌릴 수 있다).

diff 기반 Phase와 별개로 **매 회차 무조건 수행한다** — Phase 1에서 변경 프로젝트가 없어 diff 흐름을 건너뛰어도 이 정비는 돈다. 백로그는 주기적으로 한 커밋으로 squash되어 "지난 회차 이후 무엇이 쌓였나"를 hash로 추적할 수 없으므로, 증분 감지 없이 매번 전수로 훑는다.

분류·파일명·배치·중복 규칙은 `/backlog`이 소유한다 — 이 정비는 그 규칙을 적용만 한다.

### 대상

`backlog/projects/`만 대상으로 한다 — 누적되며 tier·게이트가 없는 비-트래커 영역이다.

- `backlog/this/` 제외: tier·Ready 게이트·상태 라벨이 달린 트래커라, 구조를 AI가 임의로 바꾸면 우선순위·실행 순서가 깨진다.
- `backlog/articles/` 제외: 발행 단위(slug)로 사용자가 큐레이션하는 재료라, 임의 분리가 글 구성을 흩뜨린다.

### 현황파악

정비 전에 대상 디렉토리(`backlog/projects/`)를 훑어 비대한 파일·흩어진 중복·오배치 후보와 분량 분포를 파악한다. 이 현황으로 이번 회차 정비 범위를 정하고, 사용자에게 요약 보고한 뒤 정비에 들어간다.

### 정비 작업

각 작업은 `/backlog`의 분류 규칙(「영역 분류」·「파일명 규칙」·「배치 판단」·중복 규칙)을 재사용한다.

- **파일 분리** — 한 파일이 서로 독립적인 여러 subtopic·주제를 담아 비대해졌으면 「파일명 규칙」에 따라 단위별 파일로 쪼갠다. 분량의 절대 기준을 두지 않고, 한 파일이 단일 주제로 읽히는지로 판단한다.
- **디렉토리 구조화** — 한 디렉토리에 파일이 쌓여 탐색이 어려우면 결이 가까운 것끼리 하위 그룹으로 묶거나 subtopic 단위로 정돈한다.
- **중복 통합** — 같거나 겹치는 내용이 여러 파일에 흩어져 있으면 「배치 판단」으로 통합 위치를 정해 한 곳에 모으고 나머지에서 제거한다.
- **오배치 이동** — 「영역 분류」 기준에 어긋나게 놓인 항목을 올바른 영역·파일로 옮긴다 (예: KA 지식 메모가 엉뚱한 레포 디렉토리에 있으면 `projects/knowledge-archive/`로).

### 마무리

- `this/tier-{n}/index.md` 현황표는 항목이 변동된 tier만 갱신한다. `projects/{topic}/index.md`는 References 전용이라 파일 구성이 바뀌어도 갱신하지 않는다 (item 목차 아님).
- 백로그 워크트리에서 수행하고 backlog 브랜치에 커밋한다 (`/backlog`의 「브랜치 관리」).
- 정비 후 `/backlog`의 「보고」 형식으로 분리·통합·이동·삭제 내역을 사용자에게 보고한다.

## 커밋 단위

회차 history가 잘게 쪼개지지 않게, 각 프로젝트·Phase 산출 커밋을 종류별로 한 커밋으로 묶는다.

- Phase 3 Maintain: 한 프로젝트의 검증·수정 전체를 그 프로젝트에서 한 커밋으로 합친다 (예: KA validate 전체 = KA 1커밋, AC scw-refresh 전체 = AC 1커밋). 작업 중 여러 번 커밋했으면 마지막에 squash로 합친다. 단 종류가 명확히 다르면 그 종류끼리만 분리한다.
- Phase 4 Readme: 갱신한 README가 여러 건이면 한 커밋으로 묶는다.
- 종류가 다른 작업(Maintain 수정 vs README vs Deploy 산출물·state.json)은 같은 커밋에 섞지 않는다.

## 대규모 작업 위임

팀/서브에이전트로 위임된 작업자는 다시 새 작업자를 만들 수 없거나 런타임별 제약으로 병렬화가 막힐 수 있다. 대량 파일 변환·생성 작업은 현재 세션의 하위 작업자에게 몰아넣지 말고, 아래 dispatch 플로우로 새 메인 세션에 넘긴다.

### 대규모 판정 기준

Phase 3/5 대상 파일이 많거나 한 세션에서 수행 시 현저히 느려질 변환 작업.

### dispatch 워크트리 분리

dispatch 위임 작업은 메인 워크트리에서 직접 수행하지 않는다. 사용자가 메인 워크트리에서 병행 작업할 수 있고, 메인의 modified·untracked 파일과 작업 커밋이 섞일 위험이 있다. dispatch md에 다음을 박아 새 세션이 별도 워크트리에서 작업하도록 강제한다.

- 워크트리 경로: 메인 repo 옆에 `<repo>-<task>` 형태 (예: `ai-contexts-scw-refresh`)
- base: `origin/<base-branch>` (메인 repo의 로컬 미반영 커밋 회피 — `git fetch origin <base>` 선행)
- 생성 명령: `git worktree add <path> origin/<base>` (모든 프로젝트 공통)
  - AC는 생성 직후 self-heal hook이 새 워크트리에 의존성·Husky hook shim을 자동 복구한다 (AC [meta/deploy-conventions.md](../../../meta/deploy-conventions.md) 「AC worktree hook 준비」 참조)
- 작업·커밋·푸시는 새 워크트리에서 수행. `-result.md`는 원본 위치(`<ai-contexts-backlog>/backlog/full-refresh/dispatch/`)에 작성

작업 종료 후 워크트리 정리는 회차 마감 후 사용자가 결정 (삭제 또는 유지).

### 위임 플로우

1. **지시 프롬프트 작성**: 메인 에이전트(현재 세션)가 `backlog/full-refresh/dispatch/<project>.md`에 작업 지시를 작성한다. 포함 항목: 워크트리 분리 절차(위 「dispatch 워크트리 분리」 참조), 대상 프로젝트, 해시 범위, 해당 프로젝트 스킬 경로, 대상 파일 목록, 반영 규칙, 커밋 정책.
2. **사용자 안내**: 다음 형식으로 전달한다.
   > 다음 md를 새 AI 작업 세션(Claude Code 또는 Codex)에 복사해 실행해 주세요. 새 세션은 메인 에이전트이므로 현재 런타임의 `team-agent` 규칙에 따라 병렬 위임이 가능하면 사용하고, 불가능하면 순차 실행 후 제한 사항을 결과에 기록합니다. 완료 후 `-result.md` 경로를 알려주시면 이어서 진행합니다.
   > 경로: `backlog/full-refresh/dispatch/<project>.md`
3. **새 세션 실행**: 사용자가 연 세션의 메인 에이전트가 지시대로 실행하고, 결과를 `backlog/full-refresh/dispatch/<project>-result.md`에 기록한다.
4. **결과 통합**: 현재 세션에서 결과 md를 읽고 state.json 갱신 등 마무리를 수행한다.
5. **dispatch md 정리**: 마무리 후 `backlog/full-refresh/dispatch/` 하위 지시·결과 md는 삭제한다.

소규모 작업(단일 파일 수정, Maintain 일부)은 기존대로 팀 에이전트 유지. **단 Phase 5(Deploy)는 규모와 무관하게 항상 dispatch 위임** (위 Phase 5 핵심 원칙 참조).

## 프로젝트별 스킬 정의

### scw-refresh

현재 프로젝트에서 이 회차에 추가·수정된 스킬을 점검한다. 대상은 그 프로젝트의 스킬 — AC는 전역(`deploy/skills/`)+로컬(`local/skills/`), KA는 로컬(`.claude/skills/`).

1. 커밋 diff에서 추가·수정된 스킬을 식별하고, 주제별로 묶어 사용자에게 보고한다 (추가/수정 구분).
2. 사용자가 "목적부터 다시 토론" 표시한 스킬은 `/scw`로 목적 기반 재검토한다 (scw 「목적 기반 수단 검증」). 표시 안 된 것은 `/scw`로 동작 검증 + 이전 버전 대비 eval.

KA에서 scw-refresh를 validate보다 먼저 도는 이유: validate(지식 문서 검증)도 스킬이므로, 그 규칙이 이 회차에 바뀌었으면 scw-refresh로 먼저 검증한 뒤 validate를 돌려야 바뀐 규칙이 문서 검증에 반영된다.

### KQ: update-quiz

Phase 5가 발행한 dispatch md를 새 세션에서 실행한다. dispatch에 박힌 candidates JSON 경로로 `npm run parse -- --candidates <path>` 호출. `generated/<slug>.json` + `topics.json` 갱신. 자체 KA 발견·필터링 금지 (받은 셋만 변환).

## 범위

- **포함**: 커밋 탐색, Maintain/Readme/Deploy 실행, state.json 관리
- **제외**: 스킬이 수정하지 못한 항목 (사용자가 직접 해결)
