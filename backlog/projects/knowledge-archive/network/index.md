# Network

## 학습 동기

- IP/VPN/CDN/Load Balancer 등 인프라 기초
- OSI 7계층별 동작 (특히 "주소창에 URL 입력 시 일어나는 일")
- 면접 단골 키워드: TCP/IP, HTTP/HTTPS, REST, HTTP/2, TCP vs UDP

## References

### 高지식 거니 영상

- [IP주소와 IP로 알 수 있는 모든 것 (feat. IPv6)](https://youtu.be/IAS3U5ZiI8c)
- [VPN과 프록시의 원리 및 실전 사용법](https://youtu.be/hjRQzHeirw8)
- [VPN 사용을 금지하는 나라들 목록 그리고 이유](https://youtu.be/KPOi1HU_-hs)
- [토르 브라우저의 모든 것 (동작원리, 딥웹/다크웹, 익명성)](https://youtu.be/A3-moPb-_ls)
- [티켓 예매 중 서버가 터졌을 때 일어나는 일 (디도스, 롤, AWS)](https://youtu.be/8W4KC_8CuGA)
- [웹 브라우저에 URL 입력 시 일어나는 일 — 인프라 위주](https://youtu.be/GAyZ_QgYYYo)

### 인프라

- [서버 트래픽 부하는 CDN과 LoadBalancer로 (네이버 클라우드)](https://www.youtube.com/watch?v=GqdYHJNbSBM)
- [AWS를 사용한다면 반드시 알아야 할 네트워크 기초 지식](https://youtu.be/vCNexbgYmQ8)
- [클라우드 플레어로 웹서비스 향상하기](https://youtu.be/6a2_0sxvBjM)

### 학습 자료

- [TCP/IP는 무엇입니까? (Cloudflare)](https://www.cloudflare.com/ko-kr/learning/ddos/glossary/tcp-ip/)
- [방화벽이란 무엇입니까? (FiberMall)](https://www.fibermall.com/ko/blog/what-is-firewall.htm)
- [Cloudflare Learning 허브](https://www.cloudflare.com/ko-kr/learning/)
- [Cloudflare: What is a DDoS botnet?](https://www.cloudflare.com/ko-kr/learning/ddos/what-is-a-ddos-botnet/) (드롭다운에 좋은 자료 많음)
- [Zenarmor: Network Basics](https://www.zenarmor.com/docs/category/network-basics)
- [Learn HTTP (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP)

### OSI 계층 / URL 입력 시 일어나는 일

- [주소창에 velog.io를 입력했을 때 무슨 일이 일어날까? — 1 (네트워크)](https://velog.io/@jay/%EC%A3%BC%EC%86%8C%EC%B0%BD%EC%97%90-velog.io%EB%A5%BC-%EC%9E%85%EB%A0%A5%ED%96%88%EC%9D%84%EB%95%8C-%EB%AC%B4%EC%8A%A8-%EC%9D%BC%EC%9D%B4-%EC%9D%BC%EC%96%B4%EB%82%A0%EA%B9%8C-1-%EB%84%A4%ED%8A%B8%EC%9B%8C%ED%81%AC)
- [주소창에 velog.io를 입력했을 때 무슨 일이 일어날까? — 2 (렌더링)](https://velog.io/@jay/%EC%A3%BC%EC%86%8C%EC%B0%BD%EC%97%90-velog.io%EB%A5%BC-%EC%9E%85%EB%A0%A5%ED%96%88%EC%9D%84%EB%95%8C-%EB%AC%B4%EC%8A%A8-%EC%9D%BC%EC%9D%B4-%EC%9D%BC%EC%96%B4%EB%82%A0%EA%B9%8C-2-%EB%A0%8C%EB%8D%94%EB%A7%81)
- [패킷 분할/재조립이 전송 계층인지 네트워크 계층인지 (Network Engineering SE)](https://networkengineering.stackexchange.com/questions/41165/where-in-the-tcp-ip-stack-does-packet-division-and-reassembly-occur#:~:text=2\)%20Packet%20reassembly%20happens%20at%20the%20network%20layer.)

### OKKY / 면접

- [네이버 네트워크 질문 모음 (Notion)](https://www.notion.so/Network-Web-339dc865525a4166a02665138b92e160)
- [TCP 혼잡제어·흐름제어·오류제어 개요 (OKKY)](https://okky.kr/article/738999)
- [신입 업무에 어려움이 있습니다 (OKKY)](https://okky.kr/article/800285)
- [HTTP통신과 소켓통신 차이 (OKKY)](https://okky.kr/article/819329)
- [[펌] 인터넷이 동작하는 아주 구체적인 원리 (OKKY)](https://okky.kr/article/674604)

### 서적

- "모두의 네트워크" — OSI 계층 러프 파악
- "HTTP 완벽 가이드" — TCP/HTTP 심화
- "TCP/IP 소켓 프로그래밍"

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

## 자주 나오는 질문 키워드

- IP, 서브넷
- HTTP, HTTPS, REST, HTTP/2
- TCP, UDP

## TODO

### CORS 심화

KA `knowledge/cs/network/protocol/cors.md` 후속 보강 자료:

- `crossOrigin="anonymous"` 속성 — [MDN: CORS enabled image](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image) 정독
- 쿠키 속성 심화: HttpOnly, Domain, Secure ([blossoming-man 블로그](https://blossoming-man.tistory.com/entry/https%EC%99%80-cross-domain%EC%97%90%EC%84%9C-%EC%84%9C%EB%B2%84%EC%99%80-%ED%86%B5%EC%8B%A0-%EC%8B%9C-%EC%BF%A0%ED%82%A4-%EB%B0%9B%EB%8A%94-%EB%B2%95))
- [Kakao FE: 문제 해결 너머 — CORS 심화](https://fe-developers.kakaoent.com/2023/230421-beyond-solving-problem-part-2/)
- [javascript.info: fetch crossorigin response headers](https://javascript.info/fetch-crossorigin#response-headers)
- Referrer-Policy 체크 (낮은 우선순위)
- CSRF 토큰 (낮은 우선순위)
