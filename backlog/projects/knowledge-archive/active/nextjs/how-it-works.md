# Next.js — 어떻게 동작하는가

본인 학습 자료. 미완. Compiling/Minifying/Bundling/Code Splitting 정리 중.

## 1. 환경

코드가 Development에서 실행되는지, Production에서 실행되는지에 따라 Next.js는 다르게 실행된다.

Development 환경에서는 개발자의 경험을 위해 최적화한다.
Production 환경에서는 사용자를 위해 최적화한다.

이렇게 두 환경에서 목표가 다르기 때문에, 각 환경마다 제공되는 기능도 차이가 있습니다.

예시로, Production에서는 Compiling, Minifying, Bundling, Code Splitting이 제공됩니다.

## Then, what is Compiling?

컴파일이란, 언어를 다른 언어로 바꾸거나 다른 버전의 언어로 바꾸는 것을 말합니다.

개발자들은 효율적인 개발을 위해 Typescript 같은 언어나, JSX 같은 형식으로 코드를 작성합니다. 그래서 이것을 브라우저가 이해할 수 있는 언어인 javascript로 변환하는 것이 필요합니다.

다이어그램 (PDF p.1): Developer code → Compiler → Compiled code

```js
// Developer code
export default function HomePage() {
  return <div>DX of the Future</div>
}

// Compiled code
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = HomePage;

function HomePage() {
  return /*#__PURE__*/React.createElement(
    "div", null, "DX of the Future"
  );
}
```

## What's Minifying?

Minifying이란 기능을 건드리지 않고 코드에 불필요한 부분을 삭제하는 것을 말합니다. 코드는 일반적으로 사람이 읽기 쉽도록 작성되어 있습니다. 그래서 코드에는 실행하는데 필요하지 않은 것들이 포함되어 있습니다. (예시: 공백, 주석)

다이어그램 (PDF p.2): Compiled code → Minifier → Minified code (공백·주석 제거)

Minifying을 통해 파일 크기를 줄여서 애플리케이션의 성능을 향상시키는데 도움을 줄 수 있습니다.

Next.js는 Production에서 CSS와 Javascript 파일을 Minifying합니다.

## What's the Bundling?

Bundling은 파일들 간의 종속성 문제를 해결하고, 파일을 합쳐서 브라우저의 파일 요청 횟수를 줄일 수 있도록 하는 것을 말합니다.

다이어그램 (PDF p.2): 여러 JS/CSS/TS/TSX 파일 → Bundler → 합쳐진 JS, CSS

개발자들은 효율적으로 코드를 재사용 하기 위해, function·module·component들을 분리해서 개발하기 때문에 파일들은 서로 복잡한 종속성을 갖게 됩니다.

## TODO

- 본인 메모는 Bundling 도중 끝남. Code Splitting까지 학습·정리 필요.
- "여러 가지로 구분을 할 수 있다" 도입부에 따라 환경 외 다른 구분 축 (런타임? 빌드 단계?) 학습·정리 필요.
