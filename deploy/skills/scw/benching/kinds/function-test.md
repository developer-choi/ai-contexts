# 기능테스트

스킬이 설계대로 동작하는가를 검증한다.

## 기능테스트

출력 품질이 아니라 오케스트레이션(분기, 순서, 에이전트 구성)이 대상이다.

### 정답은 위임한 문서까지 따라가 확정한다

벤치의 정답을 세울 때 스킬 본문에 적힌 요약을 그대로 쓰지 않는다. 그 요약이 원본과 어긋나 있을 가능성이 바로 벤치가 잡아야 할 대상이라, 그걸 정답으로 삼으면 처음부터 못 잰다. 스킬이 "저쪽이 단일 출처"라고 위임하고 있으면 그 문서를 열어 확정한다. 위임 대상이 또 다른 원본(마커·용어 정의 등)을 가리키면 거기까지 따라간다.

확정한 정답이 실제로 발동 가능한지도 함께 본다. 그 해석대로면 한 번도 발동할 수 없는 규칙이면 해석이 틀린 것이다.

- 서브에이전트 위임 구조 테스트와 gotchas는 [delegation.md](delegation.md) 참조. 특정 스킬의 벤치 대입값(단위 매핑·오라클·fixture)은 해당 스킬의 `specialized/` 파일 참조.
- description 트리거 정확도 측정(false negative/positive 정량)은 [trigger-eval.md](trigger-eval.md)를 따른다. skill-creator 표준 도구는 쓰지 않는다 — 사유와 대체 도구는 그 파일에 있다.
- 벤치를 돌리면 환경 격리·측정 도구 감사·종결 시 정리는 [../operations.md](../operations.md)를 따른다 — 회차 운용이든 단발이든 해당한다.

## assertion 사전 검증

eval 실행 전, writer/critic 팀으로 assertions를 검증한다.

### 팀 구성

| 역할 | 책임 |
|------|------|
| writer | assertion 초안 작성 |
| critic | 각 assertion에 아래 「critic 검증 기준」으로 도전. 통과하지 못하면 수정 또는 DROP 요구 |

### critic 검증 기준

1. **컨텍스트 충족**: 이 assertion을 pass하려면 에이전트가 무엇을 읽어야 하는가? eval setup에 포함됐는가?
2. **스킬 규칙 매핑**: 스킬의 어떤 구체적 규칙이 이 assertion의 pass를 유도하는가? 매핑 불가면 제거.
3. **차별성**: 스킬 없는 baseline sonnet이 이걸 pass할 수 있는가? Yes면 강화하거나 교체.

합의될 때까지 라운드를 반복하고, 최종 assertions만 evals.json에 기록한다.
