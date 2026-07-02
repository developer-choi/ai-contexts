## play function

Storybook's play function is a convenient helper method to test component scenarios that otherwise require user intervention. They're small code snippets that execute once your story renders.

```tsx
<!-- from PDF p.1 -->
export const FilledForm: Story = {
  play: async ({ canvas, userEvent }) => {
    // 🔖 Simulate interactions with the component
    await userEvent.type(canvas.getByRole('textbox', { name: 'email' }), 'email@provider.com');
    await userEvent.type(canvas.getByRole('textbox', { name: 'password' }), 'a-random-password');
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
  },
};
```

<!-- from PDF p.1 -->
play 함수는 스토리가 렌더링 된 직후에 실행되는 비동기(async) 함수다. 이 함수 안에서 사용자가 실제로 할 법한 행동들(클릭, 타이핑 등)을 코드로 시뮬레이션하고, 그 결과 컴포넌트가 예상대로 변했는지 자동으로 검증할 수 있다.

- play 함수는 Story 타입에서 예약된 메서드 이름이다.
- play 함수는 스토리 렌더 즉시 자동 실행된다 (명시적 트리거 없음).
- 재생 속도·타이핑 속도를 제어하는 기능이 있다면 개발자와 디자이너 모두에게 유용할 수 있다.

<!-- from PDF p.1 -->
이 기능은 Storybook을 단순한 UI 문서 도구에서 강력한 통합/E2E 형태 테스트 도구로 격상시키는 핵심적인 역할을 한다. Jest에서 `@testing-library/user-event`를 사용해 봤다면, 거의 동일한 경험을 Storybook에서 시각적으로 할 수 있다.

## 복잡한 사용자 시나리오/플로우 테스트

<!-- from PDF p.2 -->
단일 인터랙션을 넘어 여러 단계로 구성된 사용자 플로우를 하나의 play 함수 안에서 순서대로 실행할 수 있다. 각 단계에서 상태 변화를 검증(expect)할 수 있어 복잡한 UI 플로우 검증에 적합하다.

## 시각적 회귀 테스트(Visual Regression Testing)와 연동

<!-- from PDF p.2 -->
play 함수는 Chromatic과 같은 시각적 회귀 테스트 도구와 함께 사용될 때 강력하다.

1. 초기 상태에서 스크린샷을 찍는다.
2. play 함수를 실행하여 컴포넌트의 상태를 변경한다.
3. 변경된 후의 상태에서 다시 스크린샷을 찍는다.

이를 통해 "버튼을 클릭했더니 레이아웃이 깨지는" 버그를 자동으로 찾아낼 수 있다.

코드로 작성한 인터랙션 시나리오는 그 자체로 가장 정확한 컴포넌트 사용 설명서가 된다.
