# session-usage.mjs 사용법

`node "${CLAUDE_SKILL_DIR}/scripts/session-usage.mjs" <세션 로그 경로|세션 id> (--list | --turn <n>[-<m>] [--stop-at-tool <도구 이름>])`

Claude Code 세션 로그에서 사용자 입력 단위로 구간을 잘라, 그 구간에 든 Claude 토큰과 걸린 시간을 집계한다. 서브에이전트 로그는 같은 시간 구간 안의 것을 합산한다.

## 인자

- `<세션 로그 경로|세션 id>`: jsonl 경로. id만 주면 `~/.claude/projects/*/<id>.jsonl`에서 찾는다
- `--list`: 사용자 입력을 번호·시각·앞 80자로 출력한다. 사람이 입력한 줄(슬래시 명령 포함)만 센다
- `--turn <n>`: n번 입력부터 다음 입력 직전의 마지막 기록까지. `<n>-<m>`이면 n번부터 m번 입력이 끝날 때까지
- `--stop-at-tool <도구 이름>`: 구간 안에서 그 도구를 처음 호출한 응답 직전에 끊는다. 벤치 세션이 결과를 보고하는 호출을 구간에서 뺄 때 사용한다

## 출력

`--turn`이면 JSON 하나를 stdout에 출력한다.

- `seconds`: 구간 시작부터 끝까지 걸린 시간
- `main`·`subagents`·`total`: `calls`(API 호출 수), `input`, `cacheCreate`, `cacheRead`, `output`, `models`

실패하면 stderr에 사유와 이 문서 경로를 출력하고 exit 1.
