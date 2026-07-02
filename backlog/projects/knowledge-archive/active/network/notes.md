# Network 학습 노트

## 학습 동기

- IP/VPN/CDN/Load Balancer 등 인프라 기초
- OSI 7계층별 동작 (특히 "주소창에 URL 입력 시 일어나는 일")
- 면접 단골 키워드: TCP/IP, HTTP/HTTPS, REST, HTTP/2, TCP vs UDP

## 자주 나오는 질문 키워드

- IP, 서브넷
- HTTP, HTTPS, REST, HTTP/2
- TCP, UDP

## TODO

### 이더넷 vs 인터넷

- 이더넷(Ethernet)을 한글·영어 신뢰할 수 있는 자료로 다 찾아 읽기 (구글링·유튜브)
- 기존에 필기한 이더넷·인터넷 자료 다시 보기
- 종합해서 정리하기

### 클라우드플레어 레퍼런스 뒤지기

- [Cloudflare Learning 허브](https://www.cloudflare.com/ko-kr/learning/) 전반 탐색

### 웹서버 실습

- Apache 또는 nginx로 웹서버 셋팅 실습. 영어가 되면 공식 documents·cookbook으로 튜토리얼 진행
- Apache로 name-based virtual host와 IP-based virtual host를 돌려보며 차이 이해

### CORS 심화

KA `knowledge/cs/network/protocol/cors.md` 후속 보강 자료:

- `crossOrigin="anonymous"` 속성 — [MDN: CORS enabled image](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image) 정독
- 쿠키 속성 심화: HttpOnly, Domain, Secure ([blossoming-man 블로그](https://blossoming-man.tistory.com/entry/https%EC%99%80-cross-domain%EC%97%90%EC%84%9C-%EC%84%9C%EB%B2%84%EC%99%80-%ED%86%B5%EC%8B%A0-%EC%8B%9C-%EC%BF%A0%ED%82%A4-%EB%B0%9B%EB%8A%94-%EB%B2%95))
- [Kakao FE: 문제 해결 너머 — CORS 심화](https://fe-developers.kakaoent.com/2023/230421-beyond-solving-problem-part-2/)
- [javascript.info: fetch crossorigin response headers](https://javascript.info/fetch-crossorigin#response-headers)
- Referrer-Policy 체크 (낮은 우선순위)
- CSRF 토큰 (낮은 우선순위)
