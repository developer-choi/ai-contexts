# 폴더 구조의 변화: 역할별 분리에서 도메인 중심까지

## 컨셉 (1줄)

프로젝트가 커지면서 폴더 구조를 역할별 → 계층별 → 도메인/순수 분리 → 도메인 최상위 → 엔티티 기준으로 단계적으로 진화시켜 온 과정과 각 단계의 장단점.

## 재료

### References

[https://velog.io/@teo/folder-structure](https://velog.io/@teo/folder-structure)

#### 파일을 잘 나누는 방법

기준을 잘 정하면 된다.

하지만, 프로젝트는 다양하고
모든 프로젝트에 딱맞는 하나의 규칙같은건 없더라.

- 프로젝트마다 적합한 규칙이 다르고,
- 하나의 규칙이 있어도 그걸 프로젝트 상황에 맞게 변형해야하더라.
- 아무리 기준을 잘 정하려고 해도, 그 경계가 애매한 경우가 많더라.

#### Step 1-1 역할별 분리

##### 단점

hooks / libs / utils / styles 그 밑에 파일이 많이 생기면 어떤 구조로 나눠야할지 애매하다.

파편화가 있다.

- 유저 페이지 개발하기위해
- api는 src/api/user
- utils는 src/utils/user
- type은 src/type/user

⇒
파편화로 인해 뭐 하나 수정하려면 전체 폴더를 다 이해해야함.

#### Step 1-2 (컴포넌트 한정) 계층별 분리

##### 단점

계층만으로 나누기에는 컴포넌트 갯수가 너무 많았음.
극단적으로 atom 10만개 이러면 안되니까.
결국 atom 안에서도 뭔가 추가로 나눠야했음.

##### 의의

디자인 컴포넌트는 이 구조가 잘 맞았음.
어느 페이지건 간에 버튼은 누를 수 있으니까. disabled가 있고.

하지만, 도메인 컴포넌트는 이 구조가 잘 안맞았음.
똑같은 상품카드 컴포넌트라고 하더라도,
상품리스트 / 위시리스트에서 서로 동작이 다름.

**그리고 요구사항은 도메인 중심으로 발전한다는걸 알게됨.**
물론 디자이너가 요구한다면 도메인 중심이 아닌 디자인 중심으로 얘기를 하겠지만 그런일은 잘 없음.

근데? 이 사실이 컴포넌트 뿐만아니라 다른 로직들도 동일하다는것을 발견함.
add() 같은건 어디서도 쓸 수 있지만
postBoardLike()같은건 게시판 에서만 쓰니까.

#### Step 2. 도메인 / 순수 2개를 서로 분리하자 (1뎁스는 역할로, 2뎁스는 도메인/순수 분리)

##### 방법

components, hooks, utils, api 등 각 폴더 밑에는

- 공통코드
- 도메인코드를 나눠놓자

```text
/components             # UI 컴포넌트
  /ui                   # 순수 UI (도메인 무관)
    Button.tsx
    Modal.tsx
    Card.tsx
    Input.tsx
  /product              # 제품 도메인
    ProductCard.tsx
    ProductList.tsx
  /cart                 # 장바구니 도메인
    CartItem.tsx
    CartSummary.tsx
  /layout               # 레이아웃 컴포넌트
    Header.tsx
    Footer.tsx
    Sidebar.tsx
```
<!-- from PDF p.3, image1 -->

```text
/hooks                  # 커스텀 훅
  /ui
    useModal.ts
    useDebounce.ts
  /product
    useProducts.ts
    useProductDetail.ts
  /cart
    useCart.ts
  /auth
    useAuth.ts
    usePermissions.ts
```
<!-- from PDF p.3, image2 -->

##### 장점

STEP 1 대비 최상위폴더 밑에 파일들을 구분할 2번 째 기준이 생긴다.

- 순수
- 도메인

##### 단점

여전히 파편화가 있다.

- 유저 페이지 개발하기위해
- api는 src/api/**user**/some
- utils는 src/utils/**user**/some
- type은 src/type/**user**/some

⇒
파편화로 인해 뭐 하나 수정하려면 전체 폴더를 다 이해해야함.

#### Step 3. 도메인을 최상위 기준으로 올려보자.

**기능하나 수정하려고 여기폴더 저기폴더 왔다갔다 하지 말아보자!**

```text
/src
  /Product              # 제품 도메인
    /components         # 제품 관련 컴포넌트
    /hooks              # 제품 관련 훅
    /services           # 제품 관련 API
    /utils              # 제품 관련 유틸리티

  /Cart                 # 장바구니 도메인
    /components         # 장바구니 관련 컴포넌트
    /hooks              # 장바구니 관련 훅
    /services           # 장바구니 관련 API
    /store              # 장바구니 관련 상태

  /User                 # 사용자 도메인
    /components
    /hooks
    /services
    /store

  /shared               # 공통 코드
    /components         # 공통 UI 컴포넌트
    /hooks              # 공통 훅
    /utils              # 공통 유틸리티
```
<!-- from PDF p.4, image3 -->

##### 장점

[가장 큰 장점은 비즈니스 도메인이 코드베이스에 명확히 드러난다는 점입니다.](https://velog.io/@teo/folder-structure)

#### STEP 3-1 도메인 바로 아래에서는 엔티티 기준으로 분리해보자

##### 엔티티: 도메인 안에서의 새로운 응집 기준

<!-- from PDF p.5, image4 (원문은 이미지로 삽입된 텍스트) -->

도메인을 중심으로 폴더를 재구성하고 나니, 이제 각 도메인 내부를 어떻게 구성할지가 다음 고민거리가 되었습니다. 기존처럼 단순히 역할별로 나누는 것보다, 도메인 안에서도 **더 의미 있는 응집도를 높여줄 기준**이 필요했습니다.

도메인을 중심으로 폴더를 구성하면 자연스럽게 **원천 데이터**를 기준으로 사고하게 됩니다. 모든 도메인 로직은 결국 특정 데이터의 형식을 중심으로 전개된다는 것을 깨달았습니다. 예를 들어, 제품 도메인은 'Product'라는 데이터를, 장바구니 도메인은 'Cart'와 'CartItem'이라는 데이터를, 사용자 도메인은 'User'라는 데이터를 중심으로 작동합니다.

이러한 **핵심 데이터 모델을 엔티티(Entity)**라고 부릅니다. 엔티티의 개념이 다소 막연하다면, **서버 데이터베이스에 저장되는 원천 데이터의 구조** 또는 API 응답에서 공통적으로 나타나는 데이터 모델이라고 생각해도 무방합니다.

이렇게 정의된 엔티티, 예를 들어 '제품(Product)' 엔티티는 다음과 같은 여러 곳에서 활용됩니다. 우리는 이러한 엔티티를 기준으로 응집력 있는 구조를 만들 수 있습니다.

- 제품 목록 조회
- 제품 검색
- 제품 상세 보기
- 장바구니에 제품 추가
- 주문 시 제품 정보 표시

**프론트엔드는 데이터를 기반으로 화면을 구성하는 과정이므로, 엔티티를 중심으로 사고하면 원천 데이터로부터 화면에 이르기까지의 데이터 흐름이 더욱 선명해집니다.** 대부분의 원천 데이터는 서버의 데이터베이스에서 시작되어 API를 통해 브라우저로 전달되고, 여러 단계의 가공을 거쳐 최종적으로 화면에 표시됩니다. 이 흐름을 엔티티 중심으로 정리하면 다음과 같습니다.

###### 1. API 계층: 엔티티 데이터 획득

```ts
// 서버로부터 Product 엔티티와 유사한 구조의 데이터를 받아옴
async function fetchProduct(id: string): Promise<ProductDTO> { // DTO로 명시
  return api.get(`/products/${id}`);
}

// 여러 엔티티 관련 데이터를 조합해서 받기도 함
async function fetchCartWithProducts(): Promise<{
  cart: CartDTO; // DTO로 명시
  products: ProductDTO[]; // DTO로 명시
}> {
  return api.get('/cart/with-products');
}
```
<!-- from PDF p.6, image5 -->

###### 2. 변환 계층: 화면용 데이터로 가공

```ts
// 서버에서 받는 DTO (Data Transfer Object)
interface ProductDTO {
  id: string;
  name: string;
  price: number;
  discount_rate: number;
  stock_count: number;
  created_at: string;
}

// 프론트엔드 엔티티 (도메인 모델)
interface Product {
  id: string;
  name: string;
  price: number;
  discountRate: number;
  stock: number;
  createdAt: Date;
}

// DTO → Entity 변환 함수
function toProduct(dto: ProductDTO): Product {
  return {
    id: dto.id,
    name: dto.name,
    price: dto.price,
    discountRate: dto.discount_rate,
    stock: dto.stock_count,
    createdAt: new Date(dto.created_at),
  };
}
```
<!-- from PDF p.6, image6 (PDF 페이지 경계에서 toProduct 본문 일부가 잘려 매핑 기준으로 재구성) -->

###### 3. 계산 계층: 엔티티 기반 비즈니스 로직

```ts
// 엔티티를 활용한 계산 로직
function calculateTotalPrice(products: Product[], quantities: number[]): number {
  return products.reduce((sum, product, index) => {
    const discountedPrice = product.price * (1 - product.discountRate);
    return sum + (discountedPrice * quantities[index]);
  }, 0);
}

// 엔티티 간의 관계를 활용한 로직 (CartItemWithProduct는 Product와 CartItem 정보를 결합한 ViewModel)
interface CartItemWithProduct { // 예시 ViewModel
  productId: string;
  quantity: number;
  product: Product; // Product 엔티티 포함
}

function getProductsInCart(cartItems: CartItem[], products: Product[]): CartItemWithProduct[] {
  return cartItems.map(item => ({
    ...item,
    product: products.find(p => p.id === item.productId)!
  }));
}
```
<!-- from PDF p.7, image7 (반환 타입·끝부분 주석이 우측에서 잘림 — 매핑 기준으로 보완) -->

###### 4. UI 계층: 엔티티 데이터 표현

```tsx
// 엔티티 또는 ViewModel 기반 UI 컴포넌트
// ProductViewModel은 Product 엔티티에서 파생되어 화면 표시에 필요한 추가 정보/가공된 정보를 가짐
interface Product {
  id: string;
  name: string;
  price: number; // 원가
  discountedPrice: number; // 할인가
  displayPrice: string; // 표시용 가격 문자열 (원가)
  discountPercentage?: string; // 할인율 문자열
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <div className="price">
        {product.discountPercentage && ( // 할인율이 있을 경우
          <>
            <span className="original">{product.displayPrice}</span>
            <span className="discount">{product.discountPercentage}</span>
          </>
        )}
        <span className="final">
          {product.discountedPrice.toLocaleString()}원
        </span>
      </div>
      {/* <StockBadge status={product.stockStatus} /> */}
    </div>
  );
}
```
<!-- from PDF p.8, image8 -->

##### 장점

###### 엔티티 중심 구조의 이점

<!-- from PDF p.9, image9 (원문은 이미지로 삽입된 텍스트) -->

이렇게 엔티티를 중심으로 각 도메인 내부의 코드를 구성하니, 앞서 도메인별로 폴더를 나누었을 때 얻었던 이점들이 더욱 강화되고 구체화되는 것을 경험할 수 있었습니다. **도메인 중심 구조가 프로젝트의 전체적인 맥락 파악을 도울 수 있었고 엔티티와 데이터 흐름을 중심으로 하는 세부 구조는 각 도메인 내 데이터 흐름의 명확성과 관련 로직들의 응집성을 높이며 다음과 같은 세부적인 이점이 있었습니다.**

**첫째, 데이터를 이해하는 데 드는 인지 비용이 크게 줄어듭니다.** 어떤 화면이든, 어떤 기능이든 결국 다루는 중심 데이터가 무엇인지를 명확히 알고 출발할 수 있었고, 그 데이터가 어떻게 가공되고 어떤 방식으로 표현되는지를 일관된 구조 안에서 따라가게 되니, 더 이상 '이건 머더서 오는 데이터지?'를 고민하지 않게 되었습니다.

**둘째, 도메인 로직이 흩어지지 않고 데이터의 흐름을 중심으로 한곳에 모이게 되었습니다.** 원천 데이터에서 시작해 계산, 변환, 표현까지의 흐름이 한눈에 들어오게 되니, 새로운 요구사항이 들어와도 어느 지점에서 변경이 일어나야 하는지 바로 감이 옵니다. 마치 하나의 데이터 파이프라인을 다루듯, 코드를 따라가는 과정과 데이터의 생애주기를 따라가게 된 셈이었습니다.

```text
/Product
  /entity               # 제품 엔티티 중심 폴더
    /interfaces         # 엔티티 및 ViewModel 인터페이스
      Product.ts        # Product 엔티티 인터페이스
      ProductViewModel.ts # Product 화면용 ViewModel 인터페이스
    /api                # 엔티티 데이터 획득 관련 API
      productApi.ts
    /model              # 엔티티 데이터 가공 및 비즈니스 로직
      mappers.ts        # DTO → Entity, Entity → ViewModel 변환 함수
      calculations.ts   # 엔티티 기반 계산 로직
    /ui                 # 엔티티/ViewModel 기반 UI 컴포넌트
      ProductCard.tsx   # 제품 정보 표시 컴포넌트
      ProductPrice.tsx  # 가격 표시 컴포넌트
```
<!-- from PDF p.9, image10 -->

##### 주의사항

###### 모든 도메인에 엔티티 중심 구조로 바꿔야 할까?

<!-- from PDF p.10, image11 (원문은 이미지로 삽입된 텍스트) -->

그렇지만 모든 도메인에 엔티티 중심 구조를 적용할 필요는 없습니다. 페이지 내용이 거의 변하지 않거나 단순히 UI 컴포넌트를 조합하는 수준의 도메인이라면, 복잡한 다층적 엔티티 구조는 오히려 인지 부담을 늘리고 실제 얻는 이점은 미미할 수 있습니다.

만약 **데이터 흐름이 복잡하고, 여러 화면이나 기능에서 핵심 데이터가 재사용되는 도메인**에서는 이야기가 달라집니다. 예를 들어, 커머스 프로젝트의 Product, User, Order, Cart처럼 서비스의 핵심을 이루면서 데이터의 생애 주기(API 획득, 가공, 표현) 전반에 걸쳐 복잡한 흐름을 보이는 도메인이라면, 엔티티 중심 구조가 강력한 효과를 발휘할 수 있습니다. 이 구조는 관련 로직들을 한곳에 모아 파편화를 막고, 변경이나 확장이 필요할 때 어디를 손봐야 할지 명확하게 보여줍니다.

이처럼 폴더 구조를 역할 중심에서 엔티티 중심의 데이터 흐름으로 세분화하는 방식은, 프로젝트 규모가 커짐에 따라 **데이터의 구조와 존재 여부, 그리고 그 흐름을 파악하는 것이 중요해지는 상황**에서 제안되었습니다. 이러한 배경과 필요성을 명확히 이해한다면, 단순히 구조를 따르는 것을 넘어 여러분의 프로젝트에 맞게 이 방식을 적절히 응용하고 발전시키는 데 큰 도움이 될 것입니다.

#### STEP 3-2 컴포넌트는, 페이지 > 위젯 > UI 컴포넌트로 나눠보자

```tsx
// 점점 복잡해지는 페이지 컴포넌트의 전형적인 모습
function ProductDetailPage() {
  // 관리해야 할 수많은 state와 effect
  const [product, setProduct] = useState(null);
  // ... (이하 유사 상태들 생략)

  // 여러 종류의 데이터를 불러오고 처리하는 복잡한 로직
  useEffect(() => {
    // 제품 정보, 리뷰, 연관 상품 로딩 및 사용자 상태 확인 등
    // 다양한 비동기 로직과 상태 업데이트가 얽힘
  }, []);

  // 때로는 수백 줄에 달하는 방대한 JSX 구조
  return (
    <div>
      {/* 제품 이미지 갤러리 영역 */}
      <div className="product-gallery">{/* 해당 구역 로직 생략 */}</div>
      {/* 제품 정보 표시 영역 */}
      <div className="product-info">{/* 해당 구역 로직 생략 */}</div>
      {/* 사용자 리뷰 표시 영역 */}
      <div className="reviews">{/* 해당 구역 로직 생략 */}</div>
      {/* 연관 상품 추천 영역 */}
      <div className="related-products">{/* 해당 구역 로직 생략 */}</div>
    </div>
  );
}
```
<!-- from PDF p.11, image12 -->

하나의 섹션이 하나의 위젯.
페이지 = 위젯 + 위젯 + 위젯

#### STEP 3-3 세 번째 시도: '행동'을 기반의 기능 응집 구조

[https://velog.io/@teo/folder-structure](https://velog.io/@teo/folder-structure)
이 내용은 잘 이해가 안감.

컴포넌트 파일 하나 안에 로직을 다 넣어놓자는 소리인가,
click event handler 안에 api호출하는 코드 넣고 화면 업데이트 하는 코드 넣어놓자 그소린가…?

## 구상 (선택)

- 흐름: 폴더 구조를 Step별로 진화시키는 서사. Step 1-1 역할별 분리 → Step 1-2 계층별 분리(컴포넌트 한정) → Step 2 도메인/순수 분리 → Step 3 도메인 최상위 → STEP 3-1 엔티티 기준 분리 → STEP 3-2 페이지/위젯/UI → STEP 3-3 행동 기반(미완·이해 보류). 각 단계마다 단점이 다음 단계를 끌어내는 구조.
- 발행 전 처리:
  - **STEP 3-3 미완성.** "이 내용은 잘 이해가 안감" 으로 끝나며 본문이 비어 있음. 발행하려면 행동 기반 응집 구조를 직접 이해·정리하거나, 해당 섹션을 빼고 STEP 3-2까지로 마무리.
  - **외부 출처 의존.** 전체 서사가 velog `@teo/folder-structure` 글을 따라가며 일부 문장(가장 큰 장점, 장점 인용)을 그대로 인용. 발행 시 인용 범위·출처 표기 정리 필요.
  - STEP 3-1의 엔티티 설명 블록(image4, image9, image11)은 원문에서 이미지로 삽입된 긴 텍스트라 전사함. 본문 텍스트로 풀어 쓸지 결정 필요.
  - 코드 블록 일부(image6 toProduct 닫는 부분, image7 반환 타입·말미 주석)가 PDF 페이지 경계·우측 클리핑으로 잘려, 인접 매핑을 근거로 재구성함. 발행 전 원본 구글독스에서 원문 코드 확인 권장.
