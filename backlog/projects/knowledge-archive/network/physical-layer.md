> 이관: KA main `knowledge/cs/network/layers/physical-layer.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [network, concept]
source: google-doc
priority:
---

# Questions

- [UNVERIFIED] Physical Layer의 역할은 무엇인가?
- [UNVERIFIED] LAN Card란 무엇인가?
- [UNVERIFIED] Network Adaptor와 NIC(Network Interface Controller)의 관계는?
- [UNVERIFIED] Transmission Media란 무엇이며, 어떤 특성이 있는가?
- [UNVERIFIED] Repeater는 어떤 장비이며, 왜 deprecated 되었는가?
- [UNVERIFIED] Hub는 어떤 장비이며, Repeater와 어떤 차이가 있는가?

---

# Answers

## [UNVERIFIED] Physical Layer의 역할은 무엇인가?

### User Answer
Physical Layer는 아래 3가지 역할을 한다.

1. 물리적으로 연결한다.
2. 데이터를 0과 1로 변환한다.
3. Transmission media를 통해 전송한다.

---

## [UNVERIFIED] LAN Card란 무엇인가?

### User Answer
Physical Layer 장비다.
내가 보낼 데이터를 0과 1로 바꿔주고, 받은 0과 1 데이터를 복원해주는 역할을 한다.

> #### User Annotation:
> 데스크탑 기준, 랜카드는 메인보드에 내장되어 있다.

---

## [UNVERIFIED] Network Adaptor와 NIC(Network Interface Controller)의 관계는?

### User Answer
랜카드는 넓게 봤을 때 Network Adaptor의 한 종류다.
동글이도 Network Adaptor에 해당한다.
NIC(Network Interface Controller)는 Network Adapter와 같은 말이다.

---

## [UNVERIFIED] Transmission Media란 무엇이며, 어떤 특성이 있는가?

### User Answer
Physical Layer 장비다.
크게 유선과 무선이 있다.
매체마다 속도가 다르다.
그래서, 실생활에서 1기가 인터넷으로 바꿨다 해도 선이 지원하지 않으면 무용지물이다.

---

## [UNVERIFIED] Repeater는 어떤 장비이며, 왜 deprecated 되었는가?

### User Answer
Physical Layer 장비다.

1. 멀리 있는 컴퓨터와 통신을 하고 싶은데
2. 거리가 먼 만큼 신호의 세기가 약해진다.
3. 이걸 해결(증폭)해주는 것이 Repeater의 역할이다. (= 파형이 정상으로 바뀜)
4. 하지만 현재는 다른 네트워크 장비가 Repeater의 역할을 대신하기 때문에 과거의 유물일 뿐이다.
5. 그리고 1대1 통신밖에 하지 못한다.

---

## [UNVERIFIED] Hub는 어떤 장비이며, Repeater와 어떤 차이가 있는가?

### User Answer
Physical Layer 장비다.

1. Repeater처럼 신호 증폭이 가능하다.
2. Repeater와 달리 여러 대 컴퓨터와 통신할 수 있다.
3. 여러 대 컴퓨터가 통신하다 보면 충돌이 발생할 수 있다. (이 내용은 Datalink Layer에서 다룬다.)
