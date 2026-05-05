# 수정하기 쉬운 코드

응집도가 높은 코드
- Coincidental cohesion
- Logical cohesion 등
- 응집도의 종류를 기반으로 피드백 할것.
- 한 함수·컴포넌트가 여러 관심사를 동시에 담당하면 응집도가 낮아진 신호입니다. 책임 단위로 함수를 분리하거나 추상화 계층을 도입할 지점인지 검토하세요.

페이지 컴포넌트에 서로 다른 관심사의 useState/useEffect가 쌓이면 응집도가 낮아집니다(Coincidental — 같은 페이지에 있다는 이유만으로 묶임). 책임별 훅으로 분리하세요.

```tsx
// ❌ 한 컴포넌트에 URL 동기화 · 데이터 페칭 · 분석 이벤트가 섞여있음
function ProductListPage() {
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSearchParams({ q: keyword });
  }, [keyword]);

  useEffect(() => {
    setIsLoading(true);
    fetchProducts(keyword).then((data) => {
      setProducts(data);
      setIsLoading(false);
    });
  }, [keyword]);

  useEffect(() => {
    track("product_list_view", { keyword });
  }, [keyword]);
}

// ✅ 관심사별 훅으로 분리 — 각 훅은 하나의 책임만 가짐
function ProductListPage() {
  const [keyword, setKeyword] = useKeywordQueryParam();
  const { products, isLoading } = useProductList(keyword);
  useProductListAnalytics(keyword);
}
```

결합도가 낮은 코드
- Content coupling
- Common coupling 등
- 결합도의 종류를 기반으로 피드백 할것.
