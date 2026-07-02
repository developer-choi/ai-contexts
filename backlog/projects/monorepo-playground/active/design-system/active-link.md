# Active Link

`<CustomLink>` / `<NavItem>`의 active 상태 판단 컴포넌트 prop API 설계 사고.

## Required features

### startsWith 기반의 isActive

```tsx
<div className="bottom-navigation">
  <CustomLink href="/community" enableActive={{mode: 'path', className: styles.active}}/>
  <CustomLink href="/mypage" enableActive={{mode: 'path', className: styles.active}}/>
</div>
```

`/community/free-board/1`, `/community/free-board/write` 같은 경로에서 `/community` 링크의 className에 active가 ON.

`href="/upper"`인데 현재 `/upper-fake`에 있다고 해서 활성화되면 안 됨. 경계 처리 필수.

### exact 기반의 isActive

```tsx
<div className="bottom-navigation">
  <CustomLink href="/board/list?sort=desc" enableActive={{mode: 'exact', ...}}/>
  <CustomLink href="/board/list?sort=asc" enableActive={{mode: 'exact', ...}}/>
</div>
```

쿼리스트링이 없어도 잘 동작해야 함 — 쿼리스트링 전제로 구현 금지.

### pathname 생략 시 현재 pathname 기준

```tsx
<CustomLink href="?query=value"/>
<CustomLink href="/current/path?query=value"/>
```

위에서 정의한 모든 모드가 pathname 없이도 현재 pathname 기준으로 동작.

## CSS Module Tip

`&:.active` 대신 `&:global(.active)`로 쓰면 module css의 해시 클래스가 아닌 그대로 `active`로 들어감.

```tsx
enableActive={{mode: 'startsWith', className: styles.active}}
```

[출처](https://github.com/css-modules/css-modules/blob/master/docs/composition.md#exceptions)

## Exact Tip

특수문자가 있어도 활성화 판단이 잘 되도록 처리 필요. ([커밋](https://github.com/developer-choi/react-playground/commit/25a69034447991baa09b9d80e5f508ea8fb17d20))

## startsWith Tip — 가상 경로 + redirect

바텀네비에서 My를 누르면 `/mypage/profile`로 보내달라는 기획일 때:

```tsx
<NavItem href="/mypage/profile" activeMode="startsWith"/>
```

이렇게 잡으면 `/mypage/profile/edit`에선 동작하지만 `/mypage/inquiry`에선 활성화 안 됨.

`href`에 `/my`를 넣고, `/my`의 route.ts에서 `/my/profile`로 redirect하면 완벽:

```tsx
<NavItem href="/my" activeMode="startsWith"/>
```

## TODO

### activePath prop 추가

href 외에 activePath를 따로 받아, 활성화 판단은 activePath 기준으로 하기.

GNB에서 **실제로는 존재하지 않지만 의미상 존재하는 링크처럼 판단**해야 할 때 유용. 위 startsWith Tip의 redirect 트릭을 prop으로 흡수하는 대안.

## References

- [Anchor Overview](https://docs.google.com/document/d/1t-9MgFAD3UIWJZSVUsC3jBW3H9gMExVK94jqTl-X1_A/edit)
- [Tab Bar](https://docs.google.com/document/d/1I9RL3PafRfNwzKa7ZTvChWVygDlGWGyr57qSmr4FqOY/edit)
