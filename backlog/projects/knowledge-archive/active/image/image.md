# Image

이미지 포맷·웹 성능·`next/image` 관련 사고 흔적 통합.

## TODO / 미해결 질문

- 이미지와 페이지 로딩 속도의 관계? 이미지 불러오는 동안 페이지가 안 뜨는 것도 아닌데.
- 이미지 최적화의 효과 측정 — 카카오엔터 글의 개발자도구 하단 갯수·용량 표기 보는 법 모름.

## 크기·비율 처리

`next/image` 활용 시 이미지 크기와 자체 비율 처리 정책. Next.js 12까지는 (deprecated) `next/image`의 `layout` props로 구현했었음.

### 핵심 구분

- **이미지가 차지하는 공간 크기·비율** ≠ **이미지 자체 비율**
- 예: 1대1 원형 썸네일에 가로로 긴 원본 → 둘은 서로 다른 개념이므로 영향받으면 안 됨
- 이상적인 건 노출 크기에 딱 맞는 원본 사용이지만 불가능 → 정책 필요

### 절대 규칙

- **이미지는 어떠한 경우에도 찌부되면 안 된다** — `object-fit: fill` 동작 주의 (Next.js 12 `next/image` 기본값이 `fill`이었을 것)
- **이미지 크기는 이미지 자체 비율에 영향을 받으면 안 된다** — 같은 슬롯에 비율 다른 이미지를 넣었을 때 슬롯 크기가 제각각이면 잘못

### 크기 변화 케이스

| Case | 조건 | 예시 |
|------|------|------|
| 1 | 컨테이너 크기와 무관하게 이미지 크기 고정 | 메뉴 아이콘 (FHD→QHD에서 아이콘이 같이 커지면 부자연스러움) |
| 2 | 컨테이너가 커지면 이미지도 커지고, 작아지면 작아짐 (비율 유지) | 상품 썸네일 캐러셀. G마켓은 컨테이너 최소 크기 지정으로 회피 |
| 3 | 컨테이너 비율에 이미지 비율이 따라감 | 와이드 배경 이미지 |

### 비율(object-fit) 케이스

케바케가 커서 추가 정리 필요.

- **contain이 자연스러운 경우**: 동그라미 상품 썸네일 (cover하면 오히려 이상함)
- **cover가 자연스러운 경우**: 카테고리 상단 모델 배경 이미지 (비율이 살짝 달라도 꽉 채우는 게 나음)

### 테스트 케이스

1. 컨테이너 크기가 작아짐/커짐에 따라 이미지 크기가 의도대로 변하거나 고정되는가?
2. 이미지 크기보다 큰 이미지, 작은 이미지, 다른 비율 이미지를 넣었을 때 정상 노출되는가?
   - 극단적으로 작으면서 가로로 긴 이미지
   - 극단적으로 작으면서 세로로 긴 이미지
   - 극단적으로 크면서 가로로 긴 이미지
   - 극단적으로 크면서 세로로 긴 이미지

크기·비율 TODO: "이미지는 적합한 비율로 보여야 한다" 항목 — 케바케 너무 커서 케이스 추가 정리 필요.

## `next/image` gotchas

### Next 13 — next.config.js domain 미등록

`next.config.js`에 domain 등록 안 한 src 전달 시:

- development: 에러 + 페이지 안 뜸
- production: 400 에러 + 안 나옴 ← 문제

관리자에서 이미지를 URL로 등록할 때(파일 아님) 생전 처음 보는 domain이면? `next.config.js`에 wildcard·런타임 등록 설정이 있는지 확인 필요.

### Sharp 경고

```
Warning: For production Image Optimization with Next.js, the optional 'sharp' package
is strongly recommended. Run 'yarn add sharp', and Next.js will use it automatically.
```

[sharp-missing-in-production](https://nextjs.org/docs/messages/sharp-missing-in-production)

메인 배너 새로 넘길 때 흰 바탕이 납득 안 될 정도로 오래 가는 현상 — sharp 적용 전후 비교 필요.

검증 절차:
1. 이미지 최적화 (빌드 후 한 번 방문)
2. 메인 배너 늦게 뜨는 버그 예제 확보 (개발자도구 Timing, 용량)
3. sharp 적용
4. 다시 이미지 최적화
5. 메인 배너 빨리 뜨는지 확인 → 안 되면 sharp 적용 방법 재확인

## 이미지 로딩 캐시 흐름 — 본인 정리 (출처·검증 약함)

**서버 기준**:
- `yarn build` → 최초 접근: 느림 (원본 이미지 그대로 노출)
- 이후 접근: 빠름 (최적화된 이미지 생성됨)

**사용자 기준**:
1. 빌드 후 첫 사이트 방문자 → 느림 (원본 받아야 함, 캐시 없음)
2. 빌드 후 누군가 이미 접근했음 → 적당함 (최적화된 이미지 받음)
3. 두 번째부터 → 매우 빠름 (캐싱)

## 요구사항 메모 (쇼핑몰 메인 배너)

1. **404 처리**:
   - 관리자에서 이미지 선택사항이라 안 올린 경우 (src가 null/빈문자열)
   - URL은 있지만 실제 이미지가 없는 경우
2. **메인 배너 다음 슬라이드 빈 화면 방지**:
   - `priority` prop: 첫 페이지 로딩 이미지 채움 여부 결정 → 메인 배너류는 전부 true?
   - 뷰포트 한참 아래의 swiper 배너는 priority false → IntersectionObserver로 뷰포트 진입 시 priority true 미리 설정 → 사용자 스와이프 시 빈 공간 없게
3. 페이지 첫 접근 시 이미지 빨리 뜨면 좋겠음

## References

### 이미지 포맷 / 웹 성능 일반

- [JPEG은 왜 디지털 풍화가 생길까](https://youtu.be/tHvZngU14jE)
- [웹사이트 로딩이 더 빨라지는 매직? 🍯 꿀팁 공유 10분컷!](https://youtu.be/8EWwyAcqR6o)
- [이미지 확장자별 특징 정리](https://codingmoondoll.tistory.com/entry/이미지-확장자별-특징-정리)

### `next/image`

- [Next/Image를 활용한 이미지 최적화 — 카카오엔터 테크블로그](https://tech.kakaoent.com/front-end/2022/220714-next-image/) ([미러](https://fe-developers.kakaoent.com/2022/220714-next-image/))
- [Goodbye next/image](https://blog.kmong.com/goodbye-next-image-f83c85378133)
- [(Pages Router) next/image layout (Google Docs)](https://docs.google.com/document/d/1bkBCegeXnm79iwkyr4OAa5Z2VkoK-I98NdiPtNxRiHI/edit)
- [CustomImage (Google Docs)](https://docs.google.com/document/d/1HOZvxrwpqqsXWs_-1JT624iDEKQSeoiv1jn6HkqTyTU/edit#)
- [Image Size, Ratio (Google Docs)](https://docs.google.com/document/d/1ekKcYM2guCWQbsyOMALkzCmGH3GapzZ7z9N-EAJnGMo/edit#heading=h.otrdp15m6yb1) — 위 「크기·비율 처리」 섹션

### 이미지 최적화 학습 자료

- https://nextjs.org/learn/dashboard-app/optimizing-fonts-images#why-optimize-images
- https://nextjs.org/docs/basic-features/image-optimization
- https://nextjs.org/docs/api-reference/next/image
- [Choose the right image format](https://web.dev/articles/choose-the-right-image-format)
- [Choose the correct level of compression](https://web.dev/articles/compress-images)
- [Replace animated GIFs with video for faster page loads](https://web.dev/articles/replace-gifs-with-videos)
- [Serve responsive images](https://web.dev/articles/serve-responsive-images)
- [Serve images with correct dimensions](https://web.dev/articles/serve-images-with-correct-dimensions)
- [Use image CDNs to optimize images](https://web.dev/articles/image-cdns)
- [Browser-level image lazy loading](https://web.dev/articles/browser-level-image-lazy-loading)
- [The performance effects of too much lazy loading](https://web.dev/articles/lcp-lazy-loading)
- [프론트엔드 성능 최적화 - 이미지 파일 최적화](https://codingmoondoll.tistory.com/entry/프론트엔드-성능-최적화-4-이미지-파일-최적화)
- [웹사이트 최적화 — 이미지 파트 (올리브영)](https://oliveyoung.tech/blog/2021-11-22/How-to-Improve-Web-Performance-with-Image-Optimization/)
- [Front-End 이미지 최적화 방법 3가지](https://velog.io/@rjc1704/FE-이미지-최적화-방법-3가지)
- [프론트엔드 이미지 최적화에 관하여](https://velog.io/@resyve/d7uz4czw)
- [크몽 — 이미지 최적화](https://blog.kmong.com/이미지-최적화로-사용자-경험-업그레이드하기-기다림은-이제-그만-605d87d1b940)

### SEO

- [이미지 최적화 — Google SEO 가이드](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ko#images)
- [Google SEO 이미지 가이드](https://developers.google.com/search/docs/appearance/google-images?hl=ko)
- [모바일 우선 색인 — 이미지 점검](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=ko#check-images)

### Related history (Google Docs)

- [Swiper Initial Loading Bug](https://docs.google.com/document/d/1Ta3s3dQNWivP1e8a_LpoLVscJhtbnkAlWeAuFdiaphc/edit)
- [next/image Priority History](https://docs.google.com/document/d/1WMbLSyiByAkPLu0BxWpZTdD_QT19ZlldhPud6y7ANlA/edit#)
