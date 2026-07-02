# Storybook 파일 eslint-disable 처리 방향

스토리 파일(`*.stories.tsx`)에서 `no-restricted-syntax`(inline style 금지 등) eslint-disable 주석이 반복 추가되는 상황. PR1 Button.stories.tsx Matrix 스토리에서 2건 추가.

컴포넌트가 늘어날수록 같은 패턴 반복 예상.

## 고민 포인트

- 스토리 파일 전체에서 해당 규칙을 끄는 eslint config override 추가 (`**/*.stories.tsx` 블록)
- 인라인 주석 대신 config에서 일괄 처리하면 코드가 깔끔해짐
- 단, 진짜 실수로 쓴 inline style도 못 잡게 되는 트레이드오프 있음
- `packages/design-system/eslint.config.js`의 기존 stories 블록 확인 후 판단
