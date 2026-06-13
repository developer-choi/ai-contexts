# next/font

Next.js `next/font` 모듈 사용 시행착오 + 학습 메모 + 미해결 질문.

## Usage & Grammar

### Conditionally apply font

```ts
const english: NextFont = localFont({display: 'fallback', ...});
const japanese: NextFont = localFont({display: 'fallback', ...});
const chinese: NextFont = localFont({display: 'fallback', ...});
```

컴포넌트 함수 바깥에서 미리 정의해놓고, 조건에 따라 셋 중 하나를 반환하는 `getFontByLanguage()` 함수로 분기.

```ts
export default async function RootLayout({children}) {
  const font: NextFont = await getFontByLanguage();

  return (
    <html>
    <body className={font.className}>
```

해당되는 폰트 파일만 다운로드.

### 공통 정적 변수 사용 불가능

이모지폰트 400/700 + 기본폰트 400/700 = 영어/중국어/일본어 3개 폰트 변수 각각에 같은 코드가 들어감.

```ts
{
  path: '../../../public/fonts/noto-color-emoji-emoji-400-normal.woff2',
  weight: '400',
},
{
  path: '../../../public/fonts/noto-color-emoji-emoji-400-normal.woff2',
  weight: '700',
},
```

공통 변수로 분리해서 spread / concat 시도했으나 실패:

```ts
const emojiFonts: {path: string, weight: string}[] = [/* 2 elements */];
```

에러: `Font loader values must be explicitly written literals.`

## Tip — 이모지 폰트 weight 700 트릭

이모지 컬러 폰트는 400만 있고 700이 없음. 400만 선언하면 `<div style={{fontWeight: 'bold'}}>⏰ 텍스트</div>`에서 이모지에 컬러 폰트 적용 안 됨.

```ts
{
  path: '.../noto-color-emoji-400-normal.woff2',
  weight: '400',
},
{
  path: '.../noto-color-emoji-400-normal.woff2',
  weight: '700',
},
```

같은 파일을 400/700 둘 다 선언하면 해결. 폰트 파일은 하나만 다운로드됨.

## 알 수 없는 오류 — 이모지 폰트 순서

```ts
const english: NextFont = localFont({
  src: [
    {path: '.../noto-color-emoji-400-normal.woff2', weight: '400'...},
    {path: '.../noto-color-emoji-400-normal.woff2', weight: '700'...},
    {path: '.../Pretendard-Bold.woff2'...},
    {path: '.../Pretendard-Regular.woff2'...},
  ],
  display: 'fallback',
});
```

이모지 폰트가 텍스트 폰트보다 **나중 순서**로 오면 텍스트 글자가 깨짐. 순서 바꿔 해결. 원인 미상.

## 필기

- Zero layout shift via CSS `size-adjust`
- CSS와 폰트 파일은 **build time**에 다운로드되어 **self-host** (브라우저가 Google에 요청 보내지 않음)
- font-display, preloading, fallbacks 등 커스터마이즈 가능

> Next.js automatically optimizes fonts in the application when you use the next/font module. It downloads font files at build time and hosts them with your other static assets. This means when a user visits your application, there are no additional network requests for fonts which would impact performance.

## TODO / 미해결 질문

- 폰트 최적화는 정확히 뭘 하는 건가? 사이즈 줄이고 request 줄이는 것?
- 기존에 폰트 관련 어떤 문제가 있었고, Next.js가 어느 부분을 해결하는지
- "CSS and font files are downloaded at build time" — 빌드 새로 하면 폰트 파일 새로 받아야 함?
- next/font가 폰트 로딩 전후 레이아웃 시프트를 막아준다는데, 보일러플레이트 받아서 Ctrl+Shift+R 강력 새로고침하면 레이아웃 시프트 생기더라. 새로고침할 땐 캐시 있어서 안 생기긴 함. next/font 안 쓰면 일반 새로고침에서도 시프트 생겼었나?
- 이걸 테스트는 어떻게 함? 폰트 로딩 전후 체크하는 방법?
- 폰트 로딩 시 렌더링 차단되는 경우는 언제? script `async`/`defer` 안 쓰면 다운받는 동안 블록된다던데.

## References

- 상위: [Font 문서](https://docs.google.com/document/d/1IIgmajWuOrpD0Ji8jOBYRsGGryUr-fs24GtvN0a5h54/edit?tab=t.0)
- 하위: [이모지 폰트 사고](https://docs.google.com/document/d/1wkoqzKgUlV-5pTNqcsYeoRPsc5PC78hwq3zcem4WIkA/edit?tab=t.0)

### Next.js 공식

- https://nextjs.org/blog/next-13#nextfont
- https://nextjs.org/docs/basic-features/font-optimization
- https://nextjs.org/docs/pages/building-your-application/optimizing/fonts
- https://nextjs.org/learn/dashboard-app/optimizing-fonts-images
- https://nextjs.org/blog/next-13#nextfont (커스텀 폰트 예제)

### Web 표준 / 성능

- https://web.dev/learn/performance/optimize-web-fonts?hl=ko
- https://developer.mozilla.org/ko/docs/Web/HTML/Element/link
- https://developer.mozilla.org/ko/docs/Web/HTML/Attributes/rel/preload
- https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/size-adjust
- https://web.dev/articles/css-size-adjust?hl=ko
- https://abcdqbbq.tistory.com/67

### Variable Fonts

- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fonts/Variable_fonts_guide
- https://web.dev/articles/variable-fonts?hl=ko
- https://blog.toktokhan.dev/variable-font-베리어블-폰트가-뭐죠-ad1a2fdff11c

### font-display

- https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display
- https://mong-blog.tistory.com/entry/CSS-font-display-글꼴-렌더링-방식을-변경하는-방법

### 기타

- [Using Fonts in Next.js (YouTube)](https://www.youtube.com/watch?v=L8_98i_bMMA)
