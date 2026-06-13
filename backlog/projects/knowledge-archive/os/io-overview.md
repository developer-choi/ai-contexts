> 이관: KA main `knowledge/cs/system/os/io-overview.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [os, concept]
source: google-doc
priority:
---

# Questions

- [UNVERIFIED] I/O 장치들이 시스템 버스에 직접 접속하지 못하는 이유는?
- [UNVERIFIED] I/O Controller의 주요 기능은?

---

# Answers

## [UNVERIFIED] I/O 장치들이 시스템 버스에 직접 접속하지 못하는 이유는?

### User Answer
I/O 장치들은 종류가 다양하여 제어 방법이 각각 다르다.
그런 제어 회로들을 CPU 내부에 모두 포함시키는 것은 불가능하다.

I/O 장치들의 데이터 전송·처리 속도가 CPU보다 훨씬 느리다.
고속의 시스템 버스를 통해 직접 데이터 교환이 불가능하다.

I/O 장치들과 CPU가 사용하는 데이터의 형식이 모두 다르다.
CPU마다 프린터를 따로 만들 수는 없으니까.

---

## [UNVERIFIED] I/O Controller의 주요 기능은?

### User Answer
- I/O 장치 제어
- CPU와 통신 / I/O 장치와 통신
- 데이터 버퍼링 기능 수행
