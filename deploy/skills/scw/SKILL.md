---
description: 스킬을 만들거나 개선하고, 프롬프트 문서를 검증한다. 스킬 생성, 스킬 개선, SKILL.md 작성, 문서 검증, 리뷰, 검수, 점검 요청 시 반드시 이 스킬을 사용한다.
argument-hint: [대상 파일/디렉토리 경로 또는 스킬 설명]
---

# Skill Creator & Prompt Auditor

스킬의 생성/개선과 프롬프트 문서의 품질 검증을 담당한다.

## 스킬 생성/개선

스킬을 만들거나 개선할 때 [guide.md](guide.md)의 규칙을 따른다. skill-creator 플러그인은 벤치마크 시 호출한다.

## 프롬프트 감사

프롬프트 문서가 **잘 쓰였는가**를 검증한다.

### 리뷰 범위

- 명확성 — AI가 오해 없이 실행할 수 있는가
- 정합성 — 문서 내부, 또는 참조하는 다른 문서와 모순이 없는가
- 구조 — 정보가 효과적으로 배치되어 있는가
- 간결성 — 더 적은 토큰으로 같은 효과를 낼 수 있는가

범위 밖: "문서 속 규칙이 실제로 동작하는가"는 별도 테스트의 영역이다.

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
| `deploy/skills/workflow_spec-review/` | [spec-review.md](specialized/spec-review.md) |
