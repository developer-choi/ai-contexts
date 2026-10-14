# 이름 붙인 Claude Code 세션을 Windows Terminal 새 탭에 띄우는 스크립트

```powershell
pwsh -NoProfile -File ~/.claude/contexts/claude-tab/claude-tab.ps1 -Name {세션 이름} -Model {sonnet|opus|...} [-Dir {폴더}] [-Effort {low|medium|high|...}] [-Prompt "{첫 입력}"]
```

- `-Name`이 탭 제목과 `claude --name`에 같이 들어간다. 다른 세션이 `SendMessage`로 이 이름을 부른다.
- `-Prompt`에 `/스킬 인자`를 넣으면 띄우자마자 그 스킬이 돈다.
- `-Dir`을 안 주면 부른 자리의 폴더에서 뜬다.
- `-Effort`를 주면 `claude --effort`로 넘긴다. 안 주면 붙이지 않는다.

Claude Code 세션 안에서 부르면 그 세션의 `CLAUDE*`·`NO_COLOR`·`GIT_TERMINAL_PROMPT`가 새 탭으로 새어 나가, 새 세션이 하위 세션으로 잡혀 기록 저장이 꺼지고 메시지 채널이 섞이고 색이 빠진다. 스크립트가 띄우기 전에 이 변수들을 지운다.

새 탭이 열리면 화면이 그 탭으로 넘어간다. 원래 탭으로 되돌리지 않는다.
