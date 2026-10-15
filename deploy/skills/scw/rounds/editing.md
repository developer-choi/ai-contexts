# 문서를 고쳐 쓰는 회차

## how 최소화 원칙

규칙을 넣거나 고칠 때는 먼저 스크립트·훅·설정으로 옮길 수 있는지 본다. 그럴 수 없어 문서에 문장으로 적을 때는, 아래 근거대로 how(명령·조건·예외)를 줄이고 목적을 적는다.

### 근거 원문

[Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

> We're already seeing that smarter models require less prescriptive engineering, allowing agents to operate with more autonomy.

> As model capabilities improve, agentic design will trend towards letting intelligent models act intelligently, with progressively less human curation.

> At one extreme, we see engineers hardcoding complex, brittle logic in their prompts to elicit exact agentic behavior. This approach creates fragility and increases maintenance complexity over time.

> At the other extreme, engineers sometimes provide vague, high-level guidance that fails to give the LLM concrete signals for desired outputs or falsely assumes shared context. The optimal altitude strikes a balance: specific enough to guide behavior effectively, yet flexible enough to provide the model with strong heuristics to guide behavior.

[Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) — 「Add context to improve performance」 절

> Providing context or motivation behind your instructions, such as explaining to Claude why such behavior is important, can help Claude better understand your goals and deliver more targeted responses.

> Claude is smart enough to generalize from the explanation.

같은 문서 「Leverage thinking & interleaved thinking capabilities」 절 — thinking에 한정된 말이다

> Prefer general instructions over prescriptive steps. A prompt like "think thoroughly" often produces better reasoning than a hand-written step-by-step plan. Claude's reasoning frequently exceeds what a human would prescribe.

## 규칙 옆에 예시를 붙이지 않는다

**기본값은 안 붙인다**이고, 붙이는 쪽이 예외다.

예시는 사용자가 지목한 것만 붙인다.

### 히스토리를 거의 쓰지 않는다

언제·어느 레포·어느 세션에서 무슨 일이 있었는지는 적을 필요가 거의 없다. 예:

- 날짜·레포·회사명이 붙은 사건 서술, `❌ 위반 (…, 날짜)` 꼴 블록
- 사용자 발화 인용과 그것을 감싼 `사용자 교정`·`사용자 반려`·`사용자 지시` 서술
- `그전에는 ~였다`·`~를 폐기했다`·`부분 철회했다` 꼴 개정 이력

쓸 때마다 히스토리를 한 줄씩 붙이면, 만 번 쓴 스킬에는 히스토리만 만 줄이 쌓인다.
