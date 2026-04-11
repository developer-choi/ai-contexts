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

## SCSS 파일 관리
- 컴포넌트와 동일한 디렉토리에 SCSS 파일을 생성합니다.
- 모든 스타일은 별도의 SCSS 파일로 분리하여 작성합니다.

