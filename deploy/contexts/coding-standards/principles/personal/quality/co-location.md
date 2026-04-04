# Co-location: 재사용하지 않으면 같은 파일에 둔다

## 원칙

Hook, 헬퍼 함수, 하위 컴포넌트를 별도 파일로 분리하는 기본 조건은 **재사용 여부**다.

- 한 파일에서만 사용한다면, 같은 파일에 둔다.
- 두 곳 이상에서 사용하는 순간, 별도 파일로 분리한다.

## 근거

관련 코드가 가까울수록 찾기 쉽다(응집도).

파일을 분리하면 "어느 폴더에 넣을 것인가"라는 분류 문제가 따라오는데, 이 분류 기준(FSD, DDD 등)은 아직 단일 표준이 없을 정도로 합의가 어렵다. 재사용하지 않는 코드까지 분리하면 분류 비용만 늘어난다.

## 분리가 필수인 경우

```tsx
// A 페이지와 B 페이지에서 useProductList()를 사용하는 경우

// Bad - 예측 불가
import { useProductList } from '@/pages/A/ProductListPage';

// Good - 예측 가능
import { useProductList } from '@/hooks/useProductList';
```

공통 로직이 특정 페이지 파일에 있을 것이라 예상하는 개발자는 없다. 재사용이 확정되면 그때 분리한다.

## 같은 파일 배치 예시

```tsx
// ProductListPage.tsx

function ProductListPage() {
  const { list, isLoading } = useProductList();
  const { currentFilter } = useProductFilter();

  return (
    <div>
      <FilterForm />
      <List items={list} isLoading={isLoading} />
    </div>
  );
}

function useProductList() { /* ... */ }
function useProductFilter() { /* ... */ }
```

Hook을 다른 곳에서 재사용하지 않는다면, 같은 파일에 두는 것이 탐색 비용을 줄인다.
