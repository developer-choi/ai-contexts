## 프롬프트 수정 시 audit 규칙 역제안

이 프로젝트의 프롬프트(`deploy/`) 수정 시:

1. 요청된 수정을 수행
2. 패턴성 판단 (동일 요청 재발 가능성 — 전환 문장, 이모지, 중복 병기 등)
3. 패턴성이면, audit skill의 checklist에 추가할 규칙을 구체적 문안과 함께 역제안

## 커밋 컨벤션

- 커밋 메시지 규칙은 `commitlint.config.js` 참조
- `/audit` 실행 후 반영한 수정은 `audit(scope):` type을 사용한다
