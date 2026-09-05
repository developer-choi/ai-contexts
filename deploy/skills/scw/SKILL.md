---
name: scw
description: 이미 있는 스킬을 개선(통합·분리·재구조화·마이그레이션 포함)하고, 프롬프트·스킬 문서를 검증·점검한다. 책임 분리(SRP)·트리거 eval·룰 ablation 벤치를 포함한다. 명시적으로 호출할 때 사용.
argument-hint: "[대상 파일/디렉토리 경로 또는 스킬 설명]"
---

# Skill Creator & Prompt Auditor

## 목적

이미 있는 스킬·프롬프트 문서를 잘 고친다.

## 왜 필요한가

프롬프트는 고칠수록 늘어난다 — 문장을 더하는 쪽은 효과가 있어 보이고 빼는 쪽은 근거를 대야 해서, 아무도 안 뺀다. 고치는 일과 잘 고쳐졌는지 따지는 일을 한자리에 묶어 그 자리에서 검증하게 한다.

## 이번 회차가 무엇을 하러 왔는가

무엇을 하러 왔는지로 읽을 것이 갈린다. 해당하는 것만 읽는다.

| 이번 회차 | 읽는다 |
|---|---|
| 없던 스킬을 새로 만든다 | [rounds/creating.md](rounds/creating.md) + [rounds/editing.md](rounds/editing.md) |
| 기존 문서에 규칙을 넣거나 빼거나 고쳐 쓴다 | [rounds/editing.md](rounds/editing.md) |
| 의심 지점을 훑어 개선한다 | [rounds/reviewing.md](rounds/reviewing.md) + [rounds/editing.md](rounds/editing.md) |
| 벤치·eval을 돌려 규칙의 효과를 잰다 | [rounds/benching.md](rounds/benching.md) |

## 문서 무게

프롬프트·스킬 md를 고치러 들어오면 손대기 전에 대상 문서의 바이트 크기와, 그 문서를 링크나 지시로 여는 다른 md의 수를 잰다. 잰 값을 [document-diet.md](specialized/document-diet.md)로 판정하고, 걸리면 줄일 수단까지 골라 제안한다.

무게를 재고도 어느 축으로 나눌지를 사용자에게 되묻지 않는다. 축 후보마다 얼마가 갈리는지 재본 뒤 그 결과와 권장안을 낸다. 사용자가 먼저 축을 제안한 경우도 같다 — 그 축으로 얼마가 갈리는지 재고 나서 시작한다.

## 특화 리뷰

프롬프트·스킬 md를 만들거나 고치는 작업이면 레포·경로와 무관하게 항상 [lean-prompt.md](specialized/lean-prompt.md)를 읽고 적용한다 — 아래 표와 달리 조건이 없다. 새로 쓰는 산문에도 적용되며, 리뷰 때만 보는 것이 아니다.

대상이 SKILL.md거나 스킬이 읽는 문서면 [cross-cli.md](specialized/cross-cli.md)도 같이 적용한다. 스킬은 여러 CLI로 함께 배포되는데 한쪽에서만 도는 표현은 에러 없이 무시되므로, 쓰는 시점에 걸러야 한다.

그에 더해, 대상이 아래 경로에 해당하면 해당 파일을 읽고 추가 관점으로 적용한다.

| 대상 경로 | 특화 파일 |
|-----------|-----------|
| `deploy/contexts/coding-standards/` | [coding-standards.md](specialized/coding-standards.md) |
| `deploy/skills/workflow/` | [workflow.md](specialized/workflow.md) |
| `deploy/skills/workflow/requirement-review/` | [requirement-review.md](specialized/requirement-review.md) |
| `deploy/contexts/writing-guide/` | [writing-guide.md](specialized/writing-guide.md) |
| `deploy/rules/`, 그 외 지침·규칙 나열 문서 (ablation 벤치) | [rule-ablation-bench.md](specialized/rule-ablation-bench.md) |
| `SKILL.md` 또는 sub-skill 라우터 파일 | [skill-orchestration.md](specialized/skill-orchestration.md) |

대상 경로에 `map.md`가 있으면 추가로 점검한다:
- **중복**: 하위 파일 간 같거나 비슷한 내용이 있는가
