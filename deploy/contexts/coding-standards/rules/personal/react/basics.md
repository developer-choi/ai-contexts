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
