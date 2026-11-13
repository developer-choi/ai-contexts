# rules-as-code 근거

[rules-as-code.md](rules-as-code.md)의 판단이 근거로 삼는 공식 문서 원문과, 이 레포에서 잰 벤치 결과다. 원문은 적힌 날짜에 확인한 것이라, 공식 문서가 바뀌면 다시 받아 대조한다.

## 공식 문서

### 지시는 강제되지 않는다 — 두 층

[Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)의 "Enforce the rules that can't have exceptions" 절 (2026-11-13 확인):

> 1. Non-deterministic: you write the instruction, and Claude (the model) reads it. This can be your prompt, `CLAUDE.md`, or a skill. The model then decides what to do with this information. It usually follows your commands, and current models are good at understanding your intent without much context, but there's no *guarantee* that it'll follow your instructions. It can still decide not to do things, or do other things.
> 2. Deterministic: you configure the instruction, and Claude Code (the harness) *has* to execute this. This can be a hook, a deny rule, or a managed setting. Claude Code applies this every time, no matter what the model decided to do.

> If something has to happen every time, make it a hook, a deny rule, or a managed setting. `CLAUDE.md` is for guidelines, and Claude is allowed to decide a guideline doesn't apply.

> Don't overdo it, though: a hook is for a rule with *zero* exceptions, and `Prefer named exports` has plenty, so that one stays in `CLAUDE.md`.

> Whatever the scope, keep the enforced set small. Every hook and deny rule will occasionally fire when it shouldn't, and someone has to maintain each one.

[How Claude remembers your project](https://code.claude.com/docs/en/memory) (2026-11-13 확인):

> Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead.

### 스크립트는 읽히지 않고 실행돼야 한다

[Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) (2026-11-13 확인).

"Provide utility scripts" 절:

> * Are more reliable than generated code
> * Save tokens (no need to include code in context)
> * Save time (no code generation required)
> * Ensure consistency across uses

> **Important distinction:** Make clear in your instructions whether Claude should:
> * **Run the script** (most common): “Run `analyze_form.py` to extract fields”
> * **Read it as reference** (for complex logic): “See `analyze_form.py` for the field extraction algorithm”

같은 절의 예시는 스크립트마다 명령 줄과 출력 형식을 md에 적는다. `**analyze_form.py**: Extract all form fields from PDF` 아래에 그 스크립트의 실행 명령과 출력 JSON을 둔다.

"Runtime environment" 절:

> **Scripts run efficiently:** Utility scripts can be run through bash without loading their full contents into context. Only the script's output consumes tokens.

> **Prefer scripts for deterministic operations:** Write `validate_form.py` rather than asking Claude to generate validation code.

공식 문서는 사용법을 md와 스크립트 주석에 두 벌 두는 문제를 다루지 않는다. 짝 md를 사용법의 유일한 자리로 두는 것은 그 빈자리를 메우는 이 레포의 꼴이다.

## 벤치 — 사용법을 어디에 두면 소스를 안 읽는가

과제는 "plan 폴더 `plan`에 PR 두 개를 확정해 등록해라(로그인 화면 COMPONENTS, 목록 API INFRA, 1번에 의존)"다. scratch 프로젝트에 workflow 스킬 사본을 두고 sonnet으로 `claude -p --setting-sources project`를 조건당 3회 돌렸다.

소스 유입은 `steps.mjs`를 대상으로 한 Read·Grep·`cat`/`head`/`sed` 출력 바이트다. 프로젝트 CLAUDE.md에 스크립트를 소개하는 한 줄을 두고, 조건마다 그 줄과 스크립트를 바꿨다.

| 조건 | 스크립트 | 프로젝트 CLAUDE.md 줄 | 소스 유입 | 정답 | 비용 $ 평균 |
|---|---|---|---|---|---|
| a | 사용법은 머리 주석 | `인자·제약은 스크립트 상단 주석이 정본이다` | 평균 39,682B | 3/3 | 0.161 |
| e | 머리 주석 + `--help` 지원 | a와 같음 | 평균 24,554B | 3/3 | 0.126 |
| f | 사용법은 머리 주석 | + `--help부터 실행해 확인한다. 돌려 보기 전에 소스를 읽지 않는다` | 평균 5,260B | 3/3 | 0.096 |
| b | 머리 주석 + `--help` 지원 | f와 같음 | 0B ×3 | 3/3 | 0.081 |
| g1 | 짝 md (받는 값, 출력 안내 줄의 뜻이 빠짐) | `인자는 steps.md를 본다` | 505B · 2,703B(다른 md 출력과 섞임) · 0B | 3/3 | 0.096 |
| g2 | 짝 md (빈칸 채움) | g1과 같음 | 0B · 0B · 약 300B | 3/3 | 0.132 |
| h | g2와 같음 | + `실행 전엔 스크립트 소스를 읽지 않는다` | 0B ×3 | 3/3 | 0.144 |

- g1·g2·h는 Claude Code 2.1.323. a·e·f·b도 같은 과제·하네스다
- **수단만 있고 문서가 안 알려 주면 소스를 연다.** e는 `--help`가 있어도 a처럼 소스를 읽었다
- **짝 md가 빠뜨린 것을 AI는 소스에서 찾는다.** g1의 두 건은 `--type`에 넣을 값과 출력 끝 안내 줄의 뜻을 찾으려고 소스를 grep한 것이다
  - 둘을 md에 적은 g2에서는 인자를 찾는 소스 읽기가 사라졌다
  - g2의 약 300B는 todo.md 양식을 찾던 프로젝트 전체 grep에 소스 세 줄이 섞인 것이다
- **"실행 전엔 소스를 읽지 않는다" 한 줄을 추가하자 남은 우연한 유입(g2의 약 300B)이 0B가 됐다(3회).** h에서는 AI가 grep 범위를 md 파일로 좁혔다
  - 비용이 g1보다 는 것은, md가 안내 줄의 뜻을 알려 주자 AI가 todo.md 절까지 직접 썼기 때문이다(workflow가 원래 시키는 일)
- 본문을 봐야 하는 과제("`parseArgs`가 내는 `모르는 옵션`을 `알 수 없는 옵션`으로 고쳐라")는 g1 조건에서 3/3 편집을 끝냈다(비용 평균 0.082). 짝 md가 소스를 봐야 하는 일을 막지 않는다
- 한계: 과제 하나, 스크립트 하나, sonnet만, scratch 프로젝트, 조건당 3회
