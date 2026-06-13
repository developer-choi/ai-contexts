# 방향성 정의 1회차. InputBase의 책임은 어디까지인가

## 목표

모든 입력 계열 컴포넌트가 공유하는 시각적 레이아웃 베이스 컴포넌트 `InputBase`를 만듭니다.

### 목표 1. 베이스 컴포넌트를 만들어서 다양하게 확장합니다

1. 아이콘 없이 사용하면 `TextField`
2. 오른쪽에 눈 아이콘을 넣으면 `PasswordTextField`
3. 오른쪽에 화살표를 넣고 아래에 메뉴를 붙이면 `SelectField`
4. 세로로 길게 늘리면 `TextAreaField`

### 목표 2. 공통된 스타일을 주입합니다

1. 테두리
2. 안쪽 패딩
3. 왼쪽 리딩(leading)
4. 우측 트레일링(trailing)

## 왜 구현 방법이 중요한가

InputBase가 `<input>`을 직접 렌더링하면, 모든 확장 컴포넌트에 공통 동작을 한 곳에서 적용할 수 있습니다.

하지만 TextAreaField는 `<textarea>`가 필요하고, SelectField도 구현에 따라 `<button>` 등 `<input>`이 아닌 요소가 들어갈 수 있습니다. InputBase 안에 요소 타입별 분기가 생기거나 교체 메커니즘이 필요해집니다.

반대로 InputBase가 내부 요소를 모르면, API는 단순해지지만 공통 동작을 적용할 수단이 없어집니다.

**InputBase에 `<input>`을 넣을지 말지가 이 컴포넌트의 책임 범위를 결정합니다.**

현재 InputBase 코드 스케치:

```tsx
export function InputBase() {
  return (
    <div className="레이아웃 + 상태 스타일링()">
      {leading && <span className={styles.slot}>{leading}</span>}
      <span className={styles.content}>
        {/* TODO 이 자리에 <input>이 들어갈 수도, 아닐 수도 */}
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </span>
      {trailing && <span className={styles.slot}>{trailing}</span>}
    </div>
  );
}
```

## 구현 방법

### 방법 1. `<input>`을 직접 렌더링

```tsx
export function InputBase(veryManyProps) {
  return (
    <label {...rest}>
      {leading && <span className={styles.slot}>{leading}</span>}
      <span className={styles.content}>
        <input {...veryManyProps} onClick={() => alert('모든 인풋에 공통 동작 적용 가능')} />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </span>
      {trailing && <span className={styles.slot}>{trailing}</span>}
    </label>
  );
}
```

radix-themes도 이 방식을 사용합니다. 컴포넌트 안에 `<input>`이 직접 들어있습니다:

```tsx
const TextFieldRoot = React.forwardRef<TextFieldRootElement, TextFieldRootProps>((props, forwardedRef) => {
  return (
    <div className={classNames('rt-TextFieldRoot', className)}>
      <input
        spellCheck="false"
        {...inputProps}
        ref={composeRefs(inputRef, forwardedRef)}
        className="rt-reset rt-TextFieldInput"
      />
      {children}
    </div>
  );
});
```

**장점:**

- 의미상 통일이 가능합니다. 모든 인풋에 일괄적으로 공통 요구사항을 적용할 수 있어서, 디자이너가 공통 스펙을 요구해도 한 곳에서 대응할 수 있습니다.

**단점:**

1. InputBase의 props가 많아집니다.
2. `<textarea>` 대응이 불가능합니다. `<button>`을 내부 폼 요소로 사용하고 싶어도 할 수 없고, 새로운 폼 컴포넌트가 생겨도 대응이 어렵습니다.

### 방법 2. children으로 주입

as 방식이든 render props든 어떤 형태든, 외부에서 내부 요소를 주입하는 접근입니다. 그중 가장 단순한 children 방식을 예시로 가져왔습니다.

```tsx
export function InputBase({leading, trailing, suffix, children, ...rest}) {
  return (
    <div className="레이아웃 + 상태 스타일링()">
      {leading && <span className={styles.slot}>{leading}</span>}
      <span className={styles.content}>
        {children}
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </span>
      {trailing && <span className={styles.slot}>{trailing}</span>}
    </div>
  );
}
```

사용하는 쪽:

```tsx
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(props, ref) {
  return (
    <InputBase {...commonProps}>
      <textarea ref={ref} className={styles.textarea} {...textareaProps} />
    </InputBase>
  );
});
```

**장점:**

- API가 단순합니다.
- 어떤 요소든 들어갈 수 있습니다. `<input>`, `<textarea>`, `<button>` 모두 대응 가능합니다.

**단점:**

- 모든 인풋에 적용하고 싶은 공통 동작이 있어도, InputBase에서 통일할 수 없습니다. TextField, PasswordTextField, TextAreaField, SelectField 각각에 넣어야 합니다.

소비자 계층으로 보면:

- **레이어 0** (최상위 부모) = InputBase
- **레이어 1** (1차 소비자) = TextField, PasswordTextField, TextAreaField, SomeField
- **레이어 2** (2차 소비자) = 랭디 어드민, 학습자, 선생님

레이어 0은 레이아웃과 스타일만 담당합니다. 1차 소비자마다 코드 중복이 발생할 수 있으며, 이는 별도로 해결해야 합니다.

### 방법 3. MUI 방식 — 둘 다 지원

방법 2의 장점을 가져가면서 방법 1의 장점도 취하려는 접근입니다.

MUI는 `<TextField>`에 `multiline` prop을 전달하면 내부적으로 `<textarea>`로 렌더링되도록 분기합니다:

```tsx
if (multiline && InputComponent === 'input') {
  if (rows) {
    inputProps = {type: undefined, minRows: rows, maxRows: rows, ...inputProps};
  } else {
    inputProps = {type: undefined, maxRows, minRows, ...inputProps};
  }
  InputComponent = TextareaAutosize;
}
```

**장점:**

- 두 가지 방법의 장점을 모두 챙길 수 있습니다.

**단점:**

- InputBase 안에서 textarea인지를 따지는 분기문이 들어가야 하므로, 코드 복잡도가 높아집니다. `<textarea>` 외에도 `<button>` 등 전혀 다른 요소가 들어올 수 있어서, 분기는 계속 늘어날 수 있습니다.

### 방법 4. (번외) Radix 방식 — 컴포넌트마다 독립 구현

Radix는 베이스 컴포넌트 없이 각 컴포넌트가 내부 요소를 직접 렌더링합니다:

```tsx
// TextField — <input> 직접 렌더링
<div className={classNames('rt-TextFieldRoot', className)}>
  <input {...inputProps} className="rt-reset rt-TextFieldInput" />
  {children}
</div>

// TextArea — <textarea> 직접 렌더링
<div className={classNames('rt-TextAreaRoot', className)}>
  <textarea {...textAreaProps} className="rt-reset rt-TextAreaInput" />
</div>

// SelectTrigger — <button> 직접 렌더링
<button {...triggerProps} className={classNames('rt-reset', 'rt-SelectTrigger', className)}>
  <span className="rt-SelectTriggerInner">
    <SelectPrimitive.Value placeholder={placeholder}>{children}</SelectPrimitive.Value>
  </span>
  <SelectPrimitive.Icon asChild>
    <ChevronDownIcon className="rt-SelectIcon" />
  </SelectPrimitive.Icon>
</button>
```

세 컴포넌트가 공유하는 베이스가 없으므로, 공통 레이아웃이나 스타일을 일괄 적용할 수 없습니다.

## 결론

확장성과 API 단순함을 고려하면 **방법 2(children)가 적합하다고 판단했습니다.**

- **역할**: 폼 요소의 베이스
- **책임 범위**: 레이아웃(3-slot: leading / content / trailing)과 상태 스타일링(disabled, invalid, focused 등)
- **내부 요소**: 완성형 컴포넌트(TextField, SelectField 등)가 외부에서 렌더링
