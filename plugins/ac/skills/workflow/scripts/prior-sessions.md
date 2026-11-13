# prior-sessions.mjs 사용법

`node <workflow 스킬 폴더>/scripts/prior-sessions.mjs [--worktree <워크트리 경로>] [--session <뺄 세션 id>]`

이 PR 워크트리에서 돈 앞 세션의 Claude Code 기록(jsonl)을 찾는다. 워크트리 안에서 연 세션과, 메인 레포에서 열고 워크트리로 들어간 세션을 모두 찾는다.

## 인자

- `--worktree <워크트리 경로>` 없으면 현재 폴더의 레포를 쓴다
- `--session <뺄 세션 id>` 없으면 환경 변수 `CLAUDE_CODE_SESSION_ID`(지금 세션)를 뺀다

## 출력

stdout에 찾은 jsonl 경로를 한 줄에 하나씩, 오래된 것부터 출력한다. stderr에는 건수를 출력한다. 0건이어도 exit 0이다.

git 레포가 아니거나 `~/.claude/projects/`가 없으면 exit 1.
