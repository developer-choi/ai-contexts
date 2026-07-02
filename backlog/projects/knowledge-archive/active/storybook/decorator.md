## Decorator

Decorators are a mechanism to **wrap a component in arbitrary markup** when rendering a story. Components are often created with assumptions about 'where' they render.

Your styles might expect a theme or layout wrapper.

<!-- from PDF p.1 -->
```tsx
const meta = {
  component: Button,
  decorators: [
    (Story) => (
      <div style={{ margin: '3em' }}>
        {/* Decorators in Storybook */}
        <Story />
      </div>
    ),
  ],
};
```

Decorators [can be more complex](https://storybook.js.org/docs/writing-stories/decorators#context-for-mocking) and are often provided by [addons](https://storybook.js.org/docs/configure/user-interface/storybook-addons).  
You can also configure decorators at the [story](https://storybook.js.org/docs/writing-stories/decorators#story-decorators), [component](https://storybook.js.org/docs/writing-stories/decorators#component-decorators) and [global](https://storybook.js.org/docs/writing-stories/decorators#global-decorators) level.

<!-- from PDF p.2 -->
Decorator는 스토리(Story)를 감싸는(wrapping) 함수입니다. 특정 컴포넌트 스토리를 렌더링하기 전에 추가적인 "포장"을 하는 기능입니다. 컴포넌트에 액자를 씌우거나, 특정 배경 위에 올려놓는 것을 상상하시면 이해하기 쉽습니다.

이 "포장"을 통해 컴포넌트가 의존하는 외부 환경(Context, 스타일, 라우터 등)을 제공하여, 컴포넌트를 실제 애플리케이션과 유사한 환경에서 독립적으로 실행하고 테스트할 수 있게 만들어 줍니다. 이는 Jest와 같은 테스트 환경에서 테스트 대상 컴포넌트를 `Provider` 등으로 감싸는 것과 완전히 동일한 원리입니다.

Decorator는 세 가지 레벨에 적용할 수 있으며, 상위 레벨의 Decorator가 먼저 적용됩니다.

1. **Global Decorators**: 모든 스토리에 적용됩니다. (`.storybook/preview.js` 에 설정)
2. **Component Decorators**: 특정 컴포넌트의 모든 스토리에 적용됩니다. (`*.stories.js` 파일의 `meta` 객체에 설정)
3. **Story Decorators**: 단일 스토리에만 적용됩니다. (`*.stories.js` 파일의 특정 스토리 객체에 설정)

### Decorator로 할 수 있는 모든 것

#### 전역 스타일링

컴포넌트 자체에는 포함되지 않는 외부 스타일이나 레이아웃을 적용하여 시각적 테스트를 용이하게 할 수 있습니다.

<!-- from PDF p.3 -->
- **전역 CSS 적용**: `globals.css` 와 같은 전역 스타일시트를 모든 스토리에 일괄 적용합니다.

```js
// .storybook/preview.js
import '../src/styles/globals.css'; // 전역 CSS 임포트
```

- **여백(Padding) 추가**: 컴포넌트가 화면 경계에 붙어 보이지 않도록 모든 스토리에 공통적으로 여백을 줍니다.

```js
// .storybook/preview.js
export const decorators = [
  (Story) => (
    <div style={{ margin: '3em' }}>
      <Story />
    </div>
  ),
];
```

- **중앙 정렬**: 컴포넌트를 화면 중앙에 배치하여 더 보기 좋게 만듭니다.

```js
// .storybook/preview.js
export const decorators = [
  (Story) => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Story />
    </div>
  ),
];
```

#### Context 제공

<!-- from PDF p.4 -->
컴포넌트가 특정 React Context에 의존할 때, Decorator를 사용하여 해당 Context Provider를 제공할 수 있습니다.

- **Theming**: `ThemeProvider`, `QueryClientProvider`, `Router` 등 React Context Provider를 감쌀 때 사용합니다. Styled-components, Material-UI를 따르는 다크/라이트 테마에 맞게 동적으로 적용할 수 있습니다.

```js
// .storybook/preview.js (글로벌 적용)
import { ThemeProvider } from 'styled-components';
import { LightTheme, DarkTheme } from '../src/styles/theme';

export const decorators = [
  (Story, context) => {
    const theme = context.globals.theme === 'dark' ? DarkTheme : LightTheme;
    return (
      <ThemeProvider theme={theme}>
        <Story />
      </ThemeProvider>
    );
  },
];
```

- **Redux같은거** > Provider 감싸서 전역 상태에 의존하는 컴포넌트를 테스트할 수 있습니다.
- **React Query** > Provider 감싸서 API 요청 상태(loading, success, error)를 손쉽게 시뮬레이션할 수 있습니다.
- **next/navigation** > `useRouter()`를 사용하는 컴포넌트를 위해 라우터 컨텍스트를 모킹(mocking)하여 제공할 수 있습니다.

#### 모킹

<!-- from PDF p.5 -->
**다. 데이터 및 기능 모킹 (Mocking)**

컴포넌트가 의존하는 외부 API, 브라우저 API, 또는 특정 함수의 동작을 가짜(mock)로 대체하여 예측 가능한 환경을 구축합니다.

- **API 요청 모킹**: `msw-storybook-addon` 과 같은 애드온을 사용하여 특정 API 요청에 대한 가짜 응답을 정의할 수 있습니다. 이는 Decorator 레벨에서 특정 스토리에 다른 Mock 데이터를 제공하는 방식으로 활용됩니다.
- **Hooks 모킹**: 커스텀 훅의 반환 값을 강제로 제어하여, 해당 훅을 사용하는 컴포넌트의 다양한 상태를 테스트할 수 있습니다.
- **이벤트 핸들러 래핑**: Storybook의 `Actions` 애드온과 연동하여, 컴포넌트에서 발생하는 이벤트를 로그로 패널에 로깅할 수 있습니다.

### Parameters vs Decorator

<!-- from PDF p.5 -->
- **Decorator**: "어떻게(How)" 렌더링할 것인가? → 스토리를 코드(함수)로 직접 감싸서 렌더링 방식 자체를 바꾸는 동적인 **실행 코드**입니다.
- **Parameter**: "무엇을(What)" 설정할 것인가? → 스토리에 대한 정적인 **메타데이터(설정값)**입니다. 이 설정값은 주로 Storybook의 UI나 애드온(Addon)의 동작 방식을 제어하는 데 사용됩니다.

<!-- 비교표, PDF p.6 참조 -->
| 구분 (Category) | Decorator | Parameter |
|---|---|---|
| 핵심 역할 | 코드 (Code) | 데이터 (Data) |
| 형태 | 함수: `(Story) => <Wrapper><Story /></Wrapper>` | 객체: `{ key: 'value' }` |
| 주요 목적 | 컴포넌트를 다른 컴포넌트(Provider 등)나 HTML 태그로 감싸기 | Storybook의 기능 및 애드온(Addon) 설정하기 |
| '컨테이너' 관점 | 직접 마크업을 생성하여 컴포넌트를 중앙에 배치 | Storybook 내장 기능에 신호를 보내 중앙에 배치하도록 지시 |
| 예시 (중앙 정렬) | `(Story) => <div style={{...}}><Story/></div>` | `layout: 'centered'` |
| 주요 사용 사례 | Context Provider 제공 (Theme, Redux 등), 라우터 제공, 전역 스타일, 커스텀 레이아웃 적용, 상태 주입 (`useState`) | 애드온 제어 (Actions, Controls), 배경색 설정 (Backgrounds Addon), 뷰포트 설정 (Viewport Addon), 문서(Docs) 페이지 설정 |

<!-- from PDF p.7 -->
**1. Decorator를 사용하는 방식**

Decorator는 개발자가 직접 `div` 같은 태그로 스토리를 감싸는 코드를 작성하는 것입니다. 이를 통해 아주 세밀하고 복잡한 커스텀 레이아웃을 구현할 수 있습니다.

```js
// MyComponent.stories.js

export default {
  title: 'Example/MyComponent',
  component: MyComponent,
  // 이 컴포넌트의 모든 스토리를 감싸는 Decorator
  decorators: [
    (Story) => (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f0f0'
      }}>
        <Story />
      </div>
    ),
  ],
};
```

- **장점**: 완전한 커스텀이 가능합니다. 원하는 어떤 HTML 구조와 CSS 스타일이든 적용할 수 있습니다.
- **단점**: 간단한 기능을 위해 코드를 직접 작성해야 합니다.

<!-- from PDF p.8 -->
**2. Parameter를 사용하는 방식**

Parameter는 Storybook에 내장된 기능이나 특정 애드온에게 "이렇게 동작해 줘" 라고 알려주는 설정값입니다. 예를 들어 `layout: 'centered'` 라는 파라미터를 설정하면, Storybook의 내부 로직이 알아서 컴포넌트를 중앙에 배치하는 스타일을 적용해 줍니다. 개발자가 직접 `div` 를 만들지 않습니다.

```js
// MyComponent.stories.js

export default {
  title: 'Example/MyComponent',
  component: MyComponent,
  // 이 컴포넌트의 모든 스토리에 적용될 Parameters
  parameters: {
    // Storybook UI에게 'layout'을 'centered'로 설정하라고 지시
    layout: 'centered',
    // Backgrounds 애드온에게 배경색 옵션을 제공
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#333333' },
      ],
    },
  },
};
```

- **장점**: 매우 간편합니다. 약속된 키워드 하나로 복잡한 기능을 활성화할 수 있습니다.
- **단점**: 정해진 옵션 내에서만 설정할 수 있습니다. `centered` 외에 `fullscreen`, `padded` 등이 있지만, 아주 세밀한 조정은 불가능합니다.

<!-- from PDF p.9 -->
**언제 무엇을 쓸까요?**

- **Decorator를 사용해야 할 때**:
  1. `ThemeProvider`, `QueryClientProvider`, `Router` 등 React Context Provider를 컴포넌트들 감싸주어야 할 때
  2. `layout: 'centered'` 로도 해결하기 힘든 복잡한 레이아웃을 구현해야 할 때
  3. 모든 스토리에 공통적인 배경 및 스타일을 적용하고 싶을 때
  4. 스토리에 `useState` 같은 상태를 주입할 때

- **Parameter를 사용해야 할 때**:
  1. 애드온의 동작을 제어할 때 (예: `parameters: { actions: { argTypesRegex: '^on.*' } }`)
  2. 배경색을 포함한 간단한 뷰포트 기능(`centered`, `padded`) 사용할 때
  3. 배경색, 뷰포트를 포함한 Storybook UI 설정을 설정할 때
  4. Controls 애드온에서 특정 인수를 숨기거나 재정렬(`parameters: { controls: { exclude: ['id'] } }`) 할 때

