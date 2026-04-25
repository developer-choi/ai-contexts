# 팀 에이전트 규칙

팀 에이전트 스폰 절차:

1. **TeamCreate**로 팀 생성 (이미 있으면 생략)
2. **Agent** 호출 시 `team_name` 파라미터 포함

`team_name` 없이 호출하면 일회성 서브에이전트가 되어 다라운드 SendMessage 소통이 불가능하다.
