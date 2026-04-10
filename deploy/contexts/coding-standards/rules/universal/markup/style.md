## 불필요한 CSS 속성 사용 금지

### 브라우저 기본값 반복 금지

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

### 암묵적으로 적용되는 속성 반복 금지

- `width: 100%` — Block 요소는 기본적으로 부모 너비를 채우므로 불필요
- `display: flex` — 자식 요소 배치나 정렬 목적 없이 컨테이너에만 적용된 경우 불필요

---

## SCSS 사용

### Dart Sass 모듈 시스템
- @use 'sass:list', @use 'sass:map' 사용

