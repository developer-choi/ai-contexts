> 이관: KA main `knowledge/cs/system/os/cpu-structure.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [os, concept]
source: google-doc
priority:
---

# Questions

- [UNVERIFIED] CPU가 명령어를 실행할 때 수행하는 동작들을 순서대로 설명해주세요.
- [UNVERIFIED] CPU의 기본 구조를 설명해주세요.
- [UNVERIFIED] 명령어 사이클(Instruction Cycle)이 뭔가요?
- [UNVERIFIED] CPU 내부 레지스터들은 뭐가 있나요?
- [UNVERIFIED] 인터럽트와 인터럽트의 처리 과정을 설명해주세요.
- [UNVERIFIED] 연산의 종류는 뭐가 있나요?
- [UNVERIFIED] 명령어 구성요소는 어떻게 되나요?
- [UNVERIFIED] ALU가 하는 일과 ALU의 구성요소는 어떻게 되나요?
- [UNVERIFIED] CU의 내부 구조를 설명해주세요.

---

# Answers

## [UNVERIFIED] CPU가 명령어를 실행할 때 수행하는 동작들을 순서대로 설명해주세요.

### User Answer
1. Instruction fetch: 기억장치에 있는 명령어를 읽어오는 것.
2. Instruction decode: 읽어온 명령어를 해독하는 것. 동작을 수행하기 위해서.
3. Data fetch: 데이터를 메모리나 I/O 장치에서 읽어오는 것.
4. Data process: 산술적 연산 또는 논리적 연산을 하는 것.
5. Data store: 연산을 한 결과를 메모리에 저장하는 것.

Data fetch, process, store는 명령어 중에서도 데이터가 필요한 명령인 경우에 한해서만 실행되는 과정이고, Instruction fetch, Instruction decode는 모든 명령어에 대해 실행되는 과정이다.

---

## [UNVERIFIED] CPU의 기본 구조를 설명해주세요.

### User Answer
CPU 내부 구조는 총 4가지로 나눌 수 있다: ALU / 레지스터 세트 / CU / CPU 내부 버스.

1. ALU (Arithmetic and Logical Unit): 산술 연산이나 논리 연산을 하는 회로들을 모아 놓은 것.
2. 레지스터 세트 (Register Sets): CPU 내부에 있는 저장장치.
   - CPU가 임시적으로 데이터를 저장할 때 쓴다.
   - 그래서 레지스터라는 저장장치는 모든 저장장치 중에서 가장 읽고 쓰기가 빠르다.
3. CU (Control Unit): 명령어를 실행하기 위해 제어 신호를 발생시키는 장치.
4. CPU 내부 버스: CPU 내부 구성요소들끼리 정보를 전달하기 위한 경로. 주의할 점은 외부의 시스템 버스와 직접적으로 연결되지 않는다는 점이다.

---

## [UNVERIFIED] 명령어 사이클(Instruction Cycle)이 뭔가요?

### User Answer
CPU가 한 개의 명령어를 실행하는 데 필요한 전체 과정이다.

명령어 사이클은 명령어 인출 단계와 명령어 실행 단계로 나뉜다.
- 명령어 인출 단계는 CPU가 기억장치로부터 명령어를 읽어오는 단계이고,
- 명령어 실행 단계는 CPU가 명령어를 실행하는 단계이다.

명령어 사이클은 CPU가 프로그램 실행을 시작한 순간부터 전원을 끄거나 회복이 불가능한 오류가 발생해서 중단될 때까지 계속 반복된다.

---

## [UNVERIFIED] CPU 내부 레지스터들은 뭐가 있나요?

### User Answer
- Program Counter (PC): 다음에 인출될 명령어의 주소값을 저장한다.
- Accumulator (AC): 산술 및 논리 데이터를 일시적으로 저장한다.
- Instruction Register (IR): 가장 최근에 인출된 명령어를 저장한다.
- Memory Address Register (MAR): 버스선 연결도를 보면 PC → MAR → 주소 버스로 되어 있다. 즉, Program Counter에 저장된 명령어 주소값이 주소 버스로 나가기 전에 일시적으로 저장된다.
- Memory Buffer Register (MBR): 버스선 연결도를 보면 기억장치 ↔ 데이터 버스 ↔ MBR 순서로 되어 있다. 즉, Memory에 저장된 데이터를 CPU 내부에 일시적으로 저장한다.

---

## [UNVERIFIED] 인터럽트와 인터럽트의 처리 과정을 설명해주세요.

### User Answer
인터럽트는 프로그램 실행 도중에 CPU가 현재 처리하고 있는 것을 중단시키고 다른 동작을 하도록 하는 시스템이다.

그래서 외부로부터 인터럽트 요구가 들어오면 CPU는 현재 수행하는 작업을 중단시키고, 요구된 인터럽트 작업을 먼저 수행한다.

인터럽트 서비스 루틴(ISR)은 인터럽트 처리를 위한 루틴을 말한다.

인터럽트의 처리 과정은 인터럽트 요청이 들어왔을 때 다음과 같다:
1. CPU가 어떤 장치에서 인터럽트를 요구했는지 확인한다.
2. 해당하는 인터럽트 서비스 루틴을 호출한다.
3. 서비스가 종료되면 중단되었던 기존 프로그램을 다시 수행한다.

---

## [UNVERIFIED] 연산의 종류는 뭐가 있나요?

### User Answer
1. 데이터 전송: 레지스터끼리, 기억장치끼리, 레지스터 ~ 기억장치끼리 데이터를 이동하는 것을 말한다.
2. 산술 연산: 덧셈, 뺄셈, 나눗셈, 곱셈.
3. 논리 연산: AND, OR, NOT, XOR 등.
4. 입출력 연산: CPU와 외부 장치 간에 데이터 이동.
5. 프로그램 제어: 명령어 실행 순서를 변경하는 연산 (branch, subroutine call).

---

## [UNVERIFIED] 명령어 구성요소는 어떻게 되나요?

### User Answer
1. Operation Code (연산 코드): 수행될 연산이 무엇인지를 나타낸다.
2. Operand: 연산을 수행하는 데 필요한 데이터 또는 데이터의 주소를 나타낸다.
3. Next Instruction Address (다음 명령어 주소): 현재의 명령어가 실행이 완료된 다음 실행될 명령어를 인출할 주소를 나타낸다.

---

## [UNVERIFIED] ALU가 하는 일과 ALU의 구성요소는 어떻게 되나요?

### User Answer
산술 연산과 논리 연산을 수행하는 장치다.

ALU는 총 5가지 장치로 구성되어 있다.
1. 산술 연산장치
2. 논리 연산장치
3. 시프트 레지스터
4. 보수기 (complementer)
5. 상태 레지스터 (status register)

각 장치의 역할은 다음과 같다.
- 산술 연산장치는 더하기, 빼기, 곱하기, 나누기 같은 산술 연산을 한다.
- 논리 연산장치는 AND, OR, NOT 등의 논리 연산을 한다.
- 시프트 레지스터는 비트들을 좌우로 이동시키는 레지스터다.
- 보수기는 2의 보수로 변환해주는 장치다. 2의 보수로 변환해야 하는 이유는 뺄셈을 할 때 필요하기 때문이다.
- 상태 레지스터는 연산 결과의 상태를 나타내는 플래그를 저장하는 레지스터다.

---

## [UNVERIFIED] CU의 내부 구조를 설명해주세요.

### User Answer
1. 명령어 해독기 (Instruction Decoder): 명령어의 Operation Code만 해독을 하는 장치다.
2. 제어 주소 레지스터 (Control Address Register, CAR): 다음에 실행할 마이크로 명령어의 주소를 저장하는 레지스터다.
3. 제어 기억장치 (Control Memory): 마이크로 프로그램을 저장하는 장치다.
4. 제어 버퍼 레지스터 (Control Buffer Register, CBR): 제어 기억장치로부터 읽혀진 마이크로 명령어를 일시적으로 저장하는 장치다.
5. 서브루틴 레지스터 (Subroutine Register, SBR): 마이크로 프로그램에서 서브루틴이 호출되는 경우 CAR의 내용을 일시적으로 저장하는 레지스터다.
6. 순서 제어 모듈 (Sequencing Module): 마이크로 명령어의 실행 순서를 결정하는 장치다.
