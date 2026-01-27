# 상품 리스트 페이지 리팩토링 예제

> 추출이 아닌 추상화, 응집도, 관심사 분리

---

## 1. 추출이 아닌 추상화

### 1-1. 최초 코드

```tsx
function ProductListPage() {
  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getListApi()
      .then(data => setList(data))
      .finally(() => setIsLoading(false));
  }, []);

  const params = useSearchParams();
  const currentFilter = params.get('filter');

  return (
    <div>
      <form>{/* 필터 */}</form>
      <ul>{/* 목록 */}</ul>
    </div>
  );
}
```

### 1-2. ❌ 잘못된 리팩토링: 단순 추출

```tsx
function ProductListPage() {
  const { list, isLoading, currentFilter } = useProductListPage();

  return (
    <div>
      <form>{/* 필터 */}</form>
      <ul>{/* 목록 */}</ul>
    </div>
  );
}
```

만약, 같은 회사 동료가 아니라 **새로 입사한 사람**이 이 코드를 본다고 하면,

1. `useProductListPage()` **내부를 보지 않으면 어떤 역할을 하는지 알 수 없습니다.**
2. 이름이 "페이지 관련 무언가"라는 모호한 정보만 전달합니다.
3. `src/hooks/useProductListPage.ts`처럼 추출하면 파일 탐색도 어려워집니다.
4. 신규입사자는 **머릿속에서** 함수와 컴포넌트를 **조립해서 이해해야 하니 인지부하가 늘어납니다.**

### 1-3. ✅ 올바른 리팩토링: 추상화

```tsx
function ProductListPage() {
  const { list, isLoading } = useProductList();
  const { currentFilter } = useProductFilter();

  return (
    <div>
      <form>{/* 필터 */}</form>
      <ul>{/* 목록 */}</ul>
    </div>
  );
}
```

Hook 내부 코드를 보지 않고도 좀 더 많은 것을 추측할 수 있게 되었습니다.

---

## 2. 파일 분리 vs 같은 파일에 배치

### 2-1. 파일 분리의 Trade-off

내가 찾는 이 코드가 어느 폴더 밑에 있는지를 생각해서 넣어야 합니다.

그런데, 그 폴더 기준은 아직도 단일 표준이 없을 정도로 (DDD, FSD) 어려운 주제입니다.

그 기준이라는 FSD 조차도, entities vs features 처럼 개발자들 간에 의견이 분분한 경우도 있습니다.  

### 2-2. 같은 파일 배치가 유효한 경우

```tsx
// ProductListPage.tsx

function ProductListPage() {
  const { list, isLoading } = useProductList();
  const { currentFilter } = useProductFilter();

  return (
    <div>
      <form>{/* 필터 */}</form>
      <ul>{/* 목록 */}</ul>
    </div>
  );
}

function useProductList() { /* ... */ }
function useProductFilter() { /* ... */ }
```

Hook을 다른 곳에서 재사용하지 않는다면, 같은 파일에 두는 것도 꼭 나쁘지만은 않다고 생각합니다.

관련된 코드는 가까울수록 찾기 좋기 때문입니다. (응집도)

`한 파일에 "함수 10개" 작성하기` vs `n개 폴더에 함수 1개짜리 "파일 10개" 만들기`
- 동료들과 사전 협의 (FSD)가 있는 경우에는 우측이 좋을 수도 있겠지만,
- 전자의 방법이 꼭 나쁘다고는 생각하지 않습니다.
- "파일이 너무 커져서 Git Conflict가 자주 발생하니까 추출하자"는 괜찮다고 생각하지만,
- "List랑 ListItem은 다른 거니까 다른 파일로 분리하자"는 좋지 않다고 생각합니다.

### 2-3. 파일 분리가 필수인 경우

```tsx
// A 페이지와 B 페이지에서 useProductList()를 사용하는 경우

// ❌ 예측 불가
import { useProductList } from '@/pages/A/ProductListPage';

// ✅ 예측 가능
import { useProductList } from '@/hooks/useProductList';
```

개발자는 공통 로직이 특정 페이지 파일에 있을 것이라 예상하지 않습니다.

따라서,

1. 이 Hook을 다른 곳에서 재사용할 것이라고 확신하거나,
2. 다른 곳에서 이 Hook을 재사용하는 순간이 찾아왔을 때

Hook을 해당 파일에서 분리하는 것도 좋다고 생각합니다.

---

## 3. 컴포넌트 분리와 관심사

### 3-1. 문제 상황

실무에서는 필터/목록 렌더링 코드가 수백 줄에 달하고, 로딩/에러 처리까지 추가됩니다.

```tsx
function ProductListPage() {
  const { list, isLoading, isError } = useProductList();
  const { currentFilter } = useProductFilter();

  if (isLoading) {
    return <div>목록 불러오는중...</div>;
  }

  if (isError) {
    return <div>오류가 발생했어요.</div>;
  }

  return (
    <div>
      <form>{/* 필터 100줄 */}</form>
      <ul>{/* 목록 200줄 */}</ul>
    </div>
  );
}
```

에디터 한 화면에서 볼 수 있는 코드라인은 50줄이 안되기 때문에,

한눈에 코드가 들어오지 않습니다.

상품 리스트 페이지의 역할은 **상품 리스트 페이지를 보여주는 것**이지,

1. 리스트의 로딩을 보여주고
2. 리스트가 없으면 목록없다 보여주고
3. 리스트 불러오다 오류나면 오류났다 보여주고
4. 리스트에서 상품명은 font-size: 16px에 검은색으로 보여주고
5. 할인가는 취소선으로 처리해서 보여주고

까지 담당하게 되면 관심사가 너무 많아진다는 단점이 있습니다.

### 3-2. ✅ 관심사 분리 적용

```tsx
function ProductListPage() {
  return (
    <div>
      <FilterForm />
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense fallback={<ProductListSkeleton />}>
          <List />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

각 하위 컴포넌트의 코드를 보지 않고도,

"상품 리스트 페이지에는 위에 폼이 있고 아래에 상품 리스트가 있구나"를 알 수 있습니다.

피그마도 위에는 폼, 아래는 리스트가 있을 것이기 때문에 코드와도 1:1 매칭이 됩니다.

- 그럼 List / FilterForm 컴포넌트는 어느 파일에 작성하나요?
- 사내 컨벤션(FSD, DDD)이 **없다면** 한 파일에 두는 것도 나쁘지 않다고 생각합니다.