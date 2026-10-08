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

문서를 고치는 회차는 범위(지정한 부분 / 문서 전체)로 갈리고, 새 스킬은 만든 뒤 지정한 부분처럼 판정한다. 해당하는 것만 읽는다.

| 이번 회차 | 읽는다 |
|---|---|
| 없던 스킬을 새로 만든다 | [rounds/creating.md](rounds/creating.md) + [rounds/editing.md](rounds/editing.md) + [rounds/judging.md](rounds/judging.md) |
| 지정한 부분을 고친다 (규칙 넣기·빼기·고쳐 쓰기) | [rounds/editing.md](rounds/editing.md) + [rounds/judging.md](rounds/judging.md) |
| 문서 전체를 고친다 (다이어트·의심 지점 훑기) | [rounds/reviewing.md](rounds/reviewing.md) + [rounds/editing.md](rounds/editing.md) + [rounds/judging.md](rounds/judging.md) |
| 벤치·eval을 돌려 규칙의 효과를 잰다 | [benching/SKILL.md](benching/SKILL.md) |

### 흐름 문서면 회차 파일보다 먼저 위임 판정을 띄운다

대상에 흐름 문서(AI가 단계별로 일하는 절차 문서)가 있으면, 흐름 문서마다 일회성 서브에이전트를 백그라운드로 띄워 그 문서에서 AI가 하는 일을 메인에 둘지 떼어낼지 가르게 한다. 고치는 회차는 회차 파일을 읽기 전에, 새 스킬 회차는 흐름 문서를 쓴 뒤 판정 전에 띄운다. 벤치 회차는 띄우지 않는다. 범위와 무관하게 띄운다 — 바뀐 줄만 보면 원래부터 메인이 지던 일은 끝까지 안 걸린다. 서브에이전트는 읽기만 하므로 읽기 전용 리뷰에서도 띄운다.

넘기는 것은 흐름 문서 경로와 [rounds/delegation.md](rounds/delegation.md) 경로 둘뿐이다 — 이번 변경 범위·사용자가 준 관점·보고 형식은 넘기지 않는다. 리뷰할 것이 많은 회차일수록 메인이 직접 가르면 이 판정을 범위 밖이라며 건너뛰고, 판정에 필요한 명세도 안 연다.

돌려받은 표는 고치지 않고 보고 맨 앞에 둔다. 보고 형식을 따로 받았어도 그 앞에 둔다. 위임으로 갈린 줄은 보고의 지적으로도 낸다.

## 문서 무게

프롬프트·스킬 md를 고치러 들어오면 손대기 전에 `node ~/.ai-contexts/check-md-size.mjs --report <대상 md>`로 대상 문서의 바이트 크기와 그 문서를 여는 다른 md를 잰다. 이 명령은 그 레포 안에서 여는 곳만 세므로, 레포 밖에서 여는 곳은 따로 찾아 더한다. 잰 값을 [파일·폴더 나누기](../../contexts/prompt-standards/file-layout.md)로 판정하고, 걸리면 [무게를 줄이는 수단](rounds/weight.md)으로 줄일 길을 고른다.

고르기 전에 되묻지 않는다. 후보마다 얼마가 갈리는지 재본 뒤 그 결과와 권장안을 함께 낸다.

## 기준

프롬프트·스킬 md를 쓰거나 고치거나 훑을 때 아래 표대로 기준 파일을 불러 적용한다. 회차 문서에는 "이 기준을 읽어라" 줄을 두지 않는다.

문서 전체를 고치며 판정·검수 에이전트를 띄우면, 메인은 「문서 전체: 매번」이 적힌 행만 부르고 나머지 행은 에이전트가 부른다.

| 조건 | 부르는 기준 |
|---|---|
| 대상 문서의 산문을 쓰거나 고치거나 훑을 때 | [본문에 무엇을 남기나](../../contexts/prompt-standards/what-to-keep.md) · [문장 다듬기](../../contexts/prompt-standards/wording.md) · [정본과 참조](../../contexts/prompt-standards/sources-and-links.md) · [낡을 수 있는데 아무도 못 잡는 내용은 두지 않는다](../../contexts/rules-as-code.md#낡을-수-있는데-아무도-못-잡는-내용은-두지-않는다) |
| 대상 문서에 규칙·금지·절차 문장을 넣거나, 산문을 검사·스크립트로 옮길 때 | [코드로 표현 가능한 것은 코드로](../../contexts/rules-as-code.md) |
| 지정한 부분: 「문서 무게」 측정에서 걸릴 때. 문서 전체: 매번 | [파일·폴더 나누기](../../contexts/prompt-standards/file-layout.md) |
| 대상이 SKILL.md·흐름 라우터이거나 에이전트를 띄우는 구조일 때. 문서 전체: 매번 | [스킬 짜임](../../contexts/prompt-standards/skill-structure.md) |
| 대상이 스킬이거나 스킬이 읽는 문서일 때 | [여러 CLI 호환](../../contexts/prompt-standards/cross-cli.md) |
| 대상 경로별 | 아래 [targets/ 파일](#targets-파일) |

- 크기 선은 AC `scripts/hooks/check-md-size.mjs` 상수(`LONE_LIMIT`·`BUSY_LIMIT`·`FANOUT`)가 정본이다. `--report <md>`가 등재와 무관하게 아무 git 레포에서 한 파일의 크기·선·닿는 곳을 내므로 등재 안 된 레포용 한 줄은 두지 않는다.
- 벤치 운영 문서([benching/](benching/SKILL.md))는 이 표를 부르지 않는다. `benching/SKILL.md`가 변형 문안을 쓸 때 이 표를 링크한다.

### targets/ 파일

| 대상 경로 | 특화 파일 |
|-----------|-----------|
| `deploy/contexts/coding-standards/` | [coding-standards.md](targets/coding-standards.md) |
| `deploy/skills/workflow/` | [workflow.md](targets/workflow.md) |
| `deploy/skills/workflow/requirement-review/` | [requirement-review.md](targets/requirement-review.md) |
| `deploy/contexts/writing-guide/` | [writing-guide.md](targets/writing-guide.md) |

대상 경로에 `map.md`가 있으면 추가로 점검한다:
- **중복**: 하위 파일 간 같거나 비슷한 내용이 있는가
