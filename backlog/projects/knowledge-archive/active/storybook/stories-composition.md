# 여러 컴포넌트를 위한 스토리 (Composition)

한 컴포넌트에 여러 스토리를 두고 서로 조합하거나, 부모-자식 컴포넌트의 스토리를 함께 문서화하는 패턴. args를 다른 스토리로 재사용하는 것이 핵심 도구다.

## Multiple stories

You can have multiple stories per component, and those stories can build upon one another.

<!-- from PDF p.4-5 -->
```tsx
export const Primary: Story = {
  args: {
    backgroundColor: '#ff6',
    label: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    ...Primary.args,
    label: '😎 😍 💯 🎉',
  },
};
```

## Reuse stories

What's more, you can import args to reuse when writing stories for other components, and it's helpful when you're building **composite** components.  
For example, if we make a ButtonGroup story, we might remix two stories from its child component Button.

<!-- from PDF p.5-6 -->
```tsx
import { ButtonGroup } from '../ButtonGroup';

// 👇 Imports the Button stories
import * as ButtonStories from './Button.stories';

const meta = {
  component: ButtonGroup,
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pair: Story = {
  args: {
    buttons: [{ ...ButtonStories.Primary.args }, { ...ButtonStories.Secondary.args }],
    orientation: 'horizontal',
  },
};
```

## Parent / Child Component (셋트)

Sometimes you may have two or more components created to work together. For instance, if you have a parent List component, it may require child ListItem components.

<!-- from PDF p.6 — bad pattern 1 -->
```tsx
export const OneItem: Story = {
  render: (args) => (
    <List {...args}>
      <ListItem />
    </List>
  ),
};

export const ManyItems: Story = {
  render: (args) => (
    <List {...args}>
      <ListItem />
      <ListItem />
      <ListItem />
    </List>
  ),
};
```

이렇게 하는것도 별로임.

<!-- from PDF p.6 — bad pattern 2 -->
```tsx
// 👇 We're importing the necessary stories from ListItem
import { Selected, Unselected } from './ListItem.stories'

const meta = {
  component: List,
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ManyItems: Story = {
  render: (args) => (
    <List {...args}>
      <ListItem {...Selected.args} />
      <ListItem {...Unselected.args} />
      <ListItem {...Unselected.args} />
    </List>
  ),
};
```

ListItem에 대한 스토리를 따로 만들었다 가정하고, 그 ListItem을 사용하는 List에 대한 스토리를 이렇게 만들어도 별로임.

<!-- from PDF p.7 — subComponents 해결책 -->
하지만 이렇게 하면 문제가 생깁니다. List 스토리에서 ListItem 컴포넌트를 직접 임포트하는 경우, ListItem.stories에서 Selected 스토리의 `args`를 가져와서 ListItem에 {...Selected.args}로 적용하는 방식입니다. ListItem의 이 특정 상태에 대한 args를 가져와서 직접 ListItem 컴포넌트에 넣는 것은 ListItem 스토리와의 상태 공유에 도움이 됩니다.

즉, List 스토리에서 ListItem 스토리에서 `Selected.args`를 사용하게 됩니다.  
결과로는 List 스토리에서 ListItem 스토리의 args를 통해 ListItem의 `selected` 상태를 가져와서 적용하게 됩니다.

### 해결방법 > subComponents meta

[https://storybook.js.org/docs/writing-stories/stories-for-multiple-components](https://storybook.js.org/docs/writing-stories/stories-for-multiple-components)

When the components you're documenting have a parent-child relationship, you can use the `subcomponents` property to document them together.

This is especially useful when the child component is not meant to be used on its own, but only as part of the parent component.

이후 내용은 진짜 이런 컴포넌트가 있을 때 찾아보고 추가할 예정.
