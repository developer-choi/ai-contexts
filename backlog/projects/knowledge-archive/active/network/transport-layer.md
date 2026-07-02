> 이관: KA main `knowledge/cs/network/layers/transport-layer.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [network, concept]
source: google-doc
priority:
---

# Questions

- [UNVERIFIED] Transport Layer의 역할은 무엇인가?
  - [UNVERIFIED] Port Addressing이란 무엇인가?
  - [UNVERIFIED] Segmentation and Reassembly는 어떤 순서로 동작하는가?
  - [UNVERIFIED] Accuracy는 왜 Transport Layer의 책임인가?
- [UNVERIFIED] Port Number와 PID의 차이는 무엇인가?
- [UNVERIFIED] Port Number란 무엇이며, 한 컴퓨터에서 여러 서비스를 동시에 사용할 수 있는 이유는?
- [UNVERIFIED] Port Number의 범위별 분류(well-known / registered / dynamic)는 어떻게 나뉘는가?

---

# Answers

## [UNVERIFIED] Transport Layer의 역할은 무엇인가?

### User Answer
Transport Layer는 다음 세 가지 역할을 한다.

1. Port Addressing
2. Segmentation and Reassembly
3. Accuracy

---

## [UNVERIFIED] Port Addressing이란 무엇인가?

### User Answer
프로세스 대 프로세스 전달에 책임을 진다.

---

## [UNVERIFIED] Segmentation and Reassembly는 어떤 순서로 동작하는가?

### User Answer
데이터가 처음 보낸 순서 그대로 도착하는 것을 보장한다.

동작 순서:

1. Application Layer에서 내려온 데이터를 받는다.
2. 작게 잘라서 Sequence Number를 붙인다. (= 세그먼테이션 작업)
3. 출발지·목적지 포트 번호도 추가해서 Network Layer로 내린다.
4. (출발지 Network Layer ~ 도착지 Network Layer 과정)
5. 도착지 Transport Layer에서 Sequence Number로 원래 순서 그대로 재조립한다. (패킷들이 순서 없이 도착하기 때문.)
6. 그러면서 Sequence Number로 손실 여부도 판단한다.

---

## [UNVERIFIED] Accuracy는 왜 Transport Layer의 책임인가?

### User Answer
전송 계층 없이 물리 계층, 데이터링크 계층, 네트워크 계층까지만 있으면, 다른 네트워크의 목적지까지 데이터를 전송할 수는 있지만 데이터가 정확하게 전송되는 것까지는 보장할 수 없다.
즉, Transport Layer는 데이터가 정확하게 전송되는 것을 담당한다.

---

## [UNVERIFIED] Port Number와 PID의 차이는 무엇인가?

### User Answer
- **PID**: 실행 중인 프로그램(프로세스)을 구분하기 위한 값.
- **Port Number**: (통신 중인) 포트를 구분하기 위한 값.

차이점:

1. 모든 프로세스가 네트워크와 통신하는 것은 아니다.
2. PID는 매번 다르다. 아무 값이나 가질 수 있다.
3. 하지만 Port는 매번 다르지 않은 포트가 있다. (Well-known port)

### Reference
- https://superuser.com/a/1282357

---

## [UNVERIFIED] Port Number란 무엇이며, 한 컴퓨터에서 여러 서비스를 동시에 사용할 수 있는 이유는?

### User Answer
Port Number는 포트를 구분하기 위한 값이다.
포트는 프로세스가 네트워크와 통신하는 창구를 말한다.

한 컴퓨터에서 여러 서비스(예: 웹 브라우저, 메일 프로그램)를 동시에 사용할 수 있는 이유는 포트 번호가 있기 때문이다.
포트 번호가 있기 때문에 도착한 데이터가 어느 프로세스로 전달되어야 하는지 구분할 수 있다.

---

## [UNVERIFIED] Port Number의 범위별 분류(well-known / registered / dynamic)는 어떻게 나뉘는가?

### User Answer
- **well-known port number (0 ~ 1023)**: IANA가 주요 프로토콜(HTTP 등)에 사용하려고 예약해둔 포트 번호.
- **registered port number (1024 ~ 49151)**
- **dynamic port number (49152 ~ 65535)**
