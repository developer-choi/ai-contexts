# FSD (Feature-Sliced Design)

프론트엔드 기능 중심 아키텍처(FSD) 학습·적용 과정의 사고 흔적.

## 엔티티 배치 기준 — 코드를 어디에 둘 것인가

"코드를 어디에 둘 것인가"의 판단 축:

- 개념적 종속성 — Permission이 User 없이 의미가 있는가?
- 사용 패턴 — 실제로 어떻게 사용되는가?
- 변경의 이유 — Permission이 왜 변경되는가? User 때문인가, 권한 시스템 때문인가?

미해결: Permission을 User entity에 둘지, 별도 entity로 분리할지.

## 작업 순서 — 하향식(Top-down) + 조합(Composition)

페이지 피그마를 받으면 페이지 레이어부터 시작해 아래로 내려가며 개발한다. 페이지에서 여러 widget을 import하고, 그 위젯에서 마크업하다가, 더 작은 단위는 하위 레이어에서 만들어 widget이 import하게 한다.

## FSD 도구체인

FSD는 컨벤션 외에 툴체인도 제공한다 — 아키텍처 검사 린터 Steiger, CLI/IDE 폴더 제너레이터, examples 라이브러리.

## References

### 공식

- 공식문서 — https://feature-sliced.design/docs/get-started/overview
- 예시 — https://feature-sliced.design/examples
- Steiger (아키텍처 린터) — https://github.com/feature-sliced/steiger
- 폴더 제너레이터 (awesome#tools) — https://github.com/feature-sliced/awesome?tab=readme-ov-file#tools

### 본인 작성 문서

- [FSD의 Layer간 의존 관계](https://docs.google.com/document/d/1zym8i-1OyJH6I594Y8gUY4ZjipO3ZNLhu0KfjFcCLrY/edit?tab=t.0)
- [FSD Segments](https://docs.google.com/document/d/1jM3vicMjFpLTFSMQqk-klkwFx04jX11yNuoB9UvU7As/edit?tab=t.0)
- [도메인과 엔티티](https://docs.google.com/document/d/1-HgVmvM10GkkT8CP6C2n22MxJbiqZSPmZ0UQM9WsX1o/edit?tab=t.0)
- [Component Design Pattern](https://docs.google.com/document/d/1AY5SgcMMIN0rwovx0a-IH5LgO4WEN0iy-ggYphL8zaQ/edit?tab=t.0)
- [Dividing Files Standard](https://docs.google.com/document/d/1Dmxi2DZeJOBHdZlqCdKvE3cA0q7kqin83gezejDgH48/edit?tab=t.0#heading=h.a02lfim0mqct)
- [폴더구조의 변화](https://docs.google.com/document/d/1Y742-_j7rf_H_t5SYW6cDwqN9t0V8rxvM0YO44ARkNA/edit?tab=t.0)
- [파일을 쉽게 찾을 수 있어야 한다](https://docs.google.com/document/d/1yY_4_JLejbJnLm_eGP_wfHaD0J6Q-Wq-V4Fq9PyFXX0/edit?tab=t.0#heading=h.rhmjth1m9prh)

### layer

- [FSD의 Layer간 의존 관계 (heading)](https://docs.google.com/document/d/1zym8i-1OyJH6I594Y8gUY4ZjipO3ZNLhu0KfjFcCLrY/edit?tab=t.0#heading=h.ufaypnbtulij)
- 테오 — https://velog.io/@teo/fsd
- 튜토리얼 — https://feature-sliced.design/docs/get-started/tutorial
- overview#basic-example — https://feature-sliced.design/docs/get-started/overview#basic-example
- overview#concepts — https://feature-sliced.design/docs/get-started/overview#concepts
- overview#layers — https://feature-sliced.design/docs/get-started/overview#layers
- [Shared만 규칙이 다른 이유, Shared Layer 상세](https://feature-sliced.design/docs/get-started/tutorial#reuse-generic-code)
- [Shared 상세 (Public API)](https://feature-sliced.design/docs/get-started/tutorial#define-a-strict-public-api)
- [Shared 예시](https://feature-sliced.design/docs/get-started/faq#where-to-store-the-layouttemplate-of-pages)
- [Widget, Shared Layer 설명](https://feature-sliced.design/docs/get-started/tutorial#large-reused-blocks-in-the-ui)
- [Features / Entity Layer 차이](https://feature-sliced.design/docs/get-started/faq#what-is-the-difference-between-a-feature-and-an-entity)
- [pages/features/entities 중첩 가능 여부](https://feature-sliced.design/docs/get-started/faq#can-i-embed-pagesfeaturesentities-into-each-other)
- [튜토리얼 요약](https://feature-sliced.design/docs/get-started/tutorial#summary)

### 사례

- [awesome FSD articles](https://github.com/feature-sliced/awesome?tab=readme-ov-file#articles)
- 네이버 개발자 (테오) — https://velog.io/@teo/fsd
- 카카오페이 — https://tech.kakaopay.com/post/fsd/
- [프론트엔드 도메인 아키텍처](https://velog.io/@k-svelte-master/frontend-domain-architecture)
- [토스 Frontend Fundamentals 모의고사 리뷰 후기 정리](https://velog.io/@alice0751/%ED%86%A0%EC%8A%A4-Frontend-Fundamentals-%EB%AA%A8%EC%9D%98%EA%B3%A0%EC%82%AC-%EB%A6%AC%EB%B7%B0-%ED%9B%84%EA%B8%B0-%EC%A0%95%EB%A6%AC)

### 공식 예제

- [Usage with Next.js](https://feature-sliced.design/docs/guides/tech/with-nextjs)
- [Authentication](https://feature-sliced.design/docs/guides/examples/auth)
- [Types](https://feature-sliced.design/docs/guides/examples/types)
- [Page layouts](https://feature-sliced.design/docs/guides/examples/page-layout)
- [Handling API Requests](https://feature-sliced.design/docs/guides/examples/api-requests)

### 근본 주제 (응집도·결합도)

- [Cohesion and Coupling: the difference · Enterprise Craftsmanship](https://enterprisecraftsmanship.com/posts/cohesion-coupling-difference/)
- [Low Coupling & High Cohesion — German Gorelkin](https://medium.com/german-gorelkin/low-coupling-high-cohesion-d36369fb1be9)

### 근본 문제와 해결 (기존 폴더 방식의 한계)

- [Desegmented (기존 폴더 방식의 단점과 해결)](https://feature-sliced.design/docs/guides/issues/desegmented)
- 네이버 개발자 — [폴더구조의 변화로 이해하는 프론트엔드 멘탈모델 변천사](https://velog.io/@teo/folder-structure)
- [Alternatives](https://feature-sliced.design/docs/about/alternatives)
- [About architecture](https://feature-sliced.design/docs/about/understanding/architecture)
- [Needs driven](https://feature-sliced.design/docs/about/understanding/needs-driven)
- [Knowledge types in the project](https://feature-sliced.design/docs/about/understanding/knowledge-types)
- [Naming](https://feature-sliced.design/docs/about/understanding/naming)

### 적용·마이그레이션

- [Incremental adoption](https://feature-sliced.design/docs/get-started/overview#incremental-adoption)
- [Migration from custom](https://feature-sliced.design/docs/guides/migration/from-custom)
- [Types 예제 (엔티티 배치 참고)](https://feature-sliced.design/docs/guides/examples/types)
