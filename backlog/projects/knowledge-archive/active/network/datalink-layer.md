> 이관: KA main `knowledge/cs/network/layers/datalink-layer.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [network, concept, protocol]
source: official
priority:
---

# Questions

- [UNVERIFIED] 데이터링크 계층(Datalink Layer)이란 무엇인가?
- [UNVERIFIED] 이더넷(Ethernet)이란 무엇인가?
  - [UNVERIFIED] CSMA/CD란 무엇이며, 어떤 순서로 동작하는가?
  - [UNVERIFIED] 현재 이더넷에서 CSMA/CD가 사용되지 않는 이유는?
- [UNVERIFIED] 프레임(Frame)이란 무엇이며, 어떻게 구성되는가?
  - [UNVERIFIED] 이더넷 헤더에는 어떤 정보가 담기는가?
  - [UNVERIFIED] 트레일러(FCS, Frame Check Sequence)의 역할은?
- [UNVERIFIED] 허브 환경에서 특정 컴퓨터로 데이터를 보내면 다른 컴퓨터들은 어떻게 동작하는가?
- [UNVERIFIED] 스위치의 MAC 주소 테이블이 비어 있을 때 발생하는 flooding이란 무엇인가?
- [UNVERIFIED] Full Duplex와 Half Duplex의 차이는?
  - [UNVERIFIED] 허브가 Half Duplex를 사용할 수밖에 없는 이유는?
  - [UNVERIFIED] 스위치가 Full Duplex 통신이 가능한 이유는?
- [UNVERIFIED] 데이터링크 계층의 sublayer인 LLC와 MAC은 각각 어떤 역할을 하는가?

---

# Answers

## [UNVERIFIED] 데이터링크 계층(Datalink Layer)이란 무엇인가?

### User Answer
노드 간 전달에 책임이 있는 계층이다.
같은 네트워크 안에서 데이터를 주고받기 위해 필요한 계층이다.
MAC 주소를 통해 다음 노드가 어디에 있는지를 알 수 있다.

---

## [UNVERIFIED] 이더넷(Ethernet)이란 무엇인가?

### User Answer
데이터링크 계층에서 가장 많이 사용되는 기술이다.
LAN을 구축하기 위해 디바이스를 연결할 때 쓰는 프로토콜이다.

---

## [UNVERIFIED] CSMA/CD란 무엇이며, 어떤 순서로 동작하는가?

### User Answer
허브 환경에서는 여러 컴퓨터가 동시에 데이터를 보내면 충돌(collision)이 발생할 수밖에 없다.
충돌이 발생하는 원인은 데이터가 동시에 같은 케이블을 지나가기 때문이다.
그래서 이더넷은 데이터를 보내는 시점을 늦추는 방식(CSMA/CD)으로 동작한다.

동작 순서:

**CS (Carrier Sense)**
- 송신 측 컴퓨터가 케이블에 데이터가 전송되고 있는지 확인한다.
- 만약 전송되고 있다면 잠시 기다렸다가 다시 반복한다.

**MA (Multiple Access)**
- 케이블에 데이터가 흐르고 있지 않다면, 데이터를 보내도 좋다는 규칙이다.

**CD (Collision Detection)**
- 충돌이 발생했는지를 확인한다.
- 발생했다면 잠시 후 다시 반복한다.

---

## [UNVERIFIED] 현재 이더넷에서 CSMA/CD가 사용되지 않는 이유는?

### User Answer
효율이 좋지 않기 때문에 지금은 CSMA/CD를 사용하지 않는다.
그 대신 스위치라는 장비를 사용한다.
장비 발전 순서는 리피터 → 허브 → 스위치다.

---

## [UNVERIFIED] 프레임(Frame)이란 무엇이며, 어떻게 구성되는가?

### User Answer
데이터에 이더넷 헤더와 트레일러를 추가한 것을 프레임(Frame)이라고 부른다.

---

## [UNVERIFIED] 이더넷 헤더에는 어떤 정보가 담기는가?

### User Answer
이더넷 헤더는 다음 세 가지로 구성된다.

- 목적지 MAC 주소
- 출발지 MAC 주소
- 이더넷 타입: 상위 계층(Network Layer)의 프로토콜 종류를 나타낸다.

---

## [UNVERIFIED] 트레일러(FCS, Frame Check Sequence)의 역할은?

### User Answer
데이터 전송 도중 오류가 발생했는지 확인하는 용도다.
CRC(Cyclic Redundancy Check) 값이 들어 있다.

---

## [UNVERIFIED] 허브 환경에서 특정 컴퓨터로 데이터를 보내면 다른 컴퓨터들은 어떻게 동작하는가?

### User Answer
허브에 연결된 컴퓨터 1이 컴퓨터 3으로 데이터를 전송한다고 가정하면, 허브는 연결된 모든 컴퓨터에게 데이터를 전달한다.
이때 컴퓨터 2, 4, 5는 목적지 MAC 주소와 자신의 MAC 주소가 달라서 데이터를 파기한다.
컴퓨터 3은 목적지 MAC 주소가 자신과 일치하므로 데이터를 수신한다.

---

## [UNVERIFIED] 스위치의 MAC 주소 테이블이 비어 있을 때 발생하는 flooding이란 무엇인가?

### User Answer
스위치에는 MAC address table이 있고, 여기에는 포트 번호와 MAC 주소가 쌍으로 저장된다.
이 테이블 덕분에 스위치는 특정 컴퓨터에게만 데이터를 전송할 수 있다.

하지만 스위치 전원을 처음 켰을 때는 MAC address table이 비어 있다.
이 상태에서 테이블에 없는 주소로 데이터를 전송하려고 하면, 연결된 다른 모든 컴퓨터에게 데이터가 전송된다.
이것을 flooding이라고 부른다.

---

## [UNVERIFIED] Full Duplex와 Half Duplex의 차이는?

### User Answer
Full Duplex는 송신과 수신이 동시에 일어나는 통신 방식이다.
Half Duplex는 하나의 회선으로 송신과 수신을 번갈아 가며 하는 방식이다.

---

## [UNVERIFIED] 허브가 Half Duplex를 사용할 수밖에 없는 이유는?

### User Answer
허브는 송신과 수신을 동일한 회선으로 진행하기 때문에, 동시에 데이터를 보내면 충돌이 발생한다.
그래서 송신과 수신을 번갈아 가며 진행할 수밖에 없고, 결과적으로 효율이 떨어진다.

---

## [UNVERIFIED] 스위치가 Full Duplex 통신이 가능한 이유는?

### User Answer
스위치는 송신과 수신하는 선로가 별도이기 때문에 Full Duplex로 통신할 수 있다.

---

## [UNVERIFIED] 데이터링크 계층의 sublayer인 LLC와 MAC은 각각 어떤 역할을 하는가?

### User Answer
**LLC sublayer**
- 흐름 제어와 오류 제어를 담당한다.

**MAC sublayer**
- CSMA/CD 접근 방법에 대한 동작을 담당한다.

### Reference
- https://en.wikipedia.org/wiki/Logical_link_control
- https://en.wikipedia.org/wiki/Medium_access_control
- http://www.ktword.co.kr/test/view/view.php?m_temp1=113
