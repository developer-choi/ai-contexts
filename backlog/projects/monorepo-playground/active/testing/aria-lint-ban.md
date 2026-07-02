# 테스트 코드에서 aria-* 속성 린트로 금지

테스트 파일(`*.test.{ts,tsx}`)에서 JSX에 `aria-*` 속성을 직접 붙이지 않는다.  
`getByRole`은 허용 — role 기반 쿼리 자체가 문제가 아니라, aria-* 속성을 테스트 코드에서 직접 명시하는 것이 문제다.

이유: 접근성(시각 장애 사용자 지원)은 현재 우선순위에서 밀려 있다. aria-* 속성을 테스트에 직접 쓰면 접근성 계약을 암묵적으로 강제하게 된다.

예외: aria-* 없이는 테스트를 짤 수 없는 케이스가 생기면 `eslint-disable` + 사유 주석으로 허용.

## 작업

- `no-restricted-syntax`로 테스트 파일 override 블록에 JSXAttribute `aria-*` 사용 시 에러 규칙 추가
- 적용 위치: `eslint.config.base.mts` 또는 design-system `eslint.config.js`의 테스트 파일 override 블록

## 참고

현재 `TestsWeAvoid.md`의 "라이브러리 동작을 다시 검증한다" 섹션에 `aria-checked` 예시가 있으나, 린트 강제는 없음.
