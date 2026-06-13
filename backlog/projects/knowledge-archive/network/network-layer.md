> 이관: KA main `knowledge/cs/network/layers/network-layer.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [network, concept]
source: google-doc
priority:
---

# Questions

- [UNVERIFIED] Network Layer의 역할은 무엇인가?
- [UNVERIFIED] Network Layer는 언제 필요한 계층인가?

---

# Answers

## [UNVERIFIED] Network Layer의 역할은 무엇인가?

### User Answer
발신지 대 목적지 전달에 대한 책임을 진다.

1. 헤더에 IP를 지정한다.
2. Routing을 한다. (패킷의 최적의 경로 지정을 통해 목적지에 전달될 수 있도록)
   - 수많은 네트워크들 속에서 최적의 경로를 찾는다.
   - 다음 라우터, 그다음 라우터로 데이터를 전달해 준다. (forwarding)

---

## [UNVERIFIED] Network Layer는 언제 필요한 계층인가?

### User Answer
다른 네트워크와 통신할 때 필요한 계층이다.
(= 네트워크 간에 통신할 때 필요한 계층)
