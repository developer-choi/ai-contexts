---
name: bench
description: 스킬·규칙을 실제로 여러 번 돌려 효과를 측정한다. 스킬이 설계대로 도는지, description이 제대로 트리거되는지, 규칙 문장을 넣고 뺀 효과, 팀원 위임을 확인한다. "벤치 돌려줘", "이 규칙 넣은 효과 있어?", "이 스킬 트리거되는지 확인해 줘" 같은 요청이나 스킬·규칙을 고친 뒤 효과를 확인할 때 사용한다. Gemini와 Claude를 비교하는 벤치는 대상이 아니다.
---

# 벤치·eval

## 목적

벤치·eval을 돌려 스킬·규칙의 효과를 검증한다.

## 무엇을 확인하러 왔나

| 확인할 것 | 읽는 파일 |
|---|---|
| 스킬이 설계대로 도는가(기능테스트) | [kinds/function-test.md](kinds/function-test.md) |
| description이 정확히 트리거되는가 | [kinds/trigger-eval.md](kinds/trigger-eval.md) |
| 규칙 문장을 넣고 뺀 효과 | [kinds/rule-ablation.md](kinds/rule-ablation.md) |
| 이름 있는 팀원을 띄우는 스킬 | [kinds/delegation.md](kinds/delegation.md) |
| 벤치 산출물 정리, 스킬이 문서를 실제로 읽었는지 확인 | [operations.md](operations.md) |

**`scripts/`의 `.mjs`는 소스를 읽지 않고 실행한다.** 명령·인자는 같은 폴더의 같은 이름 `.md`를 본다(예: [scripts/bench-ablation.md](scripts/bench-ablation.md)).

## 재벤치: 언제 다시 돌리고 언제 멈추나

문서를 고쳐 다시 잴 때, 아래 중 하나에 닿으면 멈춘다. 고치기 전 측정은 회차로 세지 않고, 첫 수정 뒤 측정이 1회차다. 성과는 직전 측정보다 잔류가 뚜렷이 줄었는가로 본다. 같은 문서로 돌려도 LLM 결과는 조금씩 오르내리므로, 그 정도 차이는 성과로 보지 않는다. 실행 실패로 보류가 찍힌 회차는 그 run을 다시 재서 채운 뒤 판정한다.

- 2회 연속 뚜렷한 성과가 없다. 중간에 성과가 한 번 나면 연속은 처음부터 다시 센다.
- 고치고 다시 잰 회차가 5회에 닿았다. 성과와 상관없다.

## 모델

벤치에 쓸 모델은 리뷰 대상의 특성을 파악한 뒤 정한다.
