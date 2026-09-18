---
name: scw
description: 스킬·규칙·프롬프트 문서를 기준에 맞춰 만들고 고치고 줄이며, 규칙 문장을 넣고 뺀 효과를 벤치(ablation·트리거·위임 구조)로 잰다. 스킬 뼈대와 스킬 eval의 틀(시험 프롬프트·baseline 비교·채점)은 skill-creator에 맡기고 이 스킬은 그 위에 기준과 문장 단위 검증을 얹는다.
argument-hint: "[대상 파일/디렉토리 경로 또는 스킬 설명]"
---

# 스킬·규칙 문서 기준과 검증

## 목적

스킬·규칙 문서를 좋은 기준에 맞춰 고치고, 작성된 대로 동작하는지와 문장마다 제값을 하는지 검증한다. 대상은 레포를 가리지 않는다.

## 왜 필요한가

프롬프트는 고칠수록 늘어난다 — 문장을 더하는 쪽은 효과가 있어 보이고 빼는 쪽은 근거를 대야 해서, 아무도 안 뺀다. 고치는 일과 잘 고쳐졌는지 따지는 일을 한자리에 묶어 그 자리에서 검증하게 한다.

새 스킬의 뼈대와 스킬 단위 eval은 skill-creator가 하지만, 그것은 스킬 전체를 옛 판·스킬 없는 판과 비교할 뿐 문장 하나를 뺐을 때 무엇이 달라지는지는 재지 않는다. skill-creator를 같이 실었으면, 그 권고가 이 스킬이나 이 스킬이 부르는 기준 파일과 다를 때 이쪽을 따른다.

## 이번 회차가 무엇을 하러 왔는가

무엇을 하러 왔는지로 읽을 것이 갈린다. 해당하는 것만 읽는다.

| 이번 회차 | 읽는다 |
|---|---|
| 없던 스킬을 새로 만든다 | [rounds/creating.md](rounds/creating.md) + [rounds/editing.md](rounds/editing.md) |
| 기존 문서에 규칙을 넣거나 빼거나 고쳐 쓴다 | [rounds/editing.md](rounds/editing.md) |
| 의심 지점을 훑어 개선한다 | [rounds/reviewing.md](rounds/reviewing.md) + [rounds/editing.md](rounds/editing.md) |
| 벤치·eval을 돌려 규칙의 효과를 잰다 | [benching/SKILL.md](benching/SKILL.md) |

## 문서 무게

[본문에 무엇을 남기나](../../contexts/prompt-standards/what-to-keep.md)로 대상 문서를 한 줄씩 훑어 줄 단위 후보도 모은다.

프롬프트·스킬 md를 고치러 들어오면 손대기 전에 `node ~/.ai-contexts/check-md-size.mjs --report <대상 md>`로 대상 문서의 바이트 크기와 그 문서를 여는 다른 md를 잰다. 이 명령은 그 레포 안에서 여는 곳만 세므로, 레포 밖에서 여는 곳은 따로 찾아 더한다. 잰 값을 [파일·폴더 나누기](../../contexts/prompt-standards/file-layout.md)로 판정하고, 걸리면 [줄일 후보를 갈래 가리지 않고 전량 모아](rounds/diet.md#후보를-전량-모아-대가별로-낸다) 후보마다 크기와 잃는 것을 함께 적어 낸다. 무엇을 줄일지는 사용자가 고르고, 고른 것이 그 회차의 범위다.

고르기 전에 되묻지 않는다. 후보마다 얼마가 갈리는지 재본 뒤 그 결과와 권장안을 함께 낸다.

## 기준

프롬프트·스킬 md를 쓰거나 고치거나 훑을 때 아래 표대로 기준 파일을 불러 적용한다. 회차 문서에는 "이 기준을 읽어라" 줄을 두지 않는다.

| 조건 | 부르는 기준 |
|---|---|
| 대상 문서의 산문을 쓰거나 고치거나 훑을 때(조건 없음) | [본문에 무엇을 남기나](../../contexts/prompt-standards/what-to-keep.md) · [문장 다듬기](../../contexts/prompt-standards/wording.md) · [정본과 참조](../../contexts/prompt-standards/sources-and-links.md) · [rules-as-code.md](../../contexts/rules-as-code.md) |
| 고치기 회차: 대상 문서 크기가 선을 넘을 때. 훑기·다이어트 회차: 매번 | [파일·폴더 나누기](../../contexts/prompt-standards/file-layout.md) |
| 대상이 SKILL.md·흐름 라우터이거나 에이전트를 띄우는 구조일 때 | [스킬 짜임](../../contexts/prompt-standards/skill-structure.md) |
| 대상이 스킬이거나 스킬이 읽는 문서일 때 | [여러 CLI 호환](../../contexts/prompt-standards/cross-cli.md) |
| 대상 경로별 | 아래 [targets/ 파일](#targets-파일) |

- 크기 선은 AC `scripts/hooks/check-md-size.mjs` 상수(`LONE_LIMIT`·`BUSY_LIMIT`·`FANOUT`)가 정본이다. `--report <md>`가 등재와 무관하게 아무 git 레포에서 한 파일의 크기·선·닿는 곳을 내므로 등재 안 된 레포용 한 줄은 두지 않는다.
- 벤치 운영 문서([benching/](benching/SKILL.md))는 이 표를 부르지 않는다. `benching/SKILL.md`가 변형 문안을 쓸 때 이 표를 링크하고, 지우기 판정에는 [지울지 판정 순서](#지울지-판정-순서)를 링크한다.

### targets/ 파일

| 대상 경로 | 특화 파일 |
|-----------|-----------|
| `deploy/contexts/coding-standards/` | [coding-standards.md](targets/coding-standards.md) |
| `deploy/skills/workflow/` | [workflow.md](targets/workflow.md) |
| `deploy/skills/workflow/requirement-review/` | [requirement-review.md](targets/requirement-review.md) |
| `deploy/contexts/writing-guide/` | [writing-guide.md](targets/writing-guide.md) |

대상 경로에 `map.md`가 있으면 추가로 점검한다:
- **중복**: 하위 파일 간 같거나 비슷한 내용이 있는가

## 지울지 판정 순서

여섯 질문(지우면 행동이 달라지나 / 적용 범위가 좁아지나 / 위반이 통과되나 / 검사가 잡나 / AI가 못 하나 / 사람이 목록을 손으로 고치나)은 한 문장으로 합치지 않는다 — 지우는 문턱이 달라 합치면 아래 순서가 뒤집힌다. 합치는 것은 "위반이 통과되나"와 "검사가 잡나" 하나뿐이다.

1. 게이트 1·2 — 코드로 내릴 수 있나·값이 있나 ([rules-as-code.md](../../contexts/rules-as-code.md))
2. 정본이 코드인가 md인가 — "이 목록을 사람이 손으로 고치나" ([rules-as-code.md](../../contexts/rules-as-code.md)). md가 정본이면(예: 훅 `check-md-rule-example.mjs`가 `what-to-keep.md`에서 목록을 읽음) 3의 코드 질문으로 산문을 지우지 않는다
3. **사실로 답하는 질문** — 코드가 이미 막나([rules-as-code.md](../../contexts/rules-as-code.md)) / 다른 곳에 같은 것이 있고 거기 닿나 / 아무도 안 부르나([정본과 참조](../../contexts/prompt-standards/sources-and-links.md)). 예이면 AI가 지우고 머지 전 diff로
4. **예측으로 답하는 질문** — 지우면 결과가 나빠지나([editing.md](rounds/editing.md#how-최소화-원칙) "이걸 빼면 AI가 못 하는가"의 일반형). 근거·예시에는 "지우면 적용 범위가 좁아지나"([본문에 무엇을 남기나](../../contexts/prompt-standards/what-to-keep.md)). 벤치 D 판정이면 AI가 지우고 diff로, 측정 없이 판단만 남으면 지우기 전에 사용자에게

이 순서는 지울지를 가르는 질문에만 걸린다. 어디 둘지·어떻게 가를지의 판정 질문은 기준 파일마다 따로 둔다.

### 권한 — 누가 지우나

정본은 이 절이다(AC `refresh-prompts` 스킬의 「사용자 승인 자리」 모델을 따른다).

- **AI가 지우고 커밋, 사용자는 머지 전 diff로 확인**: 위 3단계에서 예로 답한 삭제(외부 사실로 확인되는 것 — 링크만이 아니라 파일 이름·절 이름·훅과 스크립트 본문까지 찾아서 아무도 안 부르는지 확인, 다른 곳에 그대로 있는지 확인, 도구가 실제로 막는지 돌려서 확인) + 벤치 D 판정으로 나온 문장 제거
- **지우기 전에 사용자에게 먼저**: 모순 중 어느 쪽을 지울지, 측정 없이 판단만 남는 제거([editing.md 「how 최소화 원칙」](rounds/editing.md#how-최소화-원칙)의 즉석 리뷰 구간), 파일·절을 통째로 지우는 것
