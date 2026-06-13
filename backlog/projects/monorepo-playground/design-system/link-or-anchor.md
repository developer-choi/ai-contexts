# Link or Anchor

`<CustomLink>` 컴포넌트의 내부/외부 URL 분기 책임 + 구현 전략 결정 사고.

## Example

관리자에서 배너 이미지를 등록할 때 클릭 시 연결될 URL을 입력 (필수값 아님).

## Required features

1. **우리 사이트 URL** → Client Side Routing (+ optional prefetch)
2. **외부 사이트 URL** → 그 페이지로 이동 (Server Side Routing)
3. **URL이 없거나 잘못된 형식**:
   - URL 없음 → 링크 작동 X, 겉으로는 링크 텍스트·이미지 그대로 보이게
   - 잘못된 형식 → 위와 동일 + 콘솔 에러 로그만

## Development — 내부/외부 origin 체크 방법

### (1) 기존: white origins 사전 정의

```tsx
const OUR_ORIGINS = [
  "http://localhost:3000",
  "https://dev.example.com",
  "https://www.example.com",
];
```

- 단점: 우리 origin이 바뀌면 같이 바뀌어야 함 (개발 origin 등)
- 장점: 최초 렌더링 시점에 판단 가능 (Server Side에서도 정확)

```tsx
const isOurOrigin = OUR_ORIGINS.includes(href);

if (!isOurOrigin) {
  return <a {...rest} />;
}

if (isOurOrigin) {
  return (
    <Link href={link} prefetch={prefetch}>
      <a {...rest} />
    </Link>
  );
}
```

> 원문 코드 의심: `OUR_ORIGINS.includes(href)`는 origin 문자열과 전체 URL을 비교하므로 매칭 안 됨. 의도는 `OUR_ORIGINS.some(o => href.startsWith(o))`로 보임. 검증 필요.

### (2) 변경: `window.location.origin`으로 런타임 판단

```tsx
const [hrefState, setHrefState] = useState('');

useEffect(() => {
  if (href.startsWith(location.origin)) {
    // 우리 origin
  } else {
    // 남의 origin
  }
});
```

- 단점: 최초 렌더링 시점에 판단 불가능 (Server Side·Client Side 초기 모두)
- 장점: 우리 origin이 바뀌어도 컴포넌트는 변경 불필요

### 결론 — (2) 채택

- 최초 렌더링 시점 판단 불가가 큰 단점으로 이어지지 않음
- 우리 origin 판단 비용 거의 없음 (`useEffect`에서 `location.origin` 비교 1회)
- 단점은 적고 장점이 크므로 `location.origin` 방식 선택

## URL 유효성 — 콘솔 에러만

- 핵심: `href`를 사용자(관리자)가 입력
- 런타임에서 작동하는 컴포넌트
- href에 문제 있다고 `throw Error`로 alert 띄우는 것보다 콘솔 에러 로그만 찍고 링크로 작동하지 않도록 처리

## References

- 상위: [Nextjs Link Overview](https://docs.google.com/document/d/1FDCAtpxj3e5iFl46Fg42jMu1D6ouMzdRH04KTCUnHR0/edit)
- 상위: [Anchor Overview](https://docs.google.com/document/d/1t-9MgFAD3UIWJZSVUsC3jBW3H9gMExVK94jqTl-X1_A/edit)
