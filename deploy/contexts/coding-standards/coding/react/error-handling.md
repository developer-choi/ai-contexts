# 에러 처리 규칙

> 아래 예시의 에러 클래스명(`ApiResponseError`, `PaymentFailedError` 등)과 공통 함수명(`handleClientSideError` 등)은 설명을 위한 예시입니다.
> 실제 작업 시에는 프로젝트에 이미 정의된 에러 클래스와 공통 에러 처리 함수가 있으므로, 해당 코드의 usage를 검색하여 기존 사용 패턴을 파악한 뒤 동일하게 따릅니다.

## Client Side 렌더링 에러

렌더링 중 에러를 잡을 수 있는 유일한 방법은 **Error Boundary**입니다.

- 에러가 발생할 수 있는 영역을 Error Boundary로 감싸서, 해당 영역만 에러 UI로 대체합니다.
- Error Boundary의 범위는 디자인 기획에 따라 결정합니다. (페이지 전체 / 섹션 단위 / 미노출 등)
- Fallback 컴포넌트에서 해당 페이지에서만 발생하는 에러를 먼저 개별 처리하고, 나머지는 공통 Fallback으로 위임합니다.

```tsx
// ✅ Good — 에러 발생 가능 영역만 격리
<ErrorBoundary FallbackComponent={ProductFallback}>
  <ProductList />
  <Pagination />
</ErrorBoundary>

function ProductFallback({ error }: FallbackProps) {
  // 이 페이지에서만 발생하는 에러 개별 처리
  if (error instanceof ProductDiscontinuedError) {
    return <ErrorPageTemplate title="판매 종료" content="해당 상품은 판매가 종료되었습니다." />;
  }

  // 나머지는 공통 Fallback으로 위임 (500, 401, 403 등)
  return <CommonErrorFallback error={error} />;
}
```

```tsx
// ❌ Bad — Error Boundary 없이 방치하여 페이지 전체가 crash
<ProductList />
<Pagination />
```

---

## Server Side 렌더링 에러

Next.js의 `error.tsx`는 프레임워크 보안 정책에 의해 에러 객체 정보가 손실됩니다. 따라서 **Server Component에서 직접 try-catch** 합니다.

- 해당 페이지에서만 발생하는 에러를 먼저 개별 처리하고, 나머지는 공통 함수에 위임합니다.
- 공통 함수에서도 식별할 수 없는 에러는 `throw error`로 다시 던져 `error.tsx`에서 기본 에러 메시지를 노출합니다.

```tsx
// ✅ Good
async function Page() {
  try {
    const response = await getProductListApi();
    return <main>...</main>;
  } catch (error) {
    // 이 페이지에서만 발생하는 에러 개별 처리
    if (error instanceof ProductDiscontinuedError) {
      return <ErrorPageTemplate title="판매 종료" content="해당 상품은 판매가 종료되었습니다." />;
    }

    // 나머지는 공통 함수에 위임 (500, 401, 403 등)
    return handleServerSideError(error);
  }
}
```

---

## 이벤트 핸들러 에러

이벤트 핸들러 내부의 에러는 **try-catch**로 잡고, 에러 종류에 따라 모달/토스트 등으로 사용자에게 피드백합니다.

- 해당 핸들러에서만 발생하는 에러를 먼저 개별 처리하고, 나머지는 공통 함수에 위임합니다.

```tsx
// ✅ Good
const onClick = async () => {
  try {
    await postPaymentApi(data);
  } catch (error) {
    // 결제에서만 발생하는 에러 개별 처리
    if (error instanceof PaymentFailedError) {
      openModal({ title: '결제 실패', content: error.reason });
      return;
    }

    // 나머지는 공통 함수에 위임 (500, 401, 403 등)
    handleClientSideError(error);
  }
};
```

---

## 공통 에러 처리

500, 401, 403 등 API마다 공통으로 발생하는 에러 처리 로직은 공통 함수로 분리되어 있습니다.

- 프로젝트에서 `handleClientSideError`, `handleServerSideError`, `CommonErrorFallback` 등의 공통 에러 처리 함수와 에러 클래스를 찾아 기존 패턴을 따릅니다.
- **개별 처리가 공통 처리보다 우선**합니다. 개별 에러를 먼저 분기한 뒤, 나머지를 공통 함수에 위임합니다.
- 특정 도메인에서만 반복되는 에러는 도메인 공통 함수를 만들어 계층화할 수 있습니다.

```tsx
// ❌ Bad — Axios Interceptor로 공통 에러 처리 (Override 불가, React Hooks 사용 불가)
axios.interceptors.response.use(..., (error) => {
  if (error.status === 401) { /* ... */ }
  return Promise.reject(error);
});
```

---

## 금지 사항

- `catch` 후 `console.error`만 찍고 삼키지 않습니다. 처리할 수 없으면 catch하지 않습니다.
- 에러를 다시 잡아 던지는 re-throw는, 더 구체적인 에러로 변환할 때만 합니다.
