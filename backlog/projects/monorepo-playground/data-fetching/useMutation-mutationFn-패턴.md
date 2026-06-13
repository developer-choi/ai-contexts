# useMutation mutationFn 패턴

## [ready] mutationFn은 함수 reference만, 값은 mutateAsync 인자로

### 기대상황 (필수)

`useMutation`의 `mutationFn`에는 기존 API 함수를 reference로만 박는다. 호출 시 필요한 값은 `mutateAsync(args)`의 인자로 전달. `mutationFn` 안에 가드(null check 등)·조립·로직을 넣지 않는다 — 가드는 호출부 `try` 안에서 throw.

```ts
useMutation({ mutationFn: postBoardApi });
// 호출
await mutation.mutateAsync({ title, content });
```

instance method(예: `tossWidget.requestPayment`)는 `this` 바인딩 때문에 reference만 박을 수 없으므로, instance 자체를 mutateAsync 인자에 포함시켜 destructure:

```ts
useMutation({
  mutationFn: ({ widget, ...params }) => widget.requestPayment(params),
});
```

### 현재상태 (선택)

MP에 동일 패턴 적용 예시 4건 존재 (1차 소스):

- `apps/examples/src/validation/integration/components/BoardForm.tsx` — `mutationFn: postBoardApi`
- `apps/examples/src/validation/integration/components/BoardDetail.tsx` — `mutationFn: deleteBoardApi`
- `apps/examples/docs/patterns/form/SomeForm.md` — `mutationFn: postSomeApi`
- `apps/examples/docs/patterns/rendering/ErrorHandling.md` — `mutationFn: loginAction`

langdy-student PR3 `src/components/Purchase/RenewedPurchase/PurchaseOverlay/WebPurchaseOverlay.tsx:92-99` 두 mutation도 본 패턴 적용 완료 (`alipayMutation` reference 직접, `tossRequestMutation` instance destructure).

MP `docs/patterns/`에 본 패턴을 명시한 별도 가이드 문서는 미확인 (예시 4건은 다른 주제 문서 안에 산재). 별도 패턴 문서로 박혀 있지 않음.

### 현재 생각중인 방법 (선택)

- MP `docs/patterns/data-fetching/` 또는 `docs/patterns/api/` 하위에 `UseMutationMutationFn.md` 신규
- 본 백로그 항목 본문(기대상황 절)을 그대로 패턴 문서 본문으로 박음
- best-practices-map.md에 엔트리 추가
- instance method 예외(`{widget, ...params}` destructure 패턴)도 같은 문서에 박음

### 종료 조건

MP에 본 패턴 문서 1건 생성 + best-practices-map.md 등재 + `sync` 완료.

### 첫 행동

- MP `apps/examples/docs/patterns/` 기존 디렉토리 구조 확인하여 신규 패턴 위치 결정
- `docs/best-practices-map.md` 기존 엔트리 양식 확인
- 패턴 문서 작성 → 4건 예시 인용
