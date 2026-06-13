---
target: deploy/skills/workflow/
---

# workflow 백로그

## 에러페이지 템플릿 onAction 논리근거 `draft`

전체 페이지 에러(404, 500 등) 처리용 ErrorPageTemplate 인터페이스 설계.

- `onAction` + `actionLabel` 세트로 단일 액션 제공 (배열은 과설계)
- 에러마다 행동이 다름 (404→홈, 500→재시도, 403→로그인)
- 기존 ErrorBoundary(섹션 단위)와 공존

사용자에게 인터페이스 확인 후 coding-standards/워크플로우 반영 결정.
