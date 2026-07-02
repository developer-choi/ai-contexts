# Database

## 학습 동기

- 대기업 면접 대비: 인덱스 구조, 정규화/비정규화, 트랜잭션 ACID·propagation·locking level, 조인의 종류
- SQL vs NoSQL 비교 설명

## References

- [Index가 뭔지 설명해보세요 (개발면접시간)](https://www.youtube.com/watch?v=iNvYsGKelYs)
- [데이터 정규화가 뭔지 설명해보세요 (개발면접타임)](https://www.youtube.com/watch?v=Y1FbowQRcmI)
- [개발시 데이터베이스 선택 가이드 (총정리)](https://www.youtube.com/watch?v=ZVuHZ2Fjkl4)
- [SQL vs NoSQL 5분컷 설명](https://youtu.be/Q_9cFgzZr8Q)
- [SQL vs NoSQL (대체 영상)](https://youtu.be/5llIti9VK48)
- [DB 한방쿼리 쓰는 동안 사용 못 할 때 (OKKY)](https://okky.kr/article/852224)

### 서적

- "데이터 베이스를 지탱하는 기술"
- "이것이 MySql이다"

## 자주 나오는 질문 키워드

- DB 설계 (정규화·비정규화)
- 트랜잭션: 개념, ACID, propagation, locking level
- 인덱스: 정의·장단점·구조
- 조인: 종류와 특징
- SQL vs NoSQL 차이

---

## 학습 중 메모 (2026-06-17)

### 인덱싱

- 자료구조: B-tree 사용한다고 알고 있음
- R(읽기)할 때 중요하고 빠름
- CUD(쓰기)할 때 느려진다는 건 알겠는데 **왜인지 모름** — 인덱스도 같이 업데이트해야 해서?
- 예시가 부족했음 — 실제 사례로 이해 필요

### SQL vs NoSQL

**SQL 특징·적합 상황**
- 단점: 테이블 간 결합이 너무 올라감. 설계하기 힘들고 확장이 어려움
- 적합: 금융, 계약, 결제, 예약 등 대부분의 데이터 (무결성·일관성 중요)

**NoSQL 특징·적합 상황**
- 유연한 스키마, 수평 확장 용이, 대용량 트래픽 대응
- 로그 쌓는 DB, 단독적으로 쓰기 좋은 것 (다른 테이블과 연계 없는 것)
- Redis = NoSQL. MongoDB = NoSQL인가? MySQL·Oracle = SQL
- 단점: 무결성·조인 없음, 중복 저장이 테이블마다 심함, 데이터 일관성 관리 어려움
- 적합: 대용량 로그, 이벤트 처리, 캐시, Redis 저장소, 세션 저장소
