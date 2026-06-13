---
target: deploy/skills/code-review/
---

# code-review

## [draft] 2026-06-07 code-review 변경 사후 리뷰

### 동기

2026-06-07 code-review SKILL.md에 AC master로 2커밋 적용. 변경이 누락·정합성·다른 스킬과 충돌 없는지 사후 점검 필요.

- `cf46ac4`: 외부 스킬 리뷰 모델을 opus→sonnet 전환 + advanced 모드에 External-Skill Reviewer ×M(sonnet) 신설(외부 스킬 1개당 1명) + default 모드에 외부 스킬 참조 명시 + 외부 스킬 미설치 시 vercel.com/docs/agent-resources/skills 안내 + `--extra-standards`는 외부 스킬 미트리거 명시
- `8974591`: claude 전용 절대경로 `~/.claude/skills/<name>/`를 형제 상대경로 `../<name>/`로 교정 (global.md:243 전역 스킬 경로 규칙 위반 해소, 41·51·78줄)
- `ea96a66`: 외부 스킬 선별(1단계 4번)을 coding-standards 스킵 게이트에서 분리 — `--coding-standards` 주입과 무관하게 항상 도메인 기준 실행 (SKILL.md:36)

### 첫 행동

위 2커밋 diff를 code-review 스킬(또는 scw 「프롬프트 감사」)로 점검.

### 종료 조건

리뷰 0건 수렴 또는 발견 이슈 반영.
