## 정리

스토리는 사실상 args가 전부임. args가 제일 중요하고, 다른 애드온도 결국 args임.

여러 컴포넌트를 조합/재사용하는 스토리 패턴은 [`stories-composition.md`](./stories-composition.md) 참고.

## args

Storybook uses the generic term arguments (args for short) when talking about React's props, Vue's props, Angular's @Input, and other similar concepts.

You can use them while creating your component's stories if you need them, although you should treat them as an advanced use case.  
We recommend [args](https://storybook.js.org/docs/writing-stories/args) as much as possible when writing your own stories.

<!-- from PDF p.2 -->
```tsx
const ButtonWithHooks = () => {
  // Sets the hooks for both the label and primary props
  const [value, setValue] = useState('Secondary');
  const [isPrimary, setIsPrimary] = useState(false);

  // Sets a click handler to change the label's value
  const handleOnChange = () => {
    if (!isPrimary) {
      setIsPrimary(true);
      setValue('Primary');
    }
  };
  return <Button primary={isPrimary} onClick={handleOnChange} label={value} />;
};

export const Primary = {
  render: () => <ButtonWithHooks />,
```

Args can be used to dynamically change props, slots, styles, inputs, etc.  
It allows Storybook and its addons to live edit components.  
You do not need to modify your **underlying component code** to use args.

- Storybook은 테스트 코드처럼, 원본 소스코드를 단 1도 바꾸지않음. 그럴 필요도 없고.

When an arg's value changes, the component re-renders, allowing you to interact with components in Storybook's UI via addons that affect args.

### args는 사실 굉장한 기능임.

저따구로 코드를 작성하면… 생기는 일은,

<!-- from PDF p.3 — Conflicts with args mechanism -->
**args를 통한 컴포넌트 제어 메커니즘과 충돌 (Conflicts with `args` mechanism):**

- Storybook이 각 Button에 설정하는 args를 통해 `isPrimary` 같은 버튼의 프롭들을 독립적으로 제어하고 싶어도 안 됩니다.
- 하지만, Addon Panel에서 이 프롭들을 변경하면 컴포넌트의 입력에 관한 단일 상태를 실시간으로 확인할 수 있게 해주는 것 등이 전부 망가집니다.

<!-- from PDF p.3-4 — Reduced Testability and Reproducibility -->
**테스트 가능성 및 재현성 저하 (Reduced Testability and Reproducibility):**

- 스토리의 목적 컴포넌트의 다양한 상태를 보여주는 것인데, args를 사용하지 않으면 각 상태를 재현하고 쉽게 테스트할 수 없게 됩니다. 특히 Snapshot 테스트를 생성하기가 까다로워집니다. 실제 변경은 사용자 인터랙션에 달려있기 때문에.
- args를 사용하면, 버튼의 Primary, Secondary 같은 여러 상태를 쉽게 표현하고 독립적인 스토리로 관리할 수 있는 가능성이 높아집니다.

꼭 Hooks가 문제가 아님. 컴포넌트 안에서 비즈니스 로직을 저렇게 작성하면 안된다는 소리임.

<!-- from PDF p.4 — Increased Story Complexity and Maintenance Difficulty -->
**스토리의 복잡성 증가 및 유지수수 어려움 (Increased Story Complexity and Maintenance Difficulty):**

- 스토리는 가능한 한 단순하고 선언적인 컴포넌트 프롭 셋을 기반 상태를 보여주는 것 중점을 둬야 합니다. React Hooks를 사용하면 스토리 내 분기 로직이 복잡해지고, 특정 상태에 이르기 위해 사용자가 단계를 따라야 할 수 있습니다.
- 이로 인해 컴포넌트를 어떻게 Storybook에서 살펴보고 테스트할지에 대한 이해가 어려워집니다. 상태 변경은 결국 onClick 핸들링 함수가 실행됨으로서 가능해지기 때문임.
- 또, 실제 컴포넌트 안에 Hooks를 사용함으로서 그 안에 비즈니스 로직이 들어가게 된다면, 이런 컴포넌트 내부를 어떻게 어떻게 알맞게 행동하는지 테스트하기 위한 스토리를 제작하거나 재현하기 더 까다로워집니다.

근데 이럼, 비즈니스 로직 들어가는 대부분의 컴포넌트는 스토리로 어케만듬?  
Mock API마냥 모킹 오지게 해야하는거아냐?

**Storybook addon과의 감소된 시너지 (Reduced Synergy with Storybook Addons):**

- Storybook이 여러 핸들 컴포넌트 상태를 관리하기 위해 사용할 수 있는 기능인 Controls Addon, Actions Addon 등이 있습니다.
- 스토리 내부에서 Hooks를 사용하면 상태를 관리하고 변경하는 기능을 강화할 수 있는 이런 애드온들이 동작하지 않을 수 있습니다.

즉 Hooks가 문제가 아니라, 컴포넌트 안에서 비즈니스 로직을 저렇게 작성하면 안 됩니다.

---

## Setting args through the URL

[https://storybook.js.org/docs/writing-stories/args#setting-args-through-the-url](https://storybook.js.org/docs/writing-stories/args#setting-args-through-the-url)

<!-- from PDF p.8 -->
Storybook에서는 웹 주소(URL)에 파라미터를 직접 추가해서, 보고 있는 스토리의 `args` 값을 실시간으로 변경하거나 덮어쓸 수 있습니다. 보통은 Controls 애드온을 사용하지만, URL로도 제어가 가능합니다.

**핵심 내용:**

1. **사용 방법**: URL 경로 뒤에 `&args=` 를 붙이고, `키:값` 형태의 파라미터를 세미콜론(`;`)으로 구분하여 여러 개 전달할 수 있습니다.
   - **예시**: `?path=/story/avatar--default&args=style:rounded;size:100`
   - 위 예시는 `style` arg를 `'rounded'`로, `size` arg를 `100`으로 설정합니다.

2. **보안**: XSS 공격을 막기 위해, URL에 사용할 수 있는 문자는 영문, 숫자, 공백, 밑줄(`_`), 대시(`-`)로 제한됩니다. 다른 특수문자는 무시됩니다.

3. **특수 값 입력**: 객체, 배열, `null` 같은 복잡한 데이터는 정해진 규칙에 따라 URL로 전달할 수 있습니다.
   - `null` 값: `arg이름:!null` 처럼 값 앞에 느낌표(`!`)를 붙입니다.
   - 객체/배열: `obj.key:val` 또는 `arr[0]:one` 같은 형식으로 입력합니다.

4. **우선순위**: URL로 전달된 `args`는 스토리 파일에 설정된 기본 `args` 값보다 우선순위가 높아서, 기존 값을 덮어쓰게 됩니다.
