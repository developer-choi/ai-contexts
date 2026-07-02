### Won't be included in your production bundle.

A component's stories are defined in a story file that lives alongside the component file.  
The story file is for development-only, and it won't be included in your production bundle.

### Story vs Meta

.stories.tsx 파일에 default export 하는건 meta고,  
.stories.tsx 파일에 named export 하는게 바로 Story임.

### meta (default exported)

The default export metadata controls how Storybook lists your stories and provides information used by addons.

<!-- from PDF p.1 -->
```tsx
// Replace your-framework with the framework you are using, e.g. react-vite, nextjs, nextjs-vite:
import { type Meta } from '@storybook/your-framework';

import { Button } from './Button';

const meta = {
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
```

default로 export 하는건 무조건 meta가 되야하는구나.

meta에 export될 수 있는 내용중 특히 중요한건

1. title / component 택1 필수임.
2. id도 가능.

Starting with Storybook version 7.0, story titles are analyzed statically as part of the build process.  
The default export must contain a title property that can be read statically or a component property from which an automatic title can be computed.  
Using the id property to customize your story URL must also be statically readable.

### What's the Story?

A story is an object that describes **how to render a component**.

It's an object with **annotations** that describe the component's behavior and appearance given a set of arguments.

- 이런 인풋이 들어가면
- 어떤 아웃풋이 나오는지 확인

A story **captures** the rendered state of a UI component.

- 스냅샷?의 의미도 있음.

### Defining story

Use the named exports of a CSF file to define your component's stories.  
We recommend you use ***UpperCamelCase*** for your story exports.

<!-- from PDF p.2 -->
```tsx
const meta = {
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button',
  },
};
```

여기서 Primary가 Story임.

#### rename

You can rename any particular story you need.  
For instance, to give it a **more accurate** name.

<!-- from PDF p.3 -->
```tsx
export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button',
  },
};
```

이렇게 구현된걸

⇒

```tsx
export const Primary: Story = {
  // 👇 Rename this story
  name: 'I am the primary',
  args: {
    label: 'Button',
    primary: true,
  },
};
```

이렇게 name 추가하면 rename됨.

Your story will now be shown in the sidebar with the given text.

### Story 적용범위

Story / Component / Global 총 3단계로 범위에 원하는 설정을 적용할 수 있고,  
CSS 우선순위마냥 Global > Component > Story 순으로 설정이 우선적으로 적용된다.

#### 필요성

If you find yourself re-using the same args for most of a component's stories, you should consider using [component-level args](https://storybook.js.org/docs/writing-stories/args#component-args).  
모든 컴포넌트에 적용해야하는 설정이 있을 때 Story가 아닌 Component 레벨에 적용한다거나.

#### 예시

[args](https://storybook.js.org/docs/writing-stories/args#story-args)

## 스토리 단위

스토리 기준은 props 종류별로 하나씩.  
근데 그걸 제외한 나머지만 control에서 바꿀 수 있게.
