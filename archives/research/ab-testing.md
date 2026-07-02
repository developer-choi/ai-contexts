# A/B 테스트

## 참고 자료

- https://brunch.co.kr/@digitalnative/19
- https://www.oracle.com/kr/cx/marketing/what-is-ab-testing/
- https://vercel.com/blog/ab-testing-with-nextjs-and-vercel
- [딥리서치 분석결과](https://gemini.google.com/app/8b69ff905d3940d8)

## 질문목록

### A/B 테스트가 무엇인가요?

Control Group / Experimental Group 나눠서 효과 비교하기

### A/B 테스트 도입 로드맵

https://www.oracle.com/kr/cx/marketing/what-is-ab-testing/

### A/B 테스트 방법론 종류

주요 방식은 노출 분산 방식 / 사용자 분산 방식 2개가 있음.

### A/B 테스트의 목표 설정방법은? = 신뢰할 수 있는 A/B 테스트를 만들려면?

KPI를 무엇으로 잡을것인가

[AA Test / P-Value 분석이 있음.](https://brunch.co.kr/@digitalnative/19)

분석 도구는 무엇을 써야하는가? (Nextjs는 Heap 씀)

### A/B 테스트 개발 방법

#### 상세 장단점 비교

| 구분 | 인프라 단 (ALB) | 에지/앱 단 (Lambda/Middleware) |
|------|-----------------|-------------------------------|
| 장점 | **압도적인 성능**: 코드 실행 시간이 거의 없음.<br>**안정성**: 애플리케이션 코드가 터져도 인프라는 동작함.<br>**언어 독립적**: 어떤 언어로 만든 앱이든 상관없음. | **정교한 타겟팅**: 사용자 세션, 로그인 여부 기반 분산 가능.<br>**유연성**: 복잡한 비즈니스 로직 적용 가능.<br>**개발 편의성**: 프론트엔드 개발자가 직접 제어 가능. |
| 단점 | **단순함**: 비즈니스 로직(ID 기반 등) 적용 불가능.<br>**인프라 종속**: AWS 설정 권한이 필요함. | **성능 저하**: 모든 요청에 대해 코드를 실행해야 함 ($O(1)$이라도 지연 누적).<br>**코드 복잡도**: 배포 로직과 비즈니스 로직이 섞임. |

#### 구현 계층별 상세

**1. 인프라 단 (ALB / Route 53)**

- **접근 가능한 정보:** IP 주소, HTTP 헤더(User-Agent 등), 단순 쿠키 값, 요청 경로.
- **한계:** 사용자님의 서비스 로직(예: 이 사용자가 유료 회원인가? 장바구니에 무엇을 담았는가?)에 접근할 수 없습니다. 데이터베이스와 통신할 수도 없습니다.
- **용도:** 아주 단순하고 빠른 비율 기반 분산(80 : 20)이나 지역별 분산에 적합합니다.

**2. 에지 단 (Lambda@Edge / CloudFront Functions)**

- **접근 가능한 정보:** 모든 HTTP 요청 데이터(Headers, Cookies, Query Params).
- **한계:** Next.js 애플리케이션 내부 상태나 API 소스 코드와 분리되어 있습니다. AWS 리소스(DynamoDB 등)에 접근은 가능하지만, 네트워크 왕복 시간이 추가되어 성능 이점(Low Latency)이 줄어들 수 있습니다.
- **용도:** 브라우저에 도달하기 전 최전방에서 성능 위주의 전역 필터링을 수행할 때 유리합니다.

**3. 애플리케이션 단 (Next.js Middleware)**

- **접근 가능한 정보:** 모든 HTTP 요청 데이터 + **애플리케이션 컨텍스트**.
- **장점:** Next.js 프로젝트의 설정과 유틸리티 함수를 공유할 수 있습니다. 예를 들어, `auth.ts` 같은 라이브러리를 통해 사용자 세션을 즉시 확인하고 그 결과에 따라 리라이트(Rewrite)를 결정할 수 있습니다.
- **한계:** 요청이 이미 오리진 서버 근처까지 도달한 상태이므로, 에지 단보다는 네트워크 지연이 약간 더 발생합니다.

#### 1-4. AB Test를 해볼 수 있는 간단한 툴

그렇다면 이러한 AB Test를 실제로 어떻게 수행해볼 수 있을까요?

*(원문 이미지: 좌측 Google Optimize 로고, 우측 Optimizely 로고)*

가장 일반적으로 활용되는 툴들은 Optimizely와 Google Optimize360이 있습니다. 물론 제가 근무하는 데이블이나, 그 외에 많은 기술기업들은 자체적으로 AB Testing Platform을 보유하고 있기도 합니다. 두가지 Tool 모두 스크립트 방식으로 특정 스크립트를 AB Test를 원하는 영역에 넣으면 선택한 실험 타입에 따라 AB Test가 진행이 되고 그 결과값까지 대시보드로 분석되어 나오기 때문에 자체 플랫폼이 없는 서비스 등은 적극 활용하기에 좋습니다.

> 출처: https://brunch.co.kr/@digitalnative/19

메모: 뭔가 툴도 있다는데, 이거 있으면 내가 개발 안해도 되는건가? 돈만내면? 그치만 커스텀 범위가 적으려나?

### Application 단에서 구현하는 방법

[edge middleware](https://vercel.com/blog/ab-testing-with-nextjs-and-vercel) + feature flag를 [AWS AppConfig](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile-feature-flags.html)로 코드수정없이 조정 가능

### A/B 테스트 구축 시 발생가능 한 문제와 해결방법

성능 저하 (Flicker)

## 인프라 단에서 구분하는 방법 더 자세히

### 가중치 기반 라우팅

AWS의 **Application Load Balancer (ALB)**나 **Route 53**을 사용하여 트래픽을 나누는 방식입니다.

- **ALB 가중치 기반 대상 그룹(Weighted Target Groups):** 하나의 로드 밸런서 뒤에 두 개의 대상 그룹(기존 버전 서버군, 신규 버전 서버군)을 둡니다. ALB 설정에서 트래픽의 80%는 A 그룹으로, 20%는 B 그룹으로 보내도록 설정합니다.
- **Route 53 가중치 기반 라우팅(Weighted Routing):** DNS 레벨에서 트래픽을 나눕니다. `example.com` 요청에 대해 IP 주소 A와 IP 주소 B를 특정 비율로 응답하게 합니다.

### 클라우드프런트와 람다 엣지 활용

애플리케이션 서버에 도달하기 전, CDN 계층에서 트래픽을 가로채어 분산합니다.

- **Lambda@Edge / CloudFront Functions:** 사용자의 요청이 오리진 서버에 도달하기 전에 에지(Edge)에서 간단한 함수를 실행합니다. 여기서 쿠키를 확인하거나 난수를 생성하여 사용자를 다른 오리진(S3 버킷이나 다른 서버)으로 리라이트(Rewrite)합니다. Next.js 미들웨어와 비슷해 보이지만, 서버가 아닌 CDN 계층에서 동작하므로 더 빠르고 인프라적인 성격이 강합니다.
