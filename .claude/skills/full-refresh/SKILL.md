---
name: full-refresh
description: 등록된 프로젝트의 커밋 이력을 추적하여 Maintain(내부 정비) → Readme(대표 창구 갱신) → Deploy(파생 산출물 배포) 순으로 최신화한다. 레포지토리 점검, 주간 리뷰, 전체 프로젝트 최신화 요청 시 사용.
---

# Full Refresh

프로젝트별 커밋 이력을 state.json에 기록하여 "여기까지 최신화했다"를 추적한다. 다음 실행은 그 해시 이후 범위만 자동으로 처리한다.

## 프로젝트 레지스트리

| 약어 | 경로 | Phase 3: Maintain | Phase 5: Deploy |
|------|------|-------------------|-----------------|
| KA | `~/WebstormProjects/main/knowledge-archive` | validate (`.claude/skills/validate/SKILL.md`) | — |
| AC | `~/WebstormProjects/main/ai-contexts` | scw-refresh (하단 참조) | — |
| MP | `~/WebstormProjects/main/monorepo-playground` | — | — |
| KQ | `~/WebstormProjects/my-else/knowledge-quiz` | — | update-quiz (하단 참조) |
| Blog | `~/WebstormProjects/my-else/blog` | — | update-blog (하단 참조) |

## state.json

진행 상태는 `plan/full-refresh/state.json`에 기록한다.

형식:

```json
{
  "KA": { "hash": "<커밋 SHA>", "refreshedAt": "<ISO 8601>" }
}
```

- `hash`는 "여기까지 최신화 완료" 의미. 다음 실행은 `<hash>..HEAD` 범위(exclusive)만 다룬다.
- `refreshedAt`은 마지막 갱신 시각.
- Maintain 스킬이 없는 프로젝트(MP 등)도 엔트리를 유지하며, 매 실행마다 최신 커밋으로 자동 전진한다. 스킬이 생기는 시점부터 실제 최신화가 시작된다.

커밋 관리: `plan/` 하위이므로 AC **백로그 브랜치**에만 커밋한다 (master 금지). 여러 회차의 업데이트는 squash로 합친다.

## 실행 흐름

[CRITICAL] [team-agent](../../../deploy/contexts/team-agent.md)의 규칙을 따른다.

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
  - Deploy 원천(KA): 파생 프로젝트(Blog/KQ) 중 최근 "KA 변환" 커밋 시점 기준, 그 시점 직전의 원천 HEAD
  - Deploy 자체(Blog/KQ): 자체 최근 변환 커밋 SHA
  - 역할 불명확·스킬 완전 없음: 현재 HEAD

Orphan 유효성 체크:

```bash
git cat-file -e <hash> && git merge-base --is-ancestor <hash> HEAD
```

둘 다 통과해야 유효.

변경 있는 프로젝트가 하나도 없으면 종료한다.

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

`<저장된 해시>..HEAD` 범위의 모든 변경 파일을 기반으로 (Phase 3 팀 에이전트 수정 + 사용자 직접 커밋 포함), 각 파일의 상위 경로에 README.md가 있는지 탐색한다. 해당 README가 하위 변경을 반영하고 있는지 확인하고, 반영되지 않았으면 `/write-init`(사용자와 소통해 내용 채움) → `/write-refine`(톤·구조·분량 다듬기) 순으로 최신화한다.

### Phase 5: Deploy — 파생 산출물 배포

KA 기반 변환이므로 Phase 3의 KA Maintain 완료 후 실행한다. KQ와 Blog는 같은 KA HEAD + 같은 후보 셋으로 변환한다.

#### 핵심 원칙

- **본 세션에서 직접 실행 금지**. Phase 5는 항상 dispatch 위임. 가벼운 KQ도 예외 없음
- **KQ와 Blog는 같은 `KA_DEPLOY_SHA` + 같은 candidates 셋으로만 변환**. 자체 KA 파일 발견·필터링 금지

#### 흐름

1. **KA HEAD 잠금**: 현재 KA HEAD를 캡처. 이 SHA를 `KA_DEPLOY_SHA`로 기억하고 Phase 5 전체에서 동일 값을 사용. 이후 KA가 변동해도 본 회차는 잠금 SHA 기준.

2. **후보 리스트업**: KA에서 `KA_DEPLOY_SHA` 시점의 후보를 산출.
   ```bash
   cd <KA 경로>
   KA_HEAD=<KA_DEPLOY_SHA> npm run list-candidates -- \
     --out plan/full-refresh/dispatch/candidates-<KA_DEPLOY_SHA>.json
   ```
   결과 JSON을 dispatch 디렉토리에 저장.

3. **dry-run 보고**: 후보 리스트를 사용자에게 그룹화하여 제출.
   - **NEW** (Blog에 없음 — 첫 변환 대상)
   - **CHANGED** (`lastCommitDate`가 직전 회차 `state.json.Blog.refreshedAt` 이후)
   - **UNCHANGED** (변경 없음, 재변환 불필요)
   - **SKIPPED** (선정 기준 미달 — `skipped.reason`별로 분리)
   - 출처별 추가 분리: `official` / `google-doc` / `unverified` / 미상

4. **사용자 confirm**: 사용자가 변환할 항목 결정. confirm된 셋을 candidates JSON에서 필터링하여 KQ/Blog용 dispatch에 박는다.

5. **dispatch 동시 발행**: 두 md를 작성한다.
   - `plan/full-refresh/dispatch/kq-update-quiz.md` — `KA_DEPLOY_SHA` + candidates 경로 명시
   - `plan/full-refresh/dispatch/blog-update-blog.md` — 동일

   각 dispatch md에는 다음을 박는다:
   - 잠금 SHA (`KA_DEPLOY_SHA`)
   - 필터링된 candidates JSON 경로 (절대 경로)
   - 실행 명령 예시 (`npm run parse -- --candidates <path>`, `npm run enrich:sync -- --candidates <path>`)
   - 결과 md 작성 경로 (`<dispatch>-result.md`)

6. **결과 수신**: 사용자가 두 md를 새 세션에서 실행하고 `-result.md`를 도착시킨다. 양쪽 모두 도착하면 마무리. 어느 한쪽 누락 시 보고 + 대기.

7. **state.json 갱신 + 정리**: KA·KQ·Blog의 hash와 refreshedAt을 갱신. AC backlog 브랜치에 커밋. **dispatch 산출물(`kq-update-quiz.md` + `-result.md`, `blog-update-blog.md` + `-result.md`, `candidates-<SHA>.json`)은 회차 종료 시점에 `git rm`으로 모두 삭제** — 다음 회차로 누적 금지. 회차 시작 시점에 `plan/full-refresh/dispatch/` 디렉토리가 비어 있어야 한다 (남아 있으면 직전 회차 정리 누락이므로 먼저 정리).

#### 규칙 변경 감지

Deploy 스킬·스크립트(`scripts/list-candidates.mts`, `scripts/parse-knowledge.mts`, `scripts/sync-ka.mts`, Blog `CLAUDE.md`의 변환 규칙) 자체가 변경된 회차에서는, dry-run 단계에서 사용자에게 보고하여 scope를 "전체 재생성"으로 확장할지 결정한다.

### state.json 업데이트

Phase 3~5까지 완료된 프로젝트의 `hash`와 `refreshedAt`을 최신 커밋으로 갱신하고, AC 백로그 브랜치에 커밋한다. 이전 회차 커밋들과 squash로 합친다. Maintain 스킬이 없는 프로젝트는 매 실행마다 자동으로 최신 커밋 갱신.

## 대규모 작업 위임

팀/서브에이전트로 위임된 작업자는 다시 새 작업자를 만들 수 없거나 런타임별 제약으로 병렬화가 막힐 수 있다. 대량 파일 변환·생성 작업은 현재 세션의 하위 작업자에게 몰아넣지 말고, 아래 dispatch 플로우로 새 메인 세션에 넘긴다.

### 대규모 판정 기준

Phase 3/5 대상 파일이 많거나 Blog Deploy처럼 한 세션에서 수행 시 현저히 느려질 변환 작업.

### 위임 플로우

1. **지시 프롬프트 작성**: 메인 에이전트(현재 세션)가 `plan/full-refresh/dispatch/<project>.md`에 작업 지시를 작성한다. 포함 항목: 대상 프로젝트, 해시 범위, 해당 프로젝트 스킬 경로, 대상 파일 목록, 반영 규칙, 커밋 정책.
2. **사용자 안내**: 다음 형식으로 전달한다.
   > 다음 md를 새 AI 작업 세션(Claude Code 또는 Codex)에 복사해 실행해 주세요. 새 세션은 메인 에이전트이므로 현재 런타임의 `team-agent` 규칙에 따라 병렬 위임이 가능하면 사용하고, 불가능하면 순차 실행 후 제한 사항을 결과에 기록합니다. 완료 후 `-result.md` 경로를 알려주시면 이어서 진행합니다.
   > 경로: `plan/full-refresh/dispatch/<project>.md`
3. **새 세션 실행**: 사용자가 연 세션의 메인 에이전트가 지시대로 실행하고, 결과를 `plan/full-refresh/dispatch/<project>-result.md`에 기록한다.
4. **결과 통합**: 현재 세션에서 결과 md를 읽고 state.json 갱신 등 마무리를 수행한다.
5. **dispatch md 정리**: 마무리 후 `plan/full-refresh/dispatch/` 하위 지시·결과 md는 삭제한다.

소규모 작업(단일 파일 수정, Maintain 일부)은 기존대로 팀 에이전트 유지. **단 Phase 5(Deploy)는 규모와 무관하게 항상 dispatch 위임** (위 Phase 5 핵심 원칙 참조).

## 프로젝트별 스킬 정의

### AC: scw-refresh

1. 커밋 diff에서 변경된 스킬을 식별한다
2. 변경된 부분이 잘 동작하는지 `/scw`로 검증한다
3. 이전 버전 대비 개선되었는지 eval한다

### KQ: update-quiz

Phase 5가 발행한 dispatch md를 새 세션에서 실행한다. dispatch에 박힌 candidates JSON 경로로 `npm run parse -- --candidates <path>` 호출. `generated/<slug>.json` + `topics.json` 갱신. 자체 KA 발견·필터링 금지 (받은 셋만 변환).

### Blog: update-blog

Phase 5가 발행한 dispatch md를 새 세션에서 실행한다. dispatch에 박힌 candidates JSON 경로로 `npm run enrich:sync -- --candidates <path>` 호출 → NEW skeleton 생성 + CHANGED `updated` 갱신 + ORPHAN 자동 삭제·마이그레이션. 한글은 `update-blog` 스킬 절차로 채운다 (Blog `CLAUDE.md`의 KA 변환 규칙). 자체 KA 발견·필터링 금지.

## 범위

- **포함**: 커밋 탐색, Maintain/Readme/Deploy 실행, state.json 관리
- **제외**: 스킬이 수정하지 못한 항목 (사용자가 직접 해결)
