---
name: refresh-projects
description: 등록된 프로젝트의 커밋 이력을 추적하여 Maintain(내부 정비) → Readme(대표 창구 갱신) → Deploy(파생 산출물 배포) 순으로 최신화한다. 레포지토리 점검, 주간 리뷰, 전체 프로젝트 최신화 요청 시 사용.
---

# Refresh Projects

## 목적

내 레포들에서 특정 기간 동안 발생한 작업과 그 영향 범위를 전수조사해 최신화하고, 그 기간에 배운 것을 외부에 배포한다.

프로젝트별 커밋 이력을 state.json에 기록하여 "여기까지 최신화했다"를 추적한다. 다음 실행은 그 해시 이후 범위만 자동으로 처리한다.

## 프로젝트 레지스트리

| 약어 | 경로 | Phase 3: Maintain | Phase 4-kq: Deploy |
|------|------|-------------------|-----------------|
| KA | `~/WebstormProjects/main/knowledge-archive` | validate (`local/skills/validate/SKILL.md`) | — |
| AC | `~/WebstormProjects/main/ai-contexts` | — | — |
| MP | `~/WebstormProjects/main/monorepo-playground` | — | — |
| KQ | `~/WebstormProjects/my-else/knowledge-quiz` | — | update-quiz (하단 참조) |

> Blog(`~/WebstormProjects/my-else/blog`)는 explained 모델(`explained/` 산문 → `convert-explained`, 사용자가 하나씩 수동 발행)로 전환되어 **refresh-projects 자동배포 대상에서 제외됨**. 옛 QnA 배포(`enrich:sync`)는 호출하지 않는다 — 호출 시 삭제된 QnA 포스트가 재생성된다.

## state.json

진행 상태는 `refresh-projects/state.json`에 기록한다.

형식:

```json
{
  "KA": { "hash": "<커밋 SHA>", "refreshedAt": "<ISO 8601>" }
}
```

- `hash`는 "여기까지 최신화 완료" 의미. 다음 실행은 `<hash>..HEAD` 범위(exclusive)만 다룬다.
- `refreshedAt`은 마지막 갱신 시각.
- Maintain 스킬이 없는 프로젝트(MP 등)도 엔트리를 유지하며, 매 실행마다 최신 커밋으로 자동 전진한다. 스킬이 생기는 시점부터 실제 최신화가 시작된다.

커밋 관리: 이 `state.json`은 backlog 레포(`refresh-projects/state.json`)에 커밋한다. 커밋은 자유롭게 쌓는다(squash 불필요).

## 실행 흐름

[CRITICAL] [team-agent](../../../deploy/contexts/team-agent.md)의 규칙을 따른다.

Phase 0~4는 변경분(diff)을 추적·처리하는 흐름이다. 이와 별개로 [백로그 정비](#백로그-정비)와 [백로그 반영 sweep](#백로그-반영-sweep)은 변경 유무·Phase 스킵과 무관하게 매 회차 무조건 수행한다.

### Phase 0: 동기화 + 사전 격리

모든 Phase 시작 전에 다음을 점검한다 (Phase 0뿐 아니라 매 Phase 진입 시 동일).

- **원격 동기화**: 각 레지스트리 프로젝트에서 `git -C <경로> pull --ff-only`. ff 불가(divergence)이면 사용자에게 보고하고 중단.
- **사용자 작업물 격리**: `git status`로 점검하여 staged 또는 modified 파일이 있으면:
   - 본 작업과 무관한 사용자 작업물일 가능성 → **격리** (`git restore --staged <file>` 또는 stash) 후 진행
   - 절대 묻지 않고 같이 staging·commit 금지
   - 격리된 항목은 사용자에게 보고하여 Phase 종료 후 복구 안내

### Phase 1: 커밋 탐색

state.json을 로드하고 각 프로젝트별로 `<저장된 해시>..HEAD` 범위를 조회한다.

프로젝트별 처리:
- **해시 유효 + 변경 있음**: `git log --first-parent <hash>..HEAD --oneline`으로 커밋 목록 표시
- **HEAD == 해시**: "변경 없음" 표시, Phase 3~4 스킵
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

#### 짝꿍 드리프트 점검

변경 있는 프로젝트별로, 그 프로젝트 루트 `meta/coupling.json`을 읽어 **한쪽만 수정된 짝꿍 그룹**을 후보로 잡는다. edit 시점 surfacing 훅(`surface-coupling.mjs`)은 세션당 1회라 놓치거나 무시될 수 있는데, 이 주기 점검이 회차 단위로 그 누락을 메운다. 대상은 `meta/coupling.json`이 있는 레지스트리 프로젝트뿐이다 (없는 프로젝트는 자동 제외). 이미 계산한 `<hash>..HEAD`의 변경 파일 목록을 재사용한다.

각 그룹을 그룹 유형에 따라 판정한다.

- **단순 목록 그룹** (구체 파일·`*`/`**` glob로 서로 다른 산출물을 나열): 그룹 파일 중 변경 파일 목록에 매칭되는 것을 센다. 0개면 건드리지 않음(skip), 전부면 같이 움직임(정상), **일부만이면 드리프트 후보**.
- **파라메트릭 미러 그룹** (평행 트리를 같은 상대경로로 짝짓는 그룹 — 예: KA `knowledge/**`↔`explained/**`↔`assets/**`, note가 "같은 상대경로"로 짝을 정의): 그룹 엔트리 단위가 아니라 **상대경로 단위**로 본다. 한 트리에서 바뀐 상대경로의 미러(다른 트리의 같은 상대경로)가 안 바뀌었으면 드리프트 후보.

판정은 범위 전체(여러 커밋 합산) 기준이다 — 한 커밋에서 A, 다른 커밋에서 B가 바뀌었으면 같이 움직인 것으로 본다. 드리프트 후보는 어느 파일이 움직였고 어느 짝꿍이 안 움직였는지와 그룹 `note`를 함께 [Phase 2](#phase-2-최신화-계획-제출) 계획에 올린다 — **자동 수정이 아니라 사용자 보고**다(판단·수정은 사용자 승인 후 Phase 3에서).

그 프로젝트 Maintain 린트가 이미 강제하는 면(파일 존재·목록 정합 — KA 미러는 `/validate`, AC는 `verify:settings`·`verify:context-maps`)은 중복 보고하지 않는다. 드리프트 점검은 린트가 못 잡는 잔여 면(왜·역할·메타 결정)을 띄우는 용도이므로, 그 각도로 보고한다.

#### 깨진 링크 전수 검출 (diff 무관)

diff와 무관하게 매 회차, 레지스트리 레포 전체의 추적되는 `.md`에서 깨진 링크를 결정적으로 검출한다 — 링크 대상이 발밑에서 사라지면 그 링크를 품은 문서는 안 바뀌어 diff에 안 잡히고, 깨진 채 오래 살기 때문이다.

```bash
node scripts/check-links.mjs <레지스트리 레포 경로들>
```

`scripts/check-links.mjs`(AC master 스크립트)는 in-page 앵커·in-repo 상대경로·내 레포 GitHub URL을 결정적으로 검사하고, 모르는 외부 URL은 체크하지 않고 pile로 모은다. 외부 HTTP는 보지 않는다(GitHub 페이지 내 404도 200을 반환해 무의미). 깨진 항목이 있으면 exit 1.

결과를 다음으로 라우팅한다:

- **README 깨진 링크** → [Phase 4-readme](#phase-4-readme-대표-창구-갱신) dispatch가 고친다(갱신 대상 README에 깨진 링크 목록을 함께 박는다).
- **비-README 깨진 링크** → [Phase 2](#phase-2-최신화-계획-제출) 계획에 **보고만** 한다(자동수정 금지 — 어떻게 고칠지는 판단이 필요하고, 대상 레포의 Maintain·사용자 몫이다).
- **모르는 외부 URL pile** → 사용자에게 리스트로 보고한다(직접 확인).

변경 있는 프로젝트가 하나도 없으면 diff 기반 최신화(Phase 2~4)를 건너뛴다. 단 위 검출에서 후보가 나오면 diff가 없어도 그 후보만 Phase 2 보고·Phase 4-readme 수정으로 처리한다.

### Phase 2: 최신화 계획 제출

Phase 1에서 "변경 있음"으로 확인된 프로젝트에 대해 Phase 3~4 계획을 제출한다. Phase 1의 [짝꿍 드리프트 점검](#짝꿍-드리프트-점검) 후보가 있으면 같이 보고해 사용자가 이번 회차에 함께 손볼지 정하게 한다. [깨진 링크 전수 검출](#깨진-링크-전수-검출-diff-무관)의 비-README 후보와 외부 URL pile도 계획에 포함해 보고한다(비-README는 보고만 — 수정은 사용자 판단).

사용자가 조정할 수 있다 ("이건 빼줘" 등). 승인 후 Phase 3으로 진행한다.

### Phase 3: Maintain — 내부 정비

레지스트리의 Phase 3 스킬이 등록된 프로젝트별로 팀 에이전트를 위임한다. 각 스킬이 최신화 작업을 수행하고 커밋한다.

팀 에이전트 지시:
- 대상 프로젝트의 스킬 파일(SKILL.md)을 읽고, 기술된 대로 실행하라
- 대상 파일 목록: `<저장된 해시>..HEAD` diff에서 추출
- **규칙 변경 감지**: diff 범위에 본 스킬의 SKILL.md 또는 참조 contexts가 포함되어 있으면, scope를 "프로젝트 전체 파일"로 확장하라
- 수정 후 커밋까지 완료하라

### Phase 4: 병렬 dispatch — Readme + Deploy

Phase 3(KA Maintain)이 완료되면, 부모 세션은 **Readme 갱신**과 **Deploy(KQ 변환)** 두 작업을 각각 dispatch MD로 작성해 **동시에 전달**하고 결과 수신만 대기한다. 두 작업은 서로 독립적이라(Readme는 정비된 콘텐츠 기준, KQ는 KA 잠금 SHA 기준) 사용자가 두 MD를 새 세션 둘에서 병렬로 실행할 수 있다.

- 각 서브페이즈는 부모가 먼저 dispatch에 필요한 사전 작업(대상 README 식별 / 후보 잠금·dry-run confirm)을 마친 뒤 dispatch MD를 발행한다. 발행 절차는 [위임 플로우](#위임-플로우)를 따른다.
- 두 dispatch MD가 준비되면 한 번에 사용자에게 전달하고, 두 `-result.md`가 모두 도착하면 [state.json 업데이트](#statejson-업데이트)로 마무리한다. 한쪽만 도착하면 그 쪽만 먼저 반영하고 나머지를 대기한다.

#### Phase 4-readme: 대표 창구 갱신

**부모 사전작업** — `<저장된 해시>..HEAD` 범위의 모든 변경 파일(Phase 3 수정 + 사용자 직접 커밋 포함)을 기반으로, 각 파일의 상위 경로에 README.md가 있는지 탐색해 **갱신 후보 README 목록**을 만든다. 변경은 "이 README가 낡았을 수 있다"는 신호로만 쓴다. 여기에 [깨진 링크 전수 검출](#깨진-링크-전수-검출-diff-무관)이 README에서 잡은 깨진 링크도 후보로 합친다 — 상위 경로가 안 바뀐 README라도 깨진 링크가 있으면 갱신 대상이다.

- **규칙 변경 감지**: 변경 범위에 `deploy/contexts/writing-guide/`(README 작성 규칙·톤)가 포함되면, 그 규칙이 적용되는 README들이 일괄로 낡았을 수 있다. 상위 경로가 바뀐 README뿐 아니라 규칙 적용 대상 README도 후보에 올려 [Phase 2](#phase-2-최신화-계획-제출) 계획으로 사용자에게 보고하고 scope를 정한다.

**dispatch 발행** — 후보 목록과 갱신 규칙을 dispatch MD(`refresh-projects/dispatch/<repo>-readme.md`)에 박아 [위임 플로우](#위임-플로우)로 새 세션에 넘긴다. dispatch MD에 박을 내용:

- 갱신 대상 README 목록과 각 README의 기준 문서(그 디렉토리의 SKILL.md 또는 핵심 문서)
- 각 README의 깨진 링크 목록(링크 체커 검출분) — dispatch가 이 링크를 우선 교정한다
- 갱신 방식: 각 README가 기준 문서와 정합한지 확인하고, 어긋났으면 변경분만 덧대지 말고 기준 문서를 바탕으로 `/write-init`(사용자와 소통해 내용 채움) → `/write-refine`(톤·구조·분량 다듬기) 순으로 다시 쓴다
- 결과 md 경로: `refresh-projects/dispatch/<repo>-readme-result.md`

##### 루트 README 전면 점검 (opt-in)

루트 README(모노레포면 등록 하위 레포 README 포함)는 하위가 바뀌어도 조망이 안 흔들려 diff 흐름으론 손댈 일이 거의 없다. 그래서 회차마다 diff와 무관하게 한 번 묻는다.

- 부모가 사용자에게 묻는다: "루트 README 전면 점검할까요?"
- **yes** → 전체 구조 파악 전용 에이전트를 dispatch해 "지금 프로젝트 전체가 이렇게 생겼다"를 정리시킨 뒤, `/write-init`로 골격 초안을 제안한다. 승인 게이트를 거쳐 승인되면 채우고 `/write-refine`로 다듬는다.
- **no** → 건너뛴다.
- 판단 기준은 그 기간 diff가 아니라 **"지금 전체 구조를 루트가 잘 대표하나"**다. 비-루트 README는 위 diff 흐름 그대로(이 트랙은 손대지 않는다).
- 위 깨진 링크 검출이 루트의 "링크 차원" stale은 이미 메우므로, 이 트랙은 **구조·콘텐츠 차원**(재배치·골격)만 담당한다.

#### Phase 4-kq: 파생 산출물 배포 (KQ)

KA 기반 변환이므로 Phase 3의 KA Maintain 완료 후 실행한다. KQ는 KA HEAD 시점의 후보 셋으로 변환한다.

##### 핵심 원칙

- **본 세션에서 직접 실행 금지**. Phase 4-kq는 항상 dispatch 위임. 가벼운 KQ도 예외 없음
- **KQ는 `KA_DEPLOY_SHA` + 해당 candidates 셋으로만 변환**. 자체 KA 파일 발견·필터링 금지

##### 흐름

1. **KA HEAD 잠금**: 현재 KA HEAD를 캡처. 이 SHA를 `KA_DEPLOY_SHA`로 기억하고 Phase 4-kq 전체에서 동일 값을 사용. 이후 KA가 변동해도 본 회차는 잠금 SHA 기준.

2. **후보 리스트업**: KA에서 `KA_DEPLOY_SHA` 시점의 후보를 산출.
   ```bash
   cd <KA 경로>
   KA_HEAD=<KA_DEPLOY_SHA> npm run list-candidates -- \
     --out refresh-projects/dispatch/candidates-<KA_DEPLOY_SHA>.json
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
   - `refresh-projects/dispatch/kq-update-quiz.md` — `KA_DEPLOY_SHA` + candidates 경로 명시

   dispatch md에는 다음을 박는다:
   - 잠금 SHA (`KA_DEPLOY_SHA`)
   - 전체 candidates JSON 경로 (절대 경로)
   - 실행 명령 예시 (`npm run parse -- --candidates <path>`)
   - 결과 md 작성 경로 (`<dispatch>-result.md`)

6. **결과 수신**: 사용자가 dispatch md를 새 세션에서 실행하고 `-result.md`를 도착시킨다. 도착하면 마무리. 누락 시 보고 + 대기.

7. **state.json 갱신 + 정리**: KA·KQ의 hash와 refreshedAt을 갱신. backlog 레포에 커밋. **dispatch 산출물(`kq-update-quiz.md` + `-result.md`, `candidates-<SHA>.json`)은 회차 종료 시점에 `git rm`으로 모두 삭제** — 다음 회차로 누적 금지. 회차 시작 시점에 `refresh-projects/dispatch/` 디렉토리가 비어 있어야 한다 (남아 있으면 직전 회차 정리 누락이므로 먼저 정리).

##### 규칙 변경 감지

Deploy 스킬·스크립트(`scripts/list-candidates.mts`, `scripts/parse-knowledge.mts`) 자체가 변경된 회차에서는, dry-run 단계에서 사용자에게 보고하여 scope를 "전체 재생성"으로 확장할지 결정한다.

### state.json 업데이트

Phase 3~4까지 완료된 프로젝트의 `hash`와 `refreshedAt`을 **그 회차가 실제 처리한 SHA**로 갱신하고, backlog 레포에 커밋한다. 처리 SHA란 Maintain 검증을 돌린 시점, Deploy는 `KA_DEPLOY_SHA`(잠금 SHA)다. **세션 중 잠금 이후 새 커밋이 쌓였으면 최신 HEAD가 아니라 처리 SHA를 기록한다** — 그 추가분이 다음 회차 범위(`<hash>..HEAD`)에 남아 처리되도록. Maintain 스킬이 없어 잠금이 없는 프로젝트(MP 등)는 최신 커밋으로 자동 전진한다.

## 백로그 정비

누적된 백로그를 순회하며 비대해진 파일·디렉토리를 쪼개고, 흩어진 중복을 통합하고, 오배치된 항목을 옮기는 정비. 새 입력 없이 기존 파일만 대상으로 한다. 사용자 판정 없이 AI 판단으로 적용하고 커밋한다 (git 이력에 남으므로 되돌릴 수 있다).

diff 기반 Phase와 별개로 **매 회차 무조건 수행한다** — Phase 1에서 변경 프로젝트가 없어 diff 흐름을 건너뛰어도 이 정비는 돈다. 백로그엔 "지난 회차 이후 무엇이 쌓였나"를 추적하는 증분 장치가 없으므로, 증분 감지 없이 매번 전수로 훑는다.

분류·파일명·배치·중복 규칙은 `/backlog`이 소유한다 — 이 정비는 그 규칙을 적용만 한다.

### 대상

`projects/`(단, AC 자기수정 트래커 `projects/ai-contexts/`는 제외)를 대상으로 한다 — 누적되며 게이트가 없는 비-트래커 영역이다.

- `projects/ai-contexts/` 제외: Ready 게이트·상태 라벨이 달린 AC 자기수정 트래커라, 구조를 AI가 임의로 바꾸면 우선순위·실행 순서가 깨진다.
- `articles/` 제외: 발행 단위(slug)로 사용자가 큐레이션하는 재료라, 임의 분리가 글 구성을 흩뜨린다.

### 현황파악

정비 전에 대상 디렉토리(`projects/`)를 훑어 비대한 파일·흩어진 중복·오배치 후보와 분량 분포를 파악한다. 이 현황으로 이번 회차 정비 범위를 정하고, 사용자에게 요약 보고한 뒤 정비에 들어간다.

### 정비 작업

각 작업은 `/backlog`의 분류 규칙(「영역 분류」·「파일명 규칙」·「배치 판단」·중복 규칙)을 재사용한다.

- **파일 분리** — 한 파일이 서로 독립적인 여러 subtopic·주제를 담아 비대해졌으면 「파일명 규칙」에 따라 단위별 파일로 쪼갠다. 분량의 절대 기준을 두지 않고, 한 파일이 단일 주제로 읽히는지로 판단한다.
- **디렉토리 구조화** — 한 디렉토리에 파일이 쌓여 탐색이 어려우면 결이 가까운 것끼리 하위 그룹으로 묶거나 subtopic 단위로 정돈한다.
- **중복 통합** — 같거나 겹치는 내용이 여러 파일에 흩어져 있으면 「배치 판단」으로 통합 위치를 정해 한 곳에 모으고 나머지에서 제거한다.
- **오배치 이동** — 「영역 분류」 기준에 어긋나게 놓인 항목을 올바른 영역·파일로 옮긴다 (예: KA 지식 메모가 엉뚱한 레포 디렉토리에 있으면 `projects/knowledge-archive/`로).

### 마무리

- AC 트래커(`projects/ai-contexts/active/`)에는 인덱스 파일을 두지 않는다 — tier 현황은 갱신할 목차가 없다. `projects/{topic}/index.md`는 References 전용이라 파일 구성이 바뀌어도 갱신하지 않는다 (item 목차 아님).
- backlog 레포에서 수행하고 커밋한다 (`/backlog`의 「레포 구조」).
- 정비 후 `/backlog`의 「보고」 형식으로 분리·통합·이동·삭제 내역을 사용자에게 보고한다.

## 백로그 반영 sweep

각 백로그 항목이 이미 대상 프로젝트에 반영됐는지 매 회차 전수 대조해, 반영된 것으로 판정된 항목을 사용자 승인 후 삭제하는 점검. 다른 세션·기기에서 이미 처리됐지만 파일만 안 지워진 stale 항목을 걸러낸다.

diff 기반 Phase와 별개로 **매 회차 무조건 수행한다** — 「백로그 정비」와 마찬가지로 백로그엔 증분 장치가 없어 매번 전수로 훑는다. 파일을 읽어 대조만 하는 read-only 점검이라 파일 구조를 바꾸지 않는다.

### 대상

`projects/` 전체를 대상으로 한다. **AC 자기수정 트래커 `projects/ai-contexts/active/`도 포함한다** — 「백로그 정비」는 우선순위·실행 순서 보호를 위해 이 트래커를 제외하지만, 이 sweep은 구조를 바꾸지 않는 read-only 대조라 포함해도 안전하다. exec로 자기수정하며 파일이 자주 완료되는 트래커야말로 반영 점검이 가장 필요한 곳이다.

### 대조

각 항목의 반영 여부는 `/backlog` 「실행 모드」의 "반영 여부 선확인"으로 판정한다 — frontmatter `target` 경로(없으면 본문이 지목하는 경로)를 읽고, 그 항목이 요구하는 변경이 이미 반영돼 있는지 대조한다. 그 로직은 개별 항목을 실행하는 시점에 그 항목 하나만 보지만, 이 sweep은 같은 판정을 `projects/` 전체에 매 회차 적용한다.

### 마무리

- 반영됐다고 판정한 항목은 **자동 삭제하지 않는다**. 목록을 사용자에게 "이미 반영된 듯 — 삭제할까요?"로 보고하고 승인받은 것만 삭제한다. 오탐 시 멀쩡한 백로그가 소실되기 때문이다.
- 삭제는 backlog 레포 커밋으로 마감한다 (post-commit이 origin으로 자동 push).

## 커밋 단위

회차 history가 잘게 쪼개지지 않게, 각 프로젝트·Phase 산출 커밋을 종류별로 한 커밋으로 묶는다.

- Phase 3 Maintain: 한 프로젝트의 검증·수정 전체를 그 프로젝트에서 한 커밋으로 합친다 (예: KA validate 전체 = KA 1커밋). 작업 중 여러 번 커밋했으면 마지막에 squash로 합친다. 단 종류가 명확히 다르면 그 종류끼리만 분리한다.
- Phase 4-readme: 갱신한 README가 여러 건이면 한 커밋으로 묶는다.
- 종류가 다른 작업(Maintain 수정 vs README vs Deploy 산출물·state.json)은 같은 커밋에 섞지 않는다.

## 대규모 작업 위임

팀/서브에이전트로 위임된 작업자는 다시 새 작업자를 만들 수 없거나 런타임별 제약으로 병렬화가 막힐 수 있다. 대량 파일 변환·생성 작업은 현재 세션의 하위 작업자에게 몰아넣지 말고, 아래 dispatch 플로우로 새 메인 세션에 넘긴다.

### dispatch 워크트리 분리

dispatch 위임 작업은 메인 워크트리에서 직접 수행하지 않는다. 사용자가 메인 워크트리에서 병행 작업할 수 있고, 메인의 modified·untracked 파일과 작업 커밋이 섞일 위험이 있다. dispatch md에 다음을 박아 새 세션이 별도 워크트리에서 작업하도록 강제한다.

- 워크트리 경로: 메인 repo 옆에 `<repo>-<task>` 형태 (예: `ai-contexts-readme`)
- base: `origin/<base-branch>` (메인 repo의 로컬 미반영 커밋 회피 — `git fetch origin <base>` 선행)
- 생성 명령: `git worktree add <path> origin/<base>` (모든 프로젝트 공통)
  - AC는 생성 직후 self-heal hook이 새 워크트리에 의존성을 자동 설치한다(훅 발동은 추적되는 `.githooks`가 보장) (AC [meta/deploy-conventions.md](../../../meta/deploy-conventions.md) 「AC worktree hook 준비」 참조)
- 작업·커밋·푸시는 새 워크트리에서 수행. `-result.md`는 원본 위치(`<backlog>/refresh-projects/dispatch/`, `<backlog>`=`~/WebstormProjects/main/backlog`)에 작성

작업 종료 후 워크트리 정리는 회차 마감 후 사용자가 결정 (삭제 또는 유지).

### 위임 플로우

1. **지시 프롬프트 작성**: 메인 에이전트(현재 세션)가 `refresh-projects/dispatch/<project>.md`에 작업 지시를 작성한다. 포함 항목: 워크트리 분리 절차(위 「dispatch 워크트리 분리」 참조), 대상 프로젝트, 해시 범위, 해당 프로젝트 스킬 경로, 대상 파일 목록, 반영 규칙, 커밋 정책.
2. **사용자 안내**: 다음 형식으로 전달한다.
   > 다음 md를 새 AI 작업 세션(Claude Code 또는 Codex)에 복사해 실행해 주세요. 새 세션은 메인 에이전트이므로 현재 런타임의 `team-agent` 규칙에 따라 병렬 위임이 가능하면 사용하고, 불가능하면 순차 실행 후 제한 사항을 결과에 기록합니다. 완료 후 `-result.md` 경로를 알려주시면 이어서 진행합니다.
   > 경로: `refresh-projects/dispatch/<project>.md`
3. **새 세션 실행**: 사용자가 연 세션의 메인 에이전트가 지시대로 실행하고, 결과를 `refresh-projects/dispatch/<project>-result.md`에 기록한다.
4. **결과 통합**: 현재 세션에서 결과 md를 읽고 state.json 갱신 등 마무리를 수행한다.
5. **dispatch md 정리**: 마무리 후 `refresh-projects/dispatch/` 하위 지시·결과 md는 삭제한다.

소규모 작업(단일 파일 수정, Maintain 일부)은 기존대로 팀 에이전트 유지. **단 Phase 4(Readme·KQ Deploy)는 규모와 무관하게 항상 병렬 dispatch 위임** (위 Phase 4 참조).

## 프로젝트별 스킬 정의

### KQ: update-quiz

Phase 4-kq가 발행한 dispatch md를 새 세션에서 실행한다. dispatch에 박힌 candidates JSON 경로로 `npm run parse -- --candidates <path>` 호출. `generated/<slug>.json` + `topics.json` 갱신. 자체 KA 발견·필터링 금지 (받은 셋만 변환).

## 범위

- **포함**: 커밋 탐색, Maintain/Readme/Deploy 실행, state.json 관리
- **제외**: 스킬이 수정하지 못한 항목 (사용자가 직접 해결)
