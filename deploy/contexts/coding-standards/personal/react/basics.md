# React 컴포넌트 작성 패턴

## 파일 내 코드 순서

컴포넌트, 훅, 유틸 등 모든 파일의 코드는 아래 순서를 따릅니다. 사람은 위에서 아래로 읽으므로, **핵심(타입, export 함수)이 먼저** 오고 부수적인 것(상수, 유틸)은 뒤로 보냅니다.

1. Props 타입 정의 (`interface`, `type`)
2. `export default` 컴포넌트 함수
3. 상수 (`const ITEMS = [...]`)
4. 유틸 함수 (`function formatPrice() {}`)

```tsx
// ✅ Good
interface ProductCardProps {
  name: string;
  price: number;
}

export default function ProductCard({ name, price }: ProductCardProps) {
  return <div>{name} - {formatPrice(price)}</div>;
}

const DUMMY_ITEMS = ['a', 'b', 'c'];

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR');
}
```

---

## Named Import 사용

`React.useEffect`, `React.useState` 등 네임스페이스 접근 대신 named import를 사용합니다.

```tsx
// ❌ Bad
React.useEffect(() => { /* ... */ }, []);
React.useState(0);

// ✅ Good
import { useEffect, useState } from 'react';

useEffect(() => { /* ... */ }, []);
useState(0);
```

---

## `<button>` 직접 사용 금지

HTML 네이티브 `<button>`을 직접 사용하지 않는다. 프로젝트의 공통 `<Button>` 컴포넌트를 찾아서 사용한다.

---

## Skeleton 컴포넌트 작성 규칙

Skeleton은 원본 컴포넌트의 **레이아웃 클래스를 그대로 import하여 재사용**합니다. Skeleton 전용 스타일에는 뼈대(bone) 시각 효과만 정의합니다.

- **❌ Bad**: Skeleton에서 `margin-top`, `aspect-ratio` 등 레이아웃 값을 중복 선언. 원본과 값이 어긋나면 CLS 방지 효과가 없어지고, 원본 수정 시 Skeleton도 따로 수정해야 함.
- **✅ Good**: 원본의 레이아웃 클래스를 가져다 쓰고, Skeleton 스타일에는 `background-color`, `animation`, `width`, `height` 등 뼈대 표현만 작성.

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
