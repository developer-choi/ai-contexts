# 기능테스트

스킬이 설계대로 동작하는가를 검증한다.

## 확정한 정답이 발동 가능한지 본다

위임한 문서까지 따라가 확정한 정답이 실제로 발동 가능한지도 함께 본다. 그 해석대로면 한 번도 발동할 수 없는 규칙이면 해석이 틀린 것이다.

## assertion 사전 검증

채점 전, 메인이 assertion 초안을 작성하고 팀원 critic([team-agent](../../../contexts/team-agent.md#claude-code) 규칙으로 띄운다)이 아래 기준으로 검증해 통과하지 못하면 수정·DROP을 요구한다.

### critic 검증 기준

1. **컨텍스트 충족**: 이 assertion을 pass하려면 에이전트가 무엇을 읽어야 하는가? eval setup에 포함됐는가?
2. **스킬 규칙 매핑**: 스킬의 어떤 구체적 규칙이 이 assertion의 pass를 유도하는가? 매핑 불가면 제거.

스킬이 있든 없든 똑같이 통과하는 항목을 걸러내는 기준은 skill-creator `agents/analyzer.md` "Analyzing Benchmark Results"의 것을 사용한다.

합의될 때까지 라운드를 반복하고, 최종 assertions만 기록한다.
