> 이관: KA main `knowledge/cs/network/protocol/tcp.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [network, protocol, concept]
source: google-doc
priority:
---

# Questions
- [UNVERIFIED] Connection-oriented Communication이란 무엇이며, TCP는 이를 어떻게 사용하는가?
- [UNVERIFIED] TCP의 3-way handshake란 무엇이며, 어떤 순서로 진행되는가?
  - [UNVERIFIED] 3-way handshake 과정에서 클라이언트와 서버는 어떤 정보를 교환하는가?
- [UNVERIFIED] TCP의 4-way handshake란 무엇이며, 어떤 순서로 진행되는가?
- [UNVERIFIED] TCP에서 Segment란 무엇인가?
- [UNVERIFIED] TCP Header의 code bits란 무엇이며, 어떤 플래그들이 있는가?
- [UNVERIFIED] TCP Header의 Sequence Number와 Acknowledgement Number는 각각 무엇을 나타내는가?
  - [UNVERIFIED] 재전송 제어(retransmission control)란 무엇인가?
- [UNVERIFIED] TCP Header의 Window Size는 무엇이며, 언제 결정되는가?
- [UNVERIFIED] TCP Header에는 그 외에 어떤 필드가 있는가?

---

# Answers

## [UNVERIFIED] Connection-oriented Communication이란 무엇이며, TCP는 이를 어떻게 사용하는가?

### User Answer
정확성을 위해 여러 번 확인하는 절차가 있는 통신 방식이다.
TCP(Transmission Control Protocol)가 이 방식을 사용한다.

동작 방식은 다음과 같다.
- 송수신을 위한 (가상회선) 연결 통로를 만들고 데이터를 전송한다.
- 각 패킷에 대해 라우터는 경로를 다시 계산할 필요가 없다.
- 모든 패킷이 전달된 후에 연결이 종료된다.

---

## [UNVERIFIED] TCP의 3-way handshake란 무엇이며, 어떤 순서로 진행되는가?

### User Answer
TCP의 연결 확정 과정(TCP Connection Establishment)을 부르는 말이다.
TCP에서 연결을 하기 위해서는 신호를 총 3번 주고받는다.

1. 클라이언트가 SYN을 보낸다.
2. 서버가 ACK와 SYN을 응답한다.
3. 클라이언트가 다시 ACK를 보낸다.

이렇게 패킷을 3번 주고받는다고 해서 3-way handshake라고 부른다.

SYN을 보낼 때는 TCP Header의 code bits 중 SYN에 1이 들어있고, 마찬가지로 ACK를 보낼 때는 ACK에 1이 들어있다.

---

## [UNVERIFIED] 3-way handshake 과정에서 클라이언트와 서버는 어떤 정보를 교환하는가?

### User Answer
3-way handshake 과정에서 다음 정보를 알게 된다.

- Sequence Number / Acknowledgement Number
- Window Size

연결이 되면 이후에 데이터를 주고받는다.

---

## [UNVERIFIED] TCP의 4-way handshake란 무엇이며, 어떤 순서로 진행되는가?

### User Answer
TCP 연결 종료 과정(TCP Connection Termination)을 부르는 말이다.
TCP에서 연결을 해제하기 위해서는 패킷을 총 4번 주고받는다.

1. Client가 FIN을 보낸다.
2. Server가 ACK를 보낸다.
3. Server가 FIN을 보낸다.
4. Client가 ACK를 보낸다.

이렇게 패킷을 4번 주고받는다고 해서 4-way handshake라고 부른다.

---

## [UNVERIFIED] TCP에서 Segment란 무엇인가?

### User Answer
상위 계층에서 내려온 데이터에 TCP 헤더를 붙인 것을 Segment라고 부른다.

---

## [UNVERIFIED] TCP Header의 code bits란 무엇이며, 어떤 플래그들이 있는가?

### User Answer
연결 관련 제어 정보가 들어있다.

- **SYN**: 연결 요청
- **FIN**: 종료 요청
- **ACK**: 확인 응답

---

## [UNVERIFIED] TCP Header의 Sequence Number와 Acknowledgement Number는 각각 무엇을 나타내는가?

### User Answer
**Sequence Number**
송신측에서 수신측에게 알려주는 값이고, 보내는 데이터가 몇 번째 데이터인지를 나타낸다.
데이터를 쪼개서 패킷으로 나눠서 보내기 때문에 순서를 표시할 필요가 있다.
Acknowledgement Number와 매칭된다.

**Acknowledgement Number (확인 응답 번호)**
수신측에서 송신측에게 알려주는 값이고, 몇 번째 데이터를 받았는지를 나타낸다.

---

## [UNVERIFIED] 재전송 제어(retransmission control)란 무엇인가?

### User Answer
데이터를 주고받을 때마다 Sequence Number와 Acknowledgement Number로 확인해서 이상이 있으면 데이터를 재전송하게 되어 있다.
이것을 재전송 제어라고 부른다.

---

## [UNVERIFIED] TCP Header의 Window Size는 무엇이며, 언제 결정되는가?

### User Answer
송신측과 수신측이 데이터를 주고받을 때마다 매번 확인하는 절차를 가지면 효율이 좋지 않다.
그래서 버퍼를 두고 요청을 여러 번 보내고 확인 응답을 여러 번 보내는 방식을 취하는데, 이때 버퍼의 크기를 나타내는 값이 Window Size다.

이 크기는 3-way handshake 과정에서 미리 알게 된다.

---

## [UNVERIFIED] TCP Header에는 그 외에 어떤 필드가 있는가?

### User Answer
TCP Header에는 code bits, Sequence Number, Acknowledgement Number, Window Size 외에도 Source Port Number와 Destination Port Number가 포함된다.
