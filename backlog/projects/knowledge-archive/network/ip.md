> 이관: KA main `knowledge/cs/network/protocol/ip.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [network, protocol, concept]
source: google-doc
priority:
---

# Questions

- [UNVERIFIED] IP란 무엇인가?
- [UNVERIFIED] Public IP란 무엇인가?
- [UNVERIFIED] Private IP란 무엇인가?
  - [UNVERIFIED] Private IP를 외부에서 접근할 수 있으면 어떤 문제가 생기는가?
- [UNVERIFIED] IP Address의 클래스(A~C)란 무엇인가?
- [UNVERIFIED] Network Address란 무엇인가?
- [UNVERIFIED] Broadcast Address란 무엇인가?

---

# Answers

## [UNVERIFIED] IP란 무엇인가?

### User Answer
컴퓨터를 인터넷에서 특정할 수 있는 값이다.
특정할 수 있어야 그 컴퓨터로 데이터를 보낼 수 있기 때문이다.
현실에서 택배를 보낼 때 받는 사람의 주소를 쓰는 것과 같다.

> #### User Annotation:
> 사람을 특정하는 주민번호, 집의 위치를 특정하는 주소, 네트워크 상에서 컴퓨터의 위치를 특정하는 IP 주소는 모두 근본적으로 동일한 필요성을 갖고 있다.

---

## [UNVERIFIED] Public IP란 무엇인가?

### User Answer
외부에서 접근할 수 있는 IP 주소다.
ISP(예: SK 인터넷)가 우리 집의 Public IP를 할당해 준다.

---

## [UNVERIFIED] Private IP란 무엇인가?

### User Answer
외부에서 접근할 수 없는 IP 주소다.
같은 네트워크 상의 장치가 서로 통신할 때 사용한다.
Private IP는 `10.x.x.x`, `172.16.x.x ~ 172.31.x.x`, `192.168.x.x` 대역이다.

ISP가 제공하는 Public IP는 라우터에만 할당하고, LAN 안에 있는 컴퓨터에는 LAN의 네트워크 관리자 또는 DHCP를 통해 자동으로 할당한다.

> #### User Annotation:
> Private IP 대역을 따로 만들지 않고 내부망 컴퓨터까지 Public IP를 할당했다면 주소가 더 부족해졌을 것이다. 그래서 Private IP 대역을 분리한 것으로 보인다.
> 이 관점에서 보면 "Private IP는 절대로 Public IP로 할당할 수 없다"는 당연한 말이다.

> #### User Annotation:
> 리눅스 기준 `ifconfig`가 Private IP를 확인할 수 있는 명령어다.

---

## [UNVERIFIED] Private IP를 외부에서 접근할 수 있으면 어떤 문제가 생기는가?

### User Answer
옆집 프린터를 마음대로 쓸 수 있게 되는 것과 같다.
Private IP는 보안 관점에서도 필요하다.

집에서는 프린터로 문서를 인쇄할 수 있지만, 다른 집에 있는 모르는 사람이 내 집의 프린터로 문서를 인쇄할 수는 없다.
하지만 집에 있는 내 핸드폰으로 외부 네트워크(인터넷)로 나갈 때는 Public IP로 나간다.

Server들은 같은 네트워크 안에 있어서 Private IP로 통신할 수 있지만, 내 개인 컴퓨터는 Server들과 다른 네트워크에 있어서 Private IP로 통신할 수 없다.

> #### User Annotation:
> 그래서 프로젝트를 구현할 때 로컬 환경변수에는 Public IP 주소를 적고, 개발·운영 환경변수에는 Private IP 주소를 적어야 한다.

> #### User Annotation:
> 내 PC에서 `ipconfig`를 했을 때 `172.xxx`가 나오는데, 외부에서 이 IP로 아무리 접속을 시도해도 불가능하다.

---

## [UNVERIFIED] IP Address의 클래스(A~C)란 무엇인가?

### User Answer
IP Address(32비트)는 A 클래스부터 E 클래스까지 나눌 수 있고, 각 클래스를 다시 Network ID와 Host ID로 나눌 수 있다.

- A 클래스: 대규모 네트워크. 앞 8비트가 Network ID, 뒤 24비트가 Host ID.
- B 클래스: 중규모 네트워크. 앞 16비트가 Network ID, 뒤 16비트가 Host ID.
- C 클래스: 소규모 네트워크. 앞 24비트가 Network ID, 뒤 8비트가 Host ID.

---

## [UNVERIFIED] Network Address란 무엇인가?

### User Answer
Host ID가 0인 IP 주소다.
해당 네트워크를 대표하는 IP 주소이며, IP 주소로 할당할 수 없는 특별한 주소다.

---

## [UNVERIFIED] Broadcast Address란 무엇인가?

### User Answer
Host ID가 255인 IP 주소다.
해당 네트워크 안에 있는 모든 컴퓨터에게 데이터를 보낼 때 사용하는 주소다.
Network Address처럼 IP 주소로 할당할 수 없는 특별한 주소다.
