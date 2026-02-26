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
    - `any` (불가피한 경우 제외하고 지양)

## 3. 컨벤션 준수 확인
- `instructions/conventions` 하위의 해당 모드(`coding`, `testing` 등) 가이드라인을 위반하지 않았는지 자가 점검하세요.
