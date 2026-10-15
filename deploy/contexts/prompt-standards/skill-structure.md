# 에이전트 나누기

스킬·절차의 일을 메인과 서브에이전트·팀원 중 누가 맡을지를 본다.

## 에이전트 설계

단계마다 메인이 할지, 서브에이전트나 팀원에게 맡길지를 아래 공식 자료로 판단한다.

결과를 받은 뒤 같은 에이전트에게 다시 시킬 일이 있으면 이름 있는 팀원으로 띄운다([team-agent](../team-agent.md#claude-code)).

### 공식 자료 (확인: 2026-10-15)

[Create custom subagents](https://code.claude.com/docs/en/sub-agents) — 「Choose between subagents and main conversation」 절

> Use the **main conversation** when:
> * The task needs frequent back-and-forth or iterative refinement
> * Multiple phases share significant context, such as planning, implementation, and testing
> * You're making a quick, targeted change
> * Latency matters. A subagent that isn't a fork starts fresh and may need time to gather context

> Use **subagents** when:
> * The task produces verbose output you don't need in your main context
> * You want to enforce specific tool restrictions or permissions
> * The work is self-contained and can return a summary

같은 문서 첫머리

> Use one when a side task would flood your main conversation with search results, logs, or file contents you won't reference again: the subagent does that work in its own context and returns only the summary.

같은 문서 「Run parallel research」 절

> When subagents complete, their results return to your main conversation. Running many subagents that each return detailed results can consume significant context, and each subagent spends tokens of its own while it runs.

[Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams) — 「When to use agent teams」·「Compare with subagents」 절

> Agent teams add coordination overhead and use significantly more tokens than a single session. They work best when teammates can operate independently. For sequential tasks, same-file edits, or work with many dependencies, a single session or subagents are more effective.

> Use subagents when you need quick, focused workers that report back. Use agent teams when teammates need to share findings, challenge each other, and coordinate on their own.

같은 문서 「Run a parallel code review」 절

> A single reviewer tends to gravitate toward one type of issue at a time. Splitting review criteria into independent domains means security, performance, and test coverage all get thorough attention simultaneously.
