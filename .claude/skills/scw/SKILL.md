---
name: scw
description: 스킬을 만들거나 개선(통합, 분리, 재구조화, 마이그레이션 포함)하고, 프롬프트 문서를 검증한다. 의심 지점을 찾아 분류·검증·수정하는 개선 루프를 포함한다. 스킬 생성, 스킬 개선, SKILL.md 작성, 문서 검증, 리뷰, 검수, 점검, 벤치마크, eval, 테스트, "의심 지점 찾아 개선", "비판적으로 따져", "벤치 돌려 다듬어" 요청 시 반드시 이 스킬을 사용한다.
argument-hint: "[대상 파일/디렉토리 경로 또는 스킬 설명]"
---

# Skill Creator & Prompt Auditor

[CRITICAL] [skill-creator](skill-creator) 플러그인을 로드한다. 실패하면 즉시 중단하고 사용자에게 skill-creator 설치가 필요하다고 안내한다.

## 스킬 생성/개선

스킬을 만들거나 개선할 때 [guide.md](guide.md)의 규칙을 따른다.

## 프롬프트 감사

프롬프트 문서가 **잘 쓰였는가**를 검증한다.

### 리뷰 범위

- 명확성 — AI가 오해 없이 실행할 수 있는가
- 정합성 — 문서 내부, 또는 참조하는 다른 문서와 모순이 없는가
- 구조 — 정보가 효과적으로 배치되어 있는가
- 간결성 — 더 적은 토큰으로 같은 효과를 낼 수 있는가
- 에이전트 설계 — 서브에이전트/메인 에이전트 구조가 최적인가 (해당 시에만)
  - 컨텍스트 엔지니어링: 메인이 이미 보유한 컨텍스트를 서브에이전트가 중복 로드하는가
  - 컨텍스트 엔지니어링: 반복 사이클에서 이전 반복의 맥락이 유실되는가
  - 하네스 엔지니어링: 서브에이전트 위임이 필요한 이유가 명확한가 (컨텍스트 격리? 병렬화? 객관성?)
  - 하네스 엔지니어링: 병렬화할 수 있는 서브에이전트를 순차 실행하고 있지 않은가
  - 하네스 엔지니어링: 에이전트 간 결과 전달 구조가 명확한가 (산출물 → 입력 체이닝)

범위 밖: "문서 속 규칙이 실제로 동작하는가"는 [기능테스트](#기능테스트)의 영역이다.

### 결과 작성

[output.md](output.md) 형식에 따라 AUDIT_RESULT.md를 작성한다. 사용자가 각 항목에 판정(승인/반려/질문)을 채운다.

### 후처리

- 승인 항목: 지적 1개당 커밋 1개로 반영. 수정한 파일만 staging.
- 반려 항목: 왜 반려됐는지 회고한다 (근거가 약했는가? 의도를 오해했는가?).
- 대상이 5개를 넘으면 배치를 나눠 진행한다.

### 특화 리뷰

검증 대상이 아래 경로에 해당하면, 해당 파일을 읽고 추가 관점으로 리뷰한다.

| 대상 경로 | 특화 파일 |
|-----------|-----------|
| `deploy/contexts/coding-standards/` | [coding-standards.md](specialized/coding-standards.md) |
| `deploy/skills/workflow/` | [workflow.md](specialized/workflow.md) |
| `deploy/skills/workflow/requirement-review/` | [requirement-review.md](specialized/requirement-review.md) |
| `deploy/contexts/writing-guide/` | [writing-guide.md](specialized/writing-guide.md) |
| `deploy/rules/`, 그 외 지침·규칙 나열 문서 (ablation 벤치) | [rule-ablation-bench.md](specialized/rule-ablation-bench.md) |

대상 경로에 `map.md`가 있으면 추가로 점검한다:
- **동기화**: map.md의 목록과 실제 파일이 일치하는가
- **중복**: 하위 파일 간 같거나 비슷한 내용이 있는가

## 의심 지점 개선 루프

스킬·프롬프트의 의심 지점을 AI가 자동 분류·검증·적용한다 (사용자 판정 없이 커밋까지). "프롬프트 감사"가 사용자 판정 모드라면, 이 루프는 AI 자동 적용 모드다.

상세는 [improve-loop.md](improve-loop.md) 참조.

진입 트리거: "스킬 의심 지점 찾아 개선", "비판적으로 따져 다듬어", "벤치 돌려서 개선" 등.

## 0건 수렴까지 재벤치 (필수)

벤치 라운드에서 잔류 이슈가 1건이라도 남으면 다음 라운드로 넘어간다. 사용자가 명시적으로 "이 정도면 됐다"·"여기서 멈추자"고 말하기 전에는 자체 판단으로 라운드를 종료하지 않는다. 사용자가 매번 "더 돌려"라고 시키지 않아도 0건 수렴까지 자동 진행한다.

- 라운드 사이클: 잔류 케이스 패턴 분석 → 룰·grep·어휘 보강 → 같은 시나리오 재측정 → 0건 확인.
- 보강 변경은 라운드별 커밋으로 분리해 사용자가 diff로 라운드별 효과를 검토할 수 있게 한다.
- 최대 10회 (글로벌 「검증은 수렴할 때까지 반복」). 10회 초과 시 사용자에게 보고하고 판단 위임.
- "97% 통과면 충분하다"·"잔류 1건은 자연 표현이라 어쩔 수 없다" 같은 자체 만족 종료 금지. 잔류 1건이 다음 사용 때 같은 누설로 재발하면서 가이드 신뢰도가 무너진다.
- 적용 범위: 「의심 지점 개선 루프」, 「프롬프트 감사」 후처리, 「기능테스트」에서 벤치를 돌린 모든 경우.

## 기능테스트

스킬이 **설계대로 동작하는가**를 검증한다. 출력 품질이 아니라 오케스트레이션(분기, 순서, 에이전트 구성)이 대상이다.

- 서브에이전트 위임 구조 테스트와 gotchas는 [eval-delegation.md](eval-delegation.md) 참조.
- description 트리거 정확도 측정(false negative/positive 정량)은 [trigger-eval-bench.md](specialized/trigger-eval-bench.md) 참조. [CRITICAL] 작업 시작 전 specialized 파일의 「현재 상태」와 「피해야 할 함정」을 반드시 읽는다. skill-creator 표준 도구(`run_eval.py`·`run_loop.py`)는 architectural broken 상태(2026-05-16 기준 미해결, [anthropics/skills#556](https://github.com/anthropics/skills/issues/556))이므로 자체 도구 `scripts/bench-trigger.py` 사용. 6시간 함정 사례 specialized 참조.

## Eval

- eval은 반드시 sonnet 모델로 실행한다. 이유: 스킬은 비용 효율적인 모델이 이해할 수 있는 수준으로 작성돼야 한다. opus에서만 동작하는 스킬은 실용적이지 않다.
- 예외: write-init·write-refine 스킬은 opus로 실행한다. 내용 풍부화와 톤·구조·분량 판단이 핵심이라 sonnet 기준으로 작성하면 가치가 휘발한다.
