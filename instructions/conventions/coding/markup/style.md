## CSS 기본값 속성 사용 금지

브라우저 기본값과 동일한 CSS 속성은 작성하지 않습니다.

```scss
// ❌ Bad - 브라우저 기본값과 동일
.text {
  font-weight: 400;
  font-style: normal;
  text-align: left;
  opacity: 1;
  visibility: visible;
  overflow: visible;
}

// ✅ Good - 기본값이 아닌 것만 명시
.text {
  font-weight: 700;
}
```

기본값을 반복 작성하면 의도가 불분명해지고 불필요한 코드가 늘어납니다.
값을 명시한다는 것은 "기본값에서 변경했다"는 의도를 담아야 합니다.

---

## SCSS 사용

### CSS Modules
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

### @use 지시어 사용
@import 대신 @use를 사용해야합니다.


### Dart Sass 모듈 시스템 필수
- @use 'sass:list', @use 'sass:map' 사용
- nth() → list.nth(), map-get() → map.get()

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

## 코드 주석 지양
코드 작성 시 **주석을 절대 작성하지 않습니다.** 
- 코드는 그 자체로 의도가 드러나야 합니다. 주석이 필요하다는 것은 코드의 가독성이 떨어진다는 증거일 수 있습니다.
- 변수명과 함수명을 명확하게 지어 로직을 설명하세요.
- 비즈니스 로직이나 구현 상세를 설명하는 주석은 일절 금지합니다. (단, 라이브러리 제약이나 특수한 환경 등으로 인한 우회 로직 등 '이유'가 반드시 필요한 경우에만 예외적으로 아주 짧게 작성할 수 있습니다.)