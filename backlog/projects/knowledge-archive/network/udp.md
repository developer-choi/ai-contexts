> 이관: KA main `knowledge/cs/network/protocol/udp.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [network, protocol, concept]
source: google-doc
priority:
---

# Questions

- [UNVERIFIED] Connectionless Communication(비연결형 통신)이란 무엇인가?
- [UNVERIFIED] UDP는 TCP와 비교하여 어떤 점이 다른가?
  - [UNVERIFIED] UDP가 TCP보다 빠른 이유는 무엇인가?
- [UNVERIFIED] 데이터그램(Datagram)이란 무엇인가?
- [UNVERIFIED] UDP 헤더에는 어떤 정보가 담기는가?
- [UNVERIFIED] LAN 환경에서 UDP는 어떻게 활용되는가?
  - [UNVERIFIED] 브로드캐스트처럼 불특정 다수에게 데이터를 보낼 때 TCP가 적합하지 않은 이유는?

---

# Answers

## [UNVERIFIED] Connectionless Communication(비연결형 통신)이란 무엇인가?

### User Answer
효율성을 위해 중간에 확인하는 절차가 없는 통신 방식이다.
같은 목적지임에도 불구하고 패킷들은 서로 다른 경로를 통해 전달될 수 있다.
중간에 일부 패킷이 누락될 수 있다.
IP도 비연결형 프로토콜이다.

---

## [UNVERIFIED] UDP는 TCP와 비교하여 어떤 점이 다른가?

### User Answer
TCP는 데이터를 보내기 전에 3-way handshake로 연결을 확립하는 절차가 있지만, UDP는 그런 절차가 없다.
TCP는 데이터를 보낼 때조차 확인 절차를 거치지만, UDP는 그런 절차가 없다. (비연결형 통신이기 때문)

---

## [UNVERIFIED] UDP가 TCP보다 빠른 이유는 무엇인가?

### User Answer
UDP는 2가지 절약을 통해 TCP보다 빠르다.
- 연결 확립 절차(3-way handshake)를 생략한다.
- 데이터 전송 중 확인 절차를 생략한다.

---

## [UNVERIFIED] 데이터그램(Datagram)이란 무엇인가?

### User Answer
UDP Header가 붙은 데이터를 데이터그램이라고 부른다.
UDP Header는 TCP Header보다 크기가 더 적다. (오직 빠른 전송을 위해)

---

## [UNVERIFIED] UDP 헤더에는 어떤 정보가 담기는가?

### User Answer
- Source Port Number
- Destination Port Number

---

## [UNVERIFIED] LAN 환경에서 UDP는 어떻게 활용되는가?

### User Answer
LAN에 있는 모든 컴퓨터에 브로드캐스트할 때 UDP를 사용한다.

---

## [UNVERIFIED] 브로드캐스트처럼 불특정 다수에게 데이터를 보낼 때 TCP가 적합하지 않은 이유는?

### User Answer
TCP는 데이터를 보내기 전에 3-way handshake로 연결부터 확립해야 하고, 데이터를 보낼 때도 확인해야 하기 때문에 브로드캐스트처럼 불특정 다수에게 데이터를 보내는 경우에는 적합하지 않다.
