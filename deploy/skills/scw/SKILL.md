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
- 벤치 운영 문서([benching/](benching/SKILL.md))는 이 표를 부르지 않는다. `benching/SKILL.md`가 변형 문안을 쓸 때 이 표를 링크하고, 지우기 판정에는 [의심 지점 분류](rounds/reviewing.md#2-2-tier-분류)를 링크한다.

### targets/ 파일

| 대상 경로 | 특화 파일 |
|-----------|-----------|
| `deploy/contexts/coding-standards/` | [coding-standards.md](targets/coding-standards.md) |
| `deploy/skills/workflow/` | [workflow.md](targets/workflow.md) |
| `deploy/skills/workflow/requirement-review/` | [requirement-review.md](targets/requirement-review.md) |
| `deploy/contexts/writing-guide/` | [writing-guide.md](targets/writing-guide.md) |

대상 경로에 `map.md`가 있으면 추가로 점검한다:
- **중복**: 하위 파일 간 같거나 비슷한 내용이 있는가
