---
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

### Phase 0: 동기화

각 레지스트리 프로젝트에서 `git -C <경로> pull --ff-only`로 원격 최신 상태를 받아온다. ff 불가(divergence) 또는 uncommitted 변경이 있으면 사용자에게 보고하고 중단한다.

### Phase 1: 커밋 탐색

state.json을 로드하고 각 프로젝트별로 `<저장된 해시>..HEAD` 범위를 조회한다.

프로젝트별 처리:
- **해시 유효 + 변경 있음**: `git log --first-parent <hash>..HEAD --oneline`으로 커밋 목록 표시
- **HEAD == 해시**: "변경 없음" 표시, Phase 3~5 스킵
- **Orphan 해시** (rebase/force-push로 해시가 현재 브랜치에 없음): 서브에이전트에게 "직전 최신화 지점"을 재탐색시켜 해시를 복구한 뒤 진행
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

레지스트리의 Phase 3 스킬이 등록된 프로젝트별로 서브에이전트를 위임한다. 각 스킬이 최신화 작업을 수행하고 커밋한다.

서브에이전트 지시:
- 대상 프로젝트의 스킬 파일(SKILL.md)을 읽고, 기술된 대로 실행하라
- 대상 파일 목록: `<저장된 해시>..HEAD` diff에서 추출
- **규칙 변경 감지**: diff 범위에 본 스킬의 SKILL.md 또는 참조 contexts가 포함되어 있으면, scope를 "프로젝트 전체 파일"로 확장하라 (규칙이 바뀌었으므로 기존 최신화 결과를 신뢰할 수 없음)
- 수정 후 커밋까지 완료하라

### Phase 4: Readme — 대표 창구 갱신

`<저장된 해시>..HEAD` 범위의 모든 변경 파일을 기반으로 (Phase 3 서브에이전트 수정 + 사용자 직접 커밋 포함), 각 파일의 상위 경로에 README.md가 있는지 탐색한다. 해당 README가 하위 변경을 반영하고 있는지 확인하고, 반영되지 않았으면 `/write-init`(사용자와 소통해 내용 채움) → `/write-refine`(톤·구조·분량 다듬기) 순으로 최신화한다.

### Phase 5: Deploy — 파생 산출물 배포

레지스트리의 Phase 5 스킬이 등록된 프로젝트별로 서브에이전트를 위임한다. KA 기반 변환이므로 Phase 3의 KA Maintain 완료 후 실행한다.

서브에이전트 지시는 Phase 3과 동일한 원칙을 따른다. 특히 **규칙 변경 감지**: Deploy 스킬의 변환 규칙(예: Blog CLAUDE.md의 KA 변환 규칙, KQ parse 스크립트)이 변경되었으면 scope를 "전체 재생성"으로 확장한다.

### state.json 업데이트

Phase 3~5까지 완료된 프로젝트의 `hash`와 `refreshedAt`을 최신 커밋으로 갱신하고, AC 백로그 브랜치에 커밋한다. 이전 회차 커밋들과 squash로 합친다. Maintain 스킬이 없는 프로젝트는 매 실행마다 자동으로 최신 커밋 갱신.

## 프로젝트별 스킬 정의

### AC: scw-refresh

1. 커밋 diff에서 변경된 스킬을 식별한다
2. 변경된 부분이 잘 동작하는지 `/scw`로 검증한다
3. 이전 버전 대비 개선되었는지 eval한다

### KQ: update-quiz

`npm run parse`로 KA 원본 문서를 그대로 generated/ JSON으로 갱신한다.

### Blog: update-blog

KA 문서의 Official Answer(영어 팩트 나열)를 한글로 풀어써서 블로그 포스트로 변환한다. 블로그 CLAUDE.md의 KA 변환 규칙을 따른다.

## 범위

- **포함**: 커밋 탐색, Maintain/Readme/Deploy 실행, state.json 관리
- **제외**: 스킬이 수정하지 못한 항목 (사용자가 직접 해결)
