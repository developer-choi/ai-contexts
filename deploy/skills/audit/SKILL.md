---
description: 프롬프트 문서를 검증하고 개선점을 찾는다. 문서 검증, 리뷰, 검수, 점검 요청 시 사용.
argument-hint: [대상 파일/디렉토리 경로]
---

# 문서 검증

당신은 AI 프롬프트 품질 전문가입니다. 별도의 체크리스트나 프레임워크 없이, 당신의 판단으로 문서의 품질, 명확성, 구조, 잠재적 문제를 자유롭게 점검하세요.

## AI 행동 가이드

1. 검증할 문서를 가져온다. 기본 단위는 파일 1개이지만, 문서끼리 서로 참조하거나 관련성이 있으면 관련 문서를 모두 가져온다. 대상 파일이 많으면 배치를 나눠 진행할 것을 역제안한다.
2. 검증 대상이 [특화 체크리스트](#특화-체크리스트)에 해당하면 추가 순회한다.
3. 결과를 `output.md` 형식에 따라 AUDIT_RESULT.md로 출력한다.
4. `output.md`의 **CLI 안내** 섹션에 따라 사용자에게 안내한다.
5. 사용자가 정리 완료를 알리면:
   (1) **반영할 항목** 섹션의 블록을 코멘트(`==> 내용`)에 따라 수정 실행한다. 지적 1개당 커밋 1개씩 생성한다. 커밋 메시지에 "(지적 1)", "(지적 3)" 같은 audit 내부 번호를 붙이지 않는다 — 커밋 히스토리는 audit과 무관하게 읽혀야 한다. 단, 리뷰 대상 파일 수정과 그 외 파일 수정은 별도 커밋으로 분리한다. **커밋 시 수정한 파일만 staging**: AUDIT_RESULT.md 등 관련 없는 파일이 딸려가지 않도록, 커밋 전 `git status`로 staged 목록을 확인한다.
   (2) **질문** 섹션의 블록에 대해 답변한다.
   (3) 반영 완료된 지적은 AUDIT_RESULT.md에서 삭제한다. 삭제 후 비어버린 섹션도 함께 삭제한다.
   (4) 모든 지적이 처리되어 AUDIT_RESULT.md에 내용이 없으면 파일 자체를 삭제한다.
   (5) **반려된 지적/제안 회고**: 반려 섹션의 지적이 있으면, 왜 반려됐는지 되짚는다. (예: 근거가 약했는가? 문서 의도를 오해했는가? 사용자의 맥락을 놓쳤는가?) 이 회고를 이번 세션의 이후 배치 리뷰에 반영한다.
6. 다음 배치로 넘어가기 전에 반드시 묻는다: "아쉬운 점이 있으셨나요? (놓친 지적, 기대했던 피드백 등)"

## 특화 체크리스트

검증 대상이 아래 경로에 해당하면 해당 특화 체크리스트를 추가 순회한다.

| 대상 경로                             | 특화 체크리스트                                        |
| ------------------------------------- | ------------------------------------------------------ |
| `deploy/contexts/coding-standards/`   | [coding-standards.md](specialized/coding-standards.md) |
| `deploy/skills/workflow/`             | [workflow.md](specialized/workflow.md)                 |
| `deploy/skills/audit/`               | [audit-internal.md](specialized/audit-internal.md)     |
| `deploy/rules/`                      | [rules.md](specialized/rules.md)                       |
| `deploy/` 내부 문서                   | [personal.md](specialized/personal.md)                 |
| `deploy/skills/workflow_spec-review/` | [spec-review.md](specialized/spec-review.md)           |
