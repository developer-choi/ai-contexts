## CSS Modules

```scss
// index.module.scss
.container {
  display: flex;
  align-items: center;

  &:nth-of-type(even) {
    background-color: aliceblue;
  }

  > a {
    text-decoration: underline;
  }
}

.loading {
  cursor: progress;
}
```

---

## classnames 라이브러리 사용

```typescript
import classNames from 'classnames';
import styles from './index.module.scss';

// ✅ Good
<div className={classNames(styles.container, {
  [styles.error]: error,
  [styles.disabled]: disabled
})} />

<button className={classNames(styles.button, className)} />
```

---

## SCSS 파일 관리
- 컴포넌트와 동일한 디렉토리에 SCSS 파일을 생성합니다.
- 모든 스타일은 별도의 SCSS 파일로 분리하여 작성합니다.

---

## SVG
- `<svg>` 태그를 직접 작성하지 않는다.
- SVG가 필요하면 사용자에게 에셋 파일 추출을 요청한다.
