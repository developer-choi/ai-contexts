# storybook

## 가이드라인

- [Controls 패널이 동작하려면 useArgs를 써야 한다](./controls-패널이-동작하려면-useargs를-써야한다.md) — render 안에서 `useState` 쓰면 Controls가 무력화됨. `useArgs` + meta-level argTypes 패턴.

## TODO

- 버튼그룹 같이 상위/하위 컴포넌트가 있는 컴포넌트의 스토리 만들 때 — [`./stories-composition.md`](./stories-composition.md)의 `Parent / Child Component` + `해결방법 > subComponents meta` 절 참고해서 개선하기
- 스토리북 테스트 관련 TODO → Test Overview 문서에 정리됨
- 스토리 파일 정리 방법 → Storybook-Documentation 문서 참고
- 문서 자동화 관련 → Storybook-autodocs 문서 참고
- [`./parameter.md`](./parameter.md) 정리 미완 — 우선순위 낮아 미룸. 필요 시 공식 parameters 문서 보고 보강

## References

- https://storybook.js.org/docs
- https://storybook.js.org/docs/get-started/frameworks/react-vite?renderer=react
- https://storybook.js.org/docs/get-started/browse-stories
- https://storybook.js.org/docs/configure
- https://storybook.js.org/docs/configure/styling-and-css#import-bundled-css-recommended
- https://storybook.js.org/docs/get-started/why-storybook
- https://storybook.js.org/docs/writing-stories/typescript
- https://storybook.js.org/docs/writing-stories/tags
- https://storybook.js.org/docs/essentials
- https://storybook.js.org/docs/addons
- https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-modules
- https://storybook.js.org/showcase
- [스토리북 작성을 통해 얻게 되는 리팩토링 효과 (kakao tech)](https://tech.kakaoent.com/front-end/2022/220609-storybookwise-component-refactoring/)
- [디자이너가 스토리북 잘 활용할 수 있게 하는 사례 (inflab)](https://tech.inflab.com/20240224-design-system/#control)
- https://storybook.js.org/docs/get-started/whats-a-story
- https://storybook.js.org/docs/writing-stories/args
- https://storybook.js.org/docs/writing-stories/args#setting-args-through-the-url
- https://storybook.js.org/docs/writing-stories/play-function
- https://storybook.js.org/docs/writing-stories/decorators
- https://storybook.js.org/docs/writing-stories/loaders
- https://storybook.js.org/docs/writing-stories/parameters
- https://storybook.js.org/docs/writing-stories/stories-for-multiple-components
- https://chakra-ui.netlify.app/?path=/story/button--variants — 스토리 단위(props 종류별 1개) 예시
- [본인 master doc — Story (Google Docs)](https://docs.google.com/document/d/1jSouMzxO8-m3bKxGv87emG_9ulGPx7SEQfXOHabX_8A/edit?tab=t.0)
