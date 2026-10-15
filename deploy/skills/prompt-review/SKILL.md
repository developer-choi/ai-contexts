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

- 지적 목록: 위치(파일:줄), 무엇이 문제인지, 근거가 된 기준

## 절차

1. 크기를 잰다 — `node ~/.ai-contexts/check-md-size.mjs --report <대상 md>`. 이 명령은 그 레포 안에서 여는 곳만 세므로, 레포 밖에서 여는 곳은 따로 찾아 더한다. 잰 값은 파일·폴더 나누기를 맡은 리뷰어에게 넘긴다.
2. 리뷰어를 띄운다 — 기준이 많아 한 명이 다 들면 무겁고 한 종류 문제에 쏠리므로, 아래 기준을 나눠 맡긴다. 규칙에 없는 문제를 보는 자유 리뷰어를 한 명 더 둔다. 나누는 법은 [에이전트 나누기](../../contexts/prompt-standards/skill-structure.md#에이전트-설계)를 따른다. 리뷰어는 지적만 낸다.
3. 지적을 모아 사용자에게 낸다 — 사실로 증명된 것(죽은 참조·다른 곳에 그대로 있는 중복)은 바로 고치고, 그 밖은 잃는 것을 적어 사용자가 고르게 한다.
4. 반영한 뒤 다시 리뷰한다 — 지적이 0건이 될 때까지, 최대 5회.
5. 반영을 마친 뒤, 사람이 처음 읽어도 바로 이해되게 다듬는다.

## 기준

| 리뷰어가 맡는 기준 | 문서 |
|---|---|
| 필요한 것만 짧게 적었나 | [trimming.md](../../contexts/prompt-standards/trimming.md) |
| 정본과 참조 | [sources-and-links.md](../../contexts/prompt-standards/sources-and-links.md) |
| 코드로 옮길 수 있나 | [rules-as-code.md](../../contexts/rules-as-code.md) |
| 파일·폴더 나누기, 크기 | [file-layout.md](../../contexts/prompt-standards/file-layout.md) |
| 에이전트 나누기 (대상이 에이전트를 띄울 때) | [skill-structure.md](../../contexts/prompt-standards/skill-structure.md) |
| 여러 CLI 호환 (대상이 스킬일 때) | [cross-cli.md](../../contexts/prompt-standards/cross-cli.md) |
| workflow 특화 (대상이 workflow일 때) | [targets/workflow.md](targets/workflow.md) |

## 후속 작업

리뷰가 끝나면 아래 목록을 사용자에게 그대로 보여 주고 필요한지 묻는다.

- 고친 스킬이 실제로 잘 도는지 벤치로 본다 → [benching/SKILL.md](benching/SKILL.md)
- description이 제대로 트리거되는지 본다 → [benching/kinds/trigger-eval.md](benching/kinds/trigger-eval.md)
