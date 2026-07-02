> 이관: KA main `knowledge/cs/system/memory/cache-memory.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [os, performance, concept]
source: google-doc
priority:
---

# Questions
- [UNVERIFIED] 캐시메모리란 무엇인가?
- [UNVERIFIED] Cache Hit와 Cache Miss란?
- [UNVERIFIED] 캐시 설계의 목표는?
- [UNVERIFIED] Cache-friendly 코드란?
  - [UNVERIFIED] Quicksort가 cache-friendly인 이유는?
  - [UNVERIFIED] 캐시 친화적이지 않은 코드의 예시는?

---

# Answers

## [UNVERIFIED] 캐시메모리란 무엇인가?

### User Answer
CPU와 주기억장치 간의 속도 차이를 보완하기 위해 그 사이에 설치하는 기억장치다.
Access 시간이 주기억장치보다 훨씬 더 짧다.

CPU는 데이터를 읽을 때 먼저 캐시메모리에 있는지 찾아보고, 없으면 주기억장치까지 가서 읽어야 하므로 그만큼 시간이 더 걸린다.
(그래서 캐시 용량이 크면 이런 일이 줄어드는 대신 가격이 올라간다.)

---

## [UNVERIFIED] Cache Hit와 Cache Miss란?

### User Answer
CPU가 원하는 데이터가 캐시메모리에 있는 상태를 캐시 적중(hit)이라고 한다.
반대로 없는 상태를 캐시 미스(miss)라고 한다.

---

## [UNVERIFIED] 캐시 설계의 목표는?

### User Answer
캐시 적중률의 극대화
- CPU가 원하는 정보가 캐시에 있을 확률을 높이는 것

캐시 액세스 시간의 최소화
- 캐시 적중 시에 캐시로부터 CPU로 인출하는 데 걸리는 시간을 단축시키는 것

캐시 실패에 따른 지연 시간의 최소화
- 캐시 미스가 발생할 경우에 주기억장치로부터 읽어오는 데 걸리는 시간을 최소화시키는 것

---

## [UNVERIFIED] Cache-friendly 코드란?

---

## [UNVERIFIED] Quicksort가 cache-friendly인 이유는?

---

## [UNVERIFIED] 캐시 친화적이지 않은 코드의 예시는?
