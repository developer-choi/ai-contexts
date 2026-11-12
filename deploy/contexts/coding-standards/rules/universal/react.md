# React 컴포넌트 작성 규칙

## 조건부 루트 HTML 구조 금지

컴포넌트의 루트 마크업 구조는 prop·children 유무에 따라 달라지지 않게 고정한다. 다형성이 필요하면 asChild처럼 명시적 opt-in prop으로만 제공한다.

루트가 조건에 따라 갈리면 같은 `className` prop이 케이스마다 다른 요소에 붙고, 부모 셀렉터(`.group > *`)도 케이스마다 다르게 매칭된다.

```tsx
// ❌ Bad — children 유무로 루트가 bare <input> / <label> 래핑으로 갈림
if (children === undefined) {
  return input;          // bare <input>
}
return <label>{input}<span>{children}</span></label>;

// ✅ Good — 루트는 항상 <label>, 텍스트 span만 조건부
return (
  <label className={clsx(styles.option, styles.styled, className)}>
    <input ... />
    {children && <span className={styles.label}>{children}</span>}
  </label>
);
```
