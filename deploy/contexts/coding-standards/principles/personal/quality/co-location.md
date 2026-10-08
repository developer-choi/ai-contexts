---
tags: [file-folder-structure]
---

# Co-location: 재사용하지 않으면 같은 파일에 둔다

## 원칙

Hook, 헬퍼 함수, 하위 컴포넌트를 별도 파일로 분리하는 기본 조건은 **재사용 여부**다.

- 한 파일에서만 사용한다면, 같은 파일에 둔다. (예외: [선승격](#선승격--한-곳에서만-써도-미리-공용-위치에-두는-조건))
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

## 선승격 — 한 곳에서만 써도 미리 공용 위치에 두는 조건

기본은 같은 파일에 둔다. 한 곳에서만 쓰는 코드라도 아래 둘 중 하나면 공용 위치(`shared/` 등)에 미리 둘 수 있다.

1. **공용 위치가 받는 성격을 이미 갖췄다.** 아래 둘을 모두 만족한다.
   - **도메인 조건**: 도메인 타입을 import하거나 도메인 상태를 문구로 바꾸는 코드가 없다. 브랜드 색·로고처럼 테마만 입힌 것은 괜찮다.
   - **시그니처 조건**: 시그니처(props·인자)에 지금 쓰는 화면의 사정이 없다 — 그 화면에서만 뜻이 있는 prop, 고정 문구, 그 화면 레이아웃용 값. 이런 게 박힌 채 올리면 두 번째 사용처가 생길 때 첫 사용처까지 고치게 된다.
2. **두 번째 사용처가 이미 정해져 있다.** 이번 작업의 기획서나 PR 분할 계획에서 그 화면을 짚을 수 있어야 한다. 나중에 옮기면 그 이동 diff가 병렬 브랜치와 충돌하므로 미리 둔다. 이때는 도메인 조건만 지키고, 시그니처 조건은 따지지 않는다.

"나중에 재사용될 것 같다"처럼 사용처를 짚지 못하는 예측은 근거가 아니다. 둘 다 아니거나 애매하면 같은 파일에 둔다.

```tsx
// Bad - 재사용 예측만으로 shared에 올렸다. 도메인 타입과 예약 상태 문구가 묻어 있다
// shared/components/StatusBadge.tsx
import type { UiStatus } from '@/reservation/schema';
const LABEL: Record<UiStatus, string> = { confirmed: '예약 확정', unavailable: '예약 불가', canceled: '취소된 예약' };

// Good - 도메인과 무관하고 시그니처가 범용이라, 한 곳에서만 써도 shared에 둔다
// shared/components/Switch.tsx
export function Switch({ checked, onChange, disabled }: SwitchProps) { /* ... */ }
```

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

Hook을 다른 곳에서 재사용하지 않는다면, 같은 파일에 둔다.
