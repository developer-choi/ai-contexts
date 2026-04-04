# React 컴포넌트 작성 원칙

## Skeleton 컴포넌트 작성 규칙

Skeleton은 원본 컴포넌트의 **레이아웃 클래스를 그대로 import하여 재사용**합니다. Skeleton 전용 스타일에는 뼈대(bone) 시각 효과만 정의합니다.

- **❌ Bad**: Skeleton에서 `margin-top`, `aspect-ratio` 등 레이아웃 값을 중복 선언. 원본과 값이 어긋나면 CLS 방지 효과가 없어지고, 원본 수정 시 Skeleton도 따로 수정해야 함.
- **❌ Bad**: bone 요소에 `style={{ width: '60%', height: 44, marginTop: 16 }}` 같은 inline style로 레이아웃을 지정. 원본 컴포넌트의 실제 크기와 어긋나며, 유지보수 시 두 곳을 동기화해야 함.
- **✅ Good**: 원본의 레이아웃 클래스를 가져다 쓰고, Skeleton 스타일에는 `background-color`, `animation` 등 뼈대 표현만 작성. bone 요소는 레이아웃 클래스 내부에 배치하여 크기를 자동으로 맞춤.

```tsx
// ✅ Good
import cardStyles from "./ProductCard.module.scss";
import styles from "./ProductCardSkeleton.module.scss";

export default function ProductCardSkeleton() {
  return (
    <div className={cardStyles.card}>
      <div className={`${cardStyles.imageWrapper} ${styles.bone}`} />
      <div className={cardStyles.info}>
        <div className={`${cardStyles.brand} ${styles.bone} ${styles.brandBone}`} />
      </div>
    </div>
  );
}
```
