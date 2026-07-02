# 힙 vs 스택 메모리

## 핵심 차이

- **스택**: 컴파일 타임에 크기 결정 → 메모리 누수 날 일 없음 (컴파일러를 잘못 만들지 않는 이상)
- **힙**: 런타임에 계속 바뀜 → 메모리 누수 발생 가능

## JS에서 메모리 누수 위치

- 힙에서 난다
- 대표 사례: **이벤트 리스너** — `removeEventListener` 안 하면 참조가 남아 GC 대상에서 제외

## GC (Garbage Collection)

- 학습 필요: 어떤 알고리즘으로 수거하는지
- [`javascript/index.md` → 가비지 컬렉션 섹션](../javascript/index.md) — v8 GC 영상 링크 있음
- [`programming/index.md` → 범위기반 가비지 컬렉터 영상](../programming/index.md)

## 왜 스레드는 스택 메모리를 공유하지 않을까?

- 학습 필요: 찾아보기
