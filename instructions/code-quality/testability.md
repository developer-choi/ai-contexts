# 테스트하기 쉬운 코드

## 핵심 키워드

- **순수 함수 (Pure Function)**: 같은 입력 → 같은 출력, side effect 없음
- **의존성 주입 (Dependency Injection)**: 외부 의존성을 직접 호출하지 않고 파라미터로 받음
- **관심사 분리 (Separation of Concerns)**: 판단(정책) vs 실행(side effect) 분리
- **단일 책임 (Single Responsibility)**: 한 함수가 하나의 일만
- **경계 밀어내기 (Push Side Effects to the Boundary)**: 비즈니스 로직은 순수하게 코어에, side effect는 가장 바깥에서
