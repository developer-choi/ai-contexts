# 이미지 최적화

## BaseImage 요구사항

모든 이미지에 공통되는 요구사항을 일괄 적용하기 위한 공통 컴포넌트.

### 1. 기본 스타일

- 이미지가 컨테이너를 뚫고 나가지 못하게 한다. (이미지 1000px, 컨테이너 500px → 500px로 제한)
- 이미지가 컨테이너보다 작으면 원본 크기를 유지한다. (이미지 500px, 컨테이너 1000px → 500px 유지)
- [Commit: CustomImage 기본 스타일에 컨테이너 뚫고나가지 못하게 하는 스타일 추가](https://github.com/developer-choi/react-playground/commit/242adb3823948b81dd2a57aebbf64548ea912fa4)

### 2. Fallback 처리

src가 null 등 유효하지 않거나, 이미지 로드 중 오류가 발생한 경우의 대응 전략:

| 모드 | 설명 |
|------|------|
| `customOnError` | 부모에서 onError를 직접 핸들링. 이 경우 내장 Fallback 로직은 동작하지 않는다. |
| `hidden` | 이미지를 숨긴다. (예: 상품 썸네일 위 배너 이미지처럼, 없으면 안 보여야 하는 경우) |
| `replace-image` | 대체 이미지를 노출한다. |
| `replace-element` | 대체 UI(React 엘리먼트)를 노출한다. |
| `default-404` | 디자인 시스템에 정의된 기본 404 이미지 UI를 노출한다. (대체 이미지 + 배경색 박스) |
- [Commit: CustomImage 컴포넌트와 default 404 예제페이지추가](https://github.com/developer-choi/react-playground/commit/5bb91d061d970b2d929e922e8dc4f2b36cde8066)

### 3. Quality

- 기본 quality는 100으로 적용한다. (next/image 기본값 75는 너무 낮음)

### 4. Placeholder

- 이미지 로딩 중 배경색을 보여주는 방안.
- 스켈레톤이 아니라, 이미지 HTML 요소에 배경색을 지정하는 방향을 요구하는 경우 일괄 대응할 수 있도록 하기 위함.

## 이미지 최적화 요구사항

### 1. 기기에 맞는 이미지 크기 요청

- 상품 카드 이미지 영역의 실제 렌더링 width를 기준으로 CDN에 적정 크기를 요청한다.
- 크기 판단은 사용자가 서비스에 접속한 **최초 1회만** 수행한다.
  - 접속 후 브라우저 크기를 줄여도 재계산하지 않는다.
  - 한 번 300px로 결정했으면 이후 추가 페이지의 이미지도 모두 300px이다.
- DPR(Device Pixel Ratio)을 고려한다. Retina(2x) 디스플레이에서는 실제 width의 2배를 요청해야 선명하다.
- 쿼리스트링: `?s={size}`

#### 구현 방식 A: next/image (Next.js 내장)

```
브라우저 → /_next/image?url=원본URL&w=640&q=100 → Next.js 서버가 리사이즈+포맷변환 → 응답
```

- `<Image>` 컴포넌트가 `srcset`을 자동 생성하고, `sizes` prop으로 브라우저에게 크기 힌트를 준다.
- 요청 시 Next.js 서버가 원본 이미지를 가져와서 리사이즈 + WebP/AVIF 변환 + 캐싱한다.
- `loading="lazy"`, `decoding="async"`, CLS 방지 등이 자동 적용된다.
- 이미지 최적화가 **Next.js 서버**에서 일어난다. (= 서버 CPU 부하)
- 기본 device sizes: `[640, 750, 828, 1080, 1200, 1920, 2048, 3840]`

```tsx
import Image from 'next/image';

<Image
  src="https://cdn.example.com/.../image.jpg"
  fill
  sizes="(max-width: 1024px) 50vw, 25vw"
  quality={100}
  alt="상품"
/>
```

#### 구현 방식 B: Lambda@Edge (CDN 레벨)

```
브라우저 → CDN(CloudFront) → Lambda@Edge가 리사이즈+포맷변환 → 캐싱 → 응답
```

- 원본 이미지는 S3/원본 서버에 저장한다.
- CDN 앞단의 Lambda@Edge가 `?s=300&f=webp` 쿼리스트링을 해석하여 Sharp 등으로 변환한다.
- 한 번 생성된 이미지는 CDN에 캐싱되어 이후 요청은 즉시 응답한다.
- 이미지 최적화가 **CDN 엣지**에서 일어난다. (= Next.js 서버 부하 없음, 글로벌 캐시)
- 프론트에서 `srcset`/`sizes`를 직접 조립해야 한다.

```tsx
<img
  srcset={`
    ${url}?s=300&f=webp 300w,
    ${url}?s=600&f=webp 600w,
    ${url}?s=900&f=webp 900w
  `}
  sizes="(max-width: 1024px) 50vw, 25vw"
/>
```

- **주의: step size를 반드시 정의해야 한다.** `srcset`에 넣는 크기를 100px 단위(300, 600, 900...) 등으로 끊어야 한다. 만약 컨테이너 width를 그대로 넘기면 (예: 287px, 431px...) 1px 단위로 서로 다른 리사이즈 요청이 CDN으로 날아가서 캐시 히트율이 바닥나고, Lambda 호출 비용이 폭증하는 대참사가 벌어진다.

#### 비교

| | next/image | Lambda@Edge |
|---|---|---|
| 최적화 위치 | Next.js 서버 | CDN 엣지 |
| 서버 부하 | 있음 | 없음 |
| 캐싱 | 로컬 디스크 캐시 | CDN 글로벌 캐시 |
| srcset 생성 | 자동 | 수동 |
| step size | 내장 preset | 직접 정의 필수 |
| lazy/decoding/CLS | 자동 | 직접 구현 |
| 프레임워크 종속 | Next.js 필수 | 프레임워크 무관 |

### 2. 모던 포맷 제공

- 브라우저가 지원하는 경우 WebP 포맷으로 이미지를 요청한다.
- 쿼리스트링: `?f=webp`

### 3. Layout Shift 방지

- 이미지가 로드되기 전에도 해당 영역의 공간이 확보되어 있어야 한다.
- 이미지 로드 완료 시 주변 콘텐츠가 밀려나지 않아야 한다.

### 4. Lazy Loading

- 뷰포트 바깥의 이미지는 사용자가 스크롤하여 가까이 접근할 때 로드한다.
- 뷰포트 안(above-the-fold)의 이미지는 즉시 로드한다. lazy를 걸면 오히려 느려진다.
