# Audit 내부 특화 체크리스트

`audit/` 하위 파일 리뷰 시 base audit 체크리스트를 순회한 뒤, 아래 항목을 추가 순회한다.

## 특화 항목

### output.md 동기화

output.md의 템플릿 구조가 실제 프로세스와 일치하는지 점검한다.

- output.md의 섹션 구조(AUDIT_TARGET, AUDIT_SOURCE 개선 등)가 SKILL.md의 기록 지시와 일치하는지
- output.md의 지적/제안 필드(위치, 문제, 권장 등)가 SKILL.md에서 요구하는 형식과 일치하는지
- output.md의 CLI 안내가 실제 워크플로우(반영/반려/질문 흐름)를 빠짐없이 안내하는지

### retrospect.md 동기화

- retrospect.md의 Step 구조가 SKILL.md Step 3의 지시와 정합하는지
- retrospect.md에서 사용하는 용어(AUDIT_TARGET, AUDIT_SOURCE, AUDIT_RESULT)가 output.md와 일치하는지
