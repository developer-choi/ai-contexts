# 디자인시스템 컴포넌트 PR — 커밋 분할 순서

| 순 | 주제 | 포함 |
|---|---|---|
| 1 | 패키지 설치 | `package.json` / `yarn.lock` |
| 2 | 기본 골격 + 필수 prop | 컴포넌트 + scss 기본 시각 + 테스트 골격 + index 노출 + Playground 스토리 |
| 3 ~ N | props별 점진 추가 (mode/position/size/variant 등) | 컴포넌트 분기 + 해당 props 테스트 + 매칭 스토리 |
| N+1 | 시각 디테일 (Arrow 등 추가 시각 요소) | 해당 시 |
| 마지막 | 패턴 스토리 (CollisionAvoidance, LongText 등) | 스토리만 |
