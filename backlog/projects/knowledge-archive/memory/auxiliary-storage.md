> 이관: KA main `knowledge/cs/system/memory/auxiliary-storage.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [os, concept]
source: google-doc
priority:
---

# Questions

- [UNVERIFIED] HDD란 무엇이며, 어떤 특성을 가지는가?
- [UNVERIFIED] RAID란 무엇인가?
- [UNVERIFIED] RAID의 궁극적인 목적은 무엇인가?
- [UNVERIFIED] Fault tolerant란 무엇인가?
- [UNVERIFIED] RAID 구성 방식은 어떻게 되는가?
- [UNVERIFIED] 네트워크 저장장치란 무엇인가?
- [UNVERIFIED] 디스크 인터페이스란 무엇이며, 어떤 종류가 있는가?
- [UNVERIFIED] DAS, NAS, SAN의 스토리지 아키텍처를 설명하라.

---

# Answers

## [UNVERIFIED] HDD란 무엇이며, 어떤 특성을 가지는가?

### User Answer
원형판으로 만들어진 저장장치다.
비휘발성, 순차접근이 가능한 보조기억장치다.
플래터(원형판)를 회전시키면서 헤드가 트랙 위를 지나가는 동안 데이터를 저장하거나 인출한다.
이때 데이터는 트랙(동심원) 위에 저장된다.

---

## [UNVERIFIED] RAID란 무엇인가?

### User Answer
RAID는 Redundant Array of Independent Disks의 약자로, 복수 배열 독립 디스크들을 의미한다.
디스크 여러 개를 논리적으로 결합하는 스토리지 가상화 기술이다.

---

## [UNVERIFIED] RAID의 궁극적인 목적은 무엇인가?

### User Answer
RAID의 목적은 다음과 같다.

- Capacity(용량)
- Reliability(신뢰성): 데이터의 중복/분산 저장을 통해 달성
- Availability(가용성)
- Performance(성능): 병렬 처리를 통해 달성

이 중 Fault tolerant가 가장 큰 목적이다.

> #### User Annotation:
> 옛날에는 하드디스크가 느리고 용량도 작았기 때문에 여러 개를 합쳐서 대용량의 단일 볼륨을 만들려고 했었다.
> 그러나 요즘 저장장치들은 용량도 크고 빠르기 때문에, 현재 RAID의 궁극적인 목표는 용량/성능이 아니라 신뢰성(= Fault tolerant)이다.

---

## [UNVERIFIED] Fault tolerant란 무엇인가?

### User Answer
시스템이 고장나도 계속 작동될 수 있도록 하는 시스템이다.

---

## [UNVERIFIED] RAID 구성 방식은 어떻게 되는가?

### User Answer
RAID 구성 방식은 크게 세 가지로 나뉜다.

- **Standard levels**: RAID 0, RAID 1, …, RAID 6 등
- **Nested (hybrid)**: RAID 01, RAID 03 등
- **Non-standard levels**: RAID-DP, RAID tE, Intel Matrix RAID 등

---

## [UNVERIFIED] 네트워크 저장장치란 무엇인가?

### User Answer
네트워크를 통해 클라이언트들이 접근하여 데이터를 읽고 쓸 수 있는 저장장치다.
네트워크가 빨라져서 데이터 고속 전송이 가능해졌기 때문에 등장했다.

---

## [UNVERIFIED] 디스크 인터페이스란 무엇이며, 어떤 종류가 있는가?

### User Answer
컴퓨터와 저장장치를 연결하는 인터페이스를 말한다.
종류로는 SATA, SCSI 등이 있다.

---

## [UNVERIFIED] DAS, NAS, SAN의 스토리지 아키텍처를 설명하라.

### User Answer

**DAS (Direct Attached Storage)**
스토리지를 서버와 클라이언트에 직접 연결하는 방식이다.
서버와 클라이언트가 물리적으로 가까운 거리에 있어야 한다.
서버에 직접 외장 저장장치를 연결하므로 속도는 빠르고 확장은 쉽지만, 연결 수에 한계가 있다.

**NAS (Network Attached Storage)**
스토리지를 네트워크에 연결해서 공유하여 사용하는 방식이다.
중요한 점은 File System을 DAS와 SAN은 서버들이 갖고 있는 반면, NAS는 Storage가 갖고 있다는 것이다.
NAS에서는 서버나 클라이언트들이 File System을 갖고 있지 않다.

**SAN (Storage Area Network)**
SAN도 네트워크를 사용하지만, File System은 서버나 클라이언트가 가진다.
스토리지는 가상의 로지컬 볼륨을 만들어서 제공만 하고, 실제 파일 시스템은 그 볼륨이 할당된 호스트가 만들고 사용한다.
공유가 안 된다.
