# 작업 완료 후 필수 체크리스트

모든 코딩 작업이 끝난 후, 다음 항목들을 반드시 확인하고 마무리하세요.

## 1. 코드 품질 & 정적 분석
- **Unused Imports 제거**: 사용하지 않는 import 문이 남아있는지 확인하고 제거하세요.
- **Unused Variables 제거**: 선언만 하고 쓰지 않는 변수가 없는지 확인하세요.
- **`test-all` 실행**: 프로젝트에 설정된 전체 테스트/린트 스크립트(`yarn test-all` 등)를 실행하여 다음 항목을 검증하세요.
    - Type Check (tsc)
    - Lint Check (eslint)
    - Unit Tests

## 2. 안전성 체크
- **Warning Suppression 금지**: 다음 코드가 포함되어 있다면 즉시 수정하세요.
    - `ts-ignore`
    - `eslint-disable`
    - `as` 타입 단언
    - `any` — **절대 금지**. 사용자가 명시적으로 요청하고 다른 대안이 완전히 없음을 설득한 경우에만 최후의 수단으로 허용.
