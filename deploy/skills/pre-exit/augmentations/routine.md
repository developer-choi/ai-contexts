# /pre-exit routine 보강

`private-playground` 세션에서 루틴 데이터를 다룰 때 스크립트 우회 여부를 점검하는 추가 회고. pre-exit 본 절차(Step 0~3)와 **함께** 수행한다 (대체 X, 추가 ○).

## 트리거 조건

다음 중 하나라도 해당하면 본 보강을 실행한다:

- `/pre-exit routine` 명시 호출
- 무인자 `/pre-exit`에서 자동 감지: cwd가 `private-playground`이고, 세션에서 `/routine-start` 또는 `/routine-summary` 호출 사실을 회상 가능

자동 감지 시, 보강 실행 전 "pp-routine 보강 회고를 진행할까요?"로 사용자 확인을 받는다.

## 회고 대상

### 스크립트 우회 전수조사

PP의 `docs/routine/scripts-reference.md`에 등재된 스크립트 목록을 기준으로, 이 세션에서 `scripts/common/storage.js`의 `readJson` / `writeJson`을 **직접** 호출한 경우가 있는지 회상한다.

절차:

1. 세션 컨텍스트에서 `storage.js`·`readJson`·`writeJson`을 직접 호출한 tsx -e 구문 회상
2. `docs/routine/scripts-reference.md`에 대응 스크립트가 있는지 대조
3. 대응 스크립트가 **있는데** 직접 호출한 경우 → Step 1 문제 목록에 추가
4. 대응 스크립트가 **없는 경우** → `docs/routine/scripts-reference.md` 하단 「스크립트 없는 작업」 섹션에 항목 추가 제안

### 신규 스크립트 후보 탐지

세션에서 scripts-reference.md에 없는 새로운 데이터 조작 패턴이 등장했으면 스크립트 신설 후보로 제안한다.

## 회고하지 않는 것

- 스크립트를 통해 정상적으로 데이터를 조작한 경우 (logAction, appendActionLogToRoutine 등)
- tsx -e 인라인이라도 scripts/ 모듈을 import해 쓴 경우

## 반영 위치

- 스크립트 우회 발견 → Step 1 문제 목록 (AI 규칙화 후보)
- 스크립트 없는 작업 발견 → `docs/routine/scripts-reference.md` 「스크립트 없는 작업」 섹션 갱신 제안

## 출력

별도 보고 섹션 없음. 발견 항목은 Step 1 문제 목록에 흡수한다.
