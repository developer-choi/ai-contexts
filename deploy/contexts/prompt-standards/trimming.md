# 필요한 것만 짧게 적었나

오해 없이 읽히는지도 본다.

## how 최소화 원칙

규칙은 먼저 [스크립트·훅·설정으로 옮길 수 있는지](../rules-as-code.md) 본다. 그럴 수 없어 문서에 내용으로 적을 때는, 아래 근거대로 how를 줄이고 목적을 적는다.

절마다 목적 문장을 찾고 나머지 줄을 그 목적에 대 본다. 목적만 알면 AI가 알아서 고를 진행 방식(재료가 있으면 이렇게·없으면 저렇게 같은 분기, 규칙을 되돌리는 예외)이면 지운다.

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

## 군더더기를 지운다

뜻을 더하지 않는 말과 이미 한 말은 지우거나 줄인다.

부정문은 `node <이 문서가 있는 폴더>/negatives.mjs <대상 md>`로 앞뒤 문장과 함께 뽑아 줄마다 판정한다. 먼저 옆 문장이나 목적만으로 같은 행동이 나오는지 보고, 나오면 지운다. 남기는 것은 막으려는 행동이 실제로 나온 기록(커밋 본문·벤치·사고)이 있는 문장뿐이다.

### 규칙 옆에 예시를 붙이지 않는다

예시는 사용자가 지목한 것만 붙인다.

### 히스토리를 거의 쓰지 않는다

언제·어느 레포·어느 세션에서 무슨 일이 있었는지는 적을 필요가 거의 없다. 예:

- 날짜·레포·회사명이 붙은 사건 서술, `❌ 위반 (…, 날짜)` 꼴 블록
- 사용자 발화 인용과 그것을 감싼 `사용자 교정`·`사용자 반려`·`사용자 지시` 서술
- `그전에는 ~였다`·`~를 폐기했다`·`부분 철회했다` 꼴 개정 이력

쓸 때마다 히스토리를 한 줄씩 붙이면, 만 번 쓴 스킬에는 히스토리만 만 줄이 쌓인다.

### 사용자 말투를 옮기지 않는다

사용자가 직접 한 발화(특히 1인칭·구어·맥락 의존 표현)는 일반화해서 적는다. 문서는 다른 세션의 AI가 읽는 글이라, 작성 시점의 사용자 개인 사정·구어가 그대로 들어가면 의미가 깨진다.
