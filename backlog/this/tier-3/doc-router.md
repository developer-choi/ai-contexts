---
target: .claude/skills/doc-router/README.md
---

# doc-router

## [ready] README의 "라벨" 표현을 새 양식에 맞게 정정

### 기대상황 (필수)

`README.md`가 잔여 처리를 "라벨을 달아 사용자 판단을 기다립니다"로 설명하는데, 이는 옛 양식(`[BORDERLINE]`/`[NOISE_CANDIDATE]` 텍스트 라벨)을 전제한다. 현재는 `.unrouted.md`(보류)·`.discarded.md`(폐기) 파일 분리로 구분하므로 표현을 그에 맞게 바꾼다.

### 현재상태 (선택)

`.claude/skills/doc-router/README.md:9` 마지막 문장: "무가치해 보이는 항목도 영구 삭제하지 않고 별도 파일에 분리해두면, 사용자가 검토 후 살릴 수 있습니다. **애매한 내용에는 라벨을 달아 사용자 판단을 기다립니다.**"

SKILL.md 본문·description은 2026-05-29에 파일 분리(보류/폐기) 모델로 정정 완료(`2251596`, `c8fcd80`). README만 stale로 남음.

CLAUDE.md 규칙상 README 직접 수정 금지 — full-refresh 스킬 절차로만 갱신한다. 그래서 backlog로 적재.

### 종료 조건

- `README.md:9`의 "라벨을 달아 사용자 판단을 기다립니다" 표현이 보류/폐기 파일 분리 설명으로 바뀜
- full-refresh Readme 단계 또는 사용자 지시로 갱신

### 첫 행동

full-refresh AC 회차의 Readme 단계에서 doc-router README를 검토 대상에 포함하고 위 문장을 정정. 단독으로 급히 고칠 필요는 없음 (cosmetic).
