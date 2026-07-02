# Controls 패널이 동작하려면 useArgs를 써야 한다

## 동기

Storybook의 Controls 패널에서 control을 토글해도 스토리가 반응하지 않는 케이스가 있다. argTypes/args를 다 정의했는데도 prop이 안 바뀌는 것처럼 보여 디버깅에 시간이 든다. 원인은 거의 항상 render 함수 안에서 `useState`로 로컬 상태를 들고 있어서 args를 무시하는 패턴이다.

## 증상

- 우측 Controls 패널의 input/toggle을 조작해도 캔버스 미리보기가 그대로
- 필수 props(`open*`, `aria-label*` 등) 옆에 "Setup controls" 링크가 떠 있음
- args를 합쳐도(meta level argTypes + story args) 동작 안 함
- 같은 컴포넌트의 다른 스토리(Playground 등)는 정상 — 그래서 더 헷갈림

## 원인

스토리의 `render`가 다음 둘 중 하나로 갈린다.

| 패턴 | args 동작 |
|---|---|
| `render: () => { const [open, setOpen] = useState(false); ... }` | args 무시 (로컬 state) |
| `render: (args) => { const [{ open }, updateArgs] = useArgs<StoryArgs>(); ... }` | args와 양방향 바인딩 |

`useState` 패턴은 `setOpen(true)` 호출로 상태를 바꿔도 Storybook args는 변하지 않고, args가 바뀌어도 컴포넌트는 모름. 분리된 두 상태 채널이 된다.

`useArgs`는 Storybook 내부 args store와 직접 연결된 hook. 캔버스에서 `updateArgs({ open: true })`로 상태를 바꾸면 Controls 패널이 같이 갱신되고, Controls에서 토글해도 캔버스가 갱신된다.

## 해결 패턴

```tsx
import { useArgs } from 'storybook/preview-api';

interface StoryArgs {
  open: boolean;
  'aria-label': string;
  backgroundColor: 'canvas' | 'surface';
}

const meta = {
  title: 'Components/MySheet',
  component: MySheet.Root,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean', description: '...' },
    backgroundColor: { control: 'inline-radio', options: ['canvas', 'surface'] },
    // ...
  },
} satisfies Meta<typeof MySheet.Root>;

export const Playground: StoryObj<StoryArgs> = {
  args: { open: false, 'aria-label': '...', backgroundColor: 'canvas' },
  render: (args) => {
    const [{ open }, updateArgs] = useArgs<StoryArgs>();
    return (
      <>
        <Button onClick={() => updateArgs({ open: true })} label="열기" />
        <MySheet.Root
          open={open}
          onClose={() => updateArgs({ open: false })}
          aria-label={args['aria-label']}
          backgroundColor={args.backgroundColor}
        >
          {/* 시트 내부 닫기 핸들러도 updateArgs로 통일 */}
        </MySheet.Root>
      </>
    );
  },
};
```

## 가이드라인

- **`render`에 `useState` 쓰지 마라**. open/close, 토글 등 모든 상호작용 상태는 `useArgs`로 args에 묶는다
- **`argTypes`는 meta 레벨에 두기**. 같은 컴포넌트의 여러 스토리가 동일 props를 노출하면 meta에 한 번만 선언하고 각 스토리는 `args`로 초기값만 다르게
- **각 스토리에 `args` 전부 명시**. 일부만 명시하면 누락된 prop은 controls에서 비활성 상태로 보임. SurfaceBackground 스토리에 `backgroundColor: 'surface'`만 두고 `disableBottomPadding`을 빼지 말 것 — 토글하고 싶으면 모두 args에 둬야 함
- **시트 내부 닫기 버튼/swipe close도 `updateArgs({ open: false })`**. `setOpen` 같은 로컬 핸들러 만들지 말 것
- **autodocs 사용 시 더 중요**. autodocs는 모든 props를 자동 노출하므로 args가 누락되면 "Setup controls" 링크가 그대로 노출되어 사용자가 혼란

## 안티패턴

```tsx
// ❌ args 무시, Controls 무력화
render: () => {
  const [open, setOpen] = useState(false);
  return <MySheet.Root open={open} onClose={() => setOpen(false)} aria-label="..." />;
}

// ❌ args 부분 누락 → 누락된 prop의 control은 작동 안 함
args: { open: false, 'aria-label': '...' },  // backgroundColor 누락
render: (args) => {
  const [{ open }, updateArgs] = useArgs();
  return <MySheet.Root open={open} aria-label={args['aria-label']} backgroundColor="surface" />;
  //                                                              ^^^^^^^^^^^^^^^^^^^^^^^^^^ args 안 거치고 하드코딩
}
```

## References

- https://storybook.js.org/docs/writing-stories/args#setting-args-from-within-a-story — `useArgs` 공식 가이드
- Langdy 적용 사례: `langdy-design-system` PR `fix/full-screen-sheet`의 FullScreenSheet 스토리 4개 — Playground만 useArgs였고 나머지 3개는 useState라 controls 무력화돼 있었음. 모두 useArgs로 통일하면서 argTypes를 meta로 끌어올림.
