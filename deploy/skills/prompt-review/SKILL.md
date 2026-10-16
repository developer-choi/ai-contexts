---
name: prompt-review
description: 스킬·규칙·프롬프트 문서가 기준에 맞는지 리뷰해 지적을 낸다. 대상 md를 고친 뒤나 리뷰를 청할 때 쓴다.
argument-hint: "[대상 파일/디렉토리 경로]"
---

# 프롬프트 문서 리뷰

## 목적

스킬·규칙·프롬프트 문서가 기준에 맞는지 리뷰해 지적을 낸다. 대상은 레포를 가리지 않는다.

## 입력

- 리뷰할 파일·폴더 경로

## 출력

```markdown
### 반영한 것

- {작성된 위치}: {무엇을 고쳤나}

### 미룬 것

- {작성된 위치}: {무엇을} → {어느 파일 차례로}

### 판단이 어려워 가져온 것

**{번호}. {작성된 위치}**
- Before: {지금 문장}
- After: {바꿀 문장}
- 문제: {지금 무엇이 문제인가}
- 장점: {고치면 좋아지는 것}
- 단점: {고치면 드는 비용·잃는 것}
- 추천: {넣는다/안 넣는다와 그 근거}
```

## 절차

1. 크기를 잰다 — `node ~/.ai-contexts/check-md-size.mjs --report <대상 md>`. 이 명령은 그 레포 안에서 여는 곳만 세므로, 레포 밖에서 여는 곳은 따로 찾아 더한다. 잰 값은 파일·폴더 나누기를 맡은 리뷰어에게 넘긴다.
2. 리뷰어를 띄운다 — 아래 표의 리뷰어마다 이름 있는 팀원을 하나씩 띄워([team-agent](../../contexts/team-agent.md#claude-code)) 그 리뷰어가 붙은 행의 기준을 맡긴다. 규칙에 없는 문제를 보는 자유 리뷰어 팀원을 하나 더 둔다. 모델은 [에이전트 나누기](../../contexts/prompt-standards/skill-structure.md#에이전트-설계)대로 제안한다.
3. 지적을 모아 [지적 판단](#지적-판단)대로 처리하고 [출력](#출력) 꼴로 낸다.
4. 반영하며 사람이 처음 읽어도 바로 이해되게 다듬은 뒤, 같은 팀원들에게 다시 리뷰를 맡긴다 — 지적이 0건이 될 때까지, 최대 5회.

## 지적 판단

지적은 기본으로 반영한다. 아래 유형에 해당하면 그 기준을 더 본다.

| 유형 | 더 볼 기준 |
|---|---|
| 문서끼리 어긋남 | 그 문서의 목적에 비춰 어느 쪽을 남길지 정해 맞춘다 |
| 엣지케이스 보완 | 그 문서가 쓰이는 상황에서 자주 날지, 드물어도 나면 치명적인지 본다. 목적만 알면 AI가 알아서 할 수 있으면 넣지 않는다 |
| 코드로 강제 | [rules-as-code](../../contexts/rules-as-code.md) 기준으로 손익을 따져 합리적이면 넣는다 |
| 다른 파일과 함께 고칠 것 | 그 파일도 이어서 다룰 예정이면 그 차례로 미룬다. 예정이 없으면 지금 함께 고친다 |

지적이 반영해도 되는 것인지 판단이 어려우면 사용자에게 가져온다.

## 기준

| 리뷰어 | 맡는 기준 | 문서 |
|---|---|---|
| BODY | 필요한 것만 짧게 적었나 | [trimming.md](../../contexts/prompt-standards/trimming.md) |
| BODY | 코드로 옮길 수 있나 | [rules-as-code.md](../../contexts/rules-as-code.md) |
| STRUCTURE | 정본과 참조 | [sources-and-links.md](../../contexts/prompt-standards/sources-and-links.md) |
| STRUCTURE | 파일·폴더 나누기, 크기 | [file-layout.md](../../contexts/prompt-standards/file-layout.md) |
| AGENT | 에이전트 나누기 (대상이 에이전트를 띄울 때) | [skill-structure.md](../../contexts/prompt-standards/skill-structure.md) |
| COMPAT | 여러 CLI 호환 (**사용자가 명시적으로 지시할 때만**) | [cross-cli.md](../../contexts/prompt-standards/cross-cli.md) |
| WORKFLOW | workflow 특화 (대상이 workflow일 때) | [targets/workflow.md](targets/workflow.md) |

## 후속 작업

리뷰가 끝나면 아래 목록을 사용자에게 그대로 보여 주고 필요한지 묻는다.

- 고친 스킬이 실제로 잘 도는지 벤치로 본다 → [benching/SKILL.md](benching/SKILL.md)
- description이 제대로 트리거되는지 본다 → [benching/kinds/trigger-eval.md](benching/kinds/trigger-eval.md)
