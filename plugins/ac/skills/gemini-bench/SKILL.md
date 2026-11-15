---
name: gemini-bench
description: 같은 과제를 Gemini와 Claude에 실행해, 그 작업을 Gemini에 넘겨도 되는지 판단하는 벤치를 설계·실행·측정·채점하고 기록한다. Gemini 비교 벤치를 돌릴 때 사용.
---

# gemini-bench: Gemini 비교 벤치

## 목적

Claude 사용 한도를 절약하려고, 어떤 작업을 Gemini에 넘겨도 되는지 같은 과제를 양쪽에 실행해 판단한다.

## 흐름

지난 벤치의 기록(무엇을 측정했고 무엇이 나왔는지)은 backlog 레포(`~/WebstormProjects/main/backlog`)의 `archives/research/gemini-bench/`(이하 벤치 기록 폴더)에 있다.

단계마다 그 단계에 들어갈 때 해당 파일을 Read하고 그대로 따른다.

| 단계 | 읽을 것 |
|---|---|
| 설계 | [steps/design.md](steps/design.md) |
| 실행 | [steps/run.md](steps/run.md) |
| 측정 | [steps/measure.md](steps/measure.md) |
| 채점 | [steps/grade.md](steps/grade.md) |
| 기록 | backlog 레포 벤치 기록 폴더의 `overview.md` "이어 적는 법" |

**`scripts/`의 `.mjs`는 소스를 읽지 않고 실행한다.** 명령·인자는 같은 폴더의 같은 이름 `.md`를 본다.
