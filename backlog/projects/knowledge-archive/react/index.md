# React

## TODO

### React 17 이벤트 위임 변화

본인 미학습.

**자료**:

- [React v17.0 Release Notes](https://reactjs.org/blog/2020/10/20/react-v17.html) (React 16 vs 17 이벤트 위임 다이어그램 포함, @RachelNabors)
  - 다이어그램 핵심: React 16은 `document`에 이벤트 위임, React 17은 `ReactDOM.render`에 전달한 root container(`<div>`)에 위임

블로그 인용:

> We've confirmed that numerous problems reported over the years on our issue tracker related to integrating React with non-React code have been fixed by the new behavior.
>
> If you run into issues with this change, here's a common way to resolve them.

**본인 미해결 영역**:

- 나는 리액트에서 이벤트를 어떻게 관리하는지 잘 모르기때문에,
- 리액트로 이벤트를 등록하는 경우 개발자도구에서 저 화면에 어떻게 표시되는지 아직모름.

관련: 퓨어 JS DevTools Event Listeners 패널 표시 순서는 [`knowledge-archive/tips/frontend/browser/devtools/event-listeners.md`](../../../../../knowledge-archive/tips/frontend/browser/devtools/event-listeners.md) 참고.

### setState 비동기·일괄처리 이유 (조정 지연 유익한 이유)

자료:

- [facebook/react#11527 — setState 비동기 이유 토론](https://github.com/facebook/react/issues/11527)

목적: React 18 Automatic Batching Q&A에 "왜 batching이 유익한가" 보강. KA `knowledge/frontend/react/core/react-18-features.md` 후속 업데이트 후보.
