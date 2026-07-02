# Temporary Storage — A→B 페이지 전환 시 직접 접근 차단

본인 학습 자료 + 본인 구현 사례. Next.js Server Action + HTTP Only 쿠키.

## References

- 본인 [react-playground 커밋](https://github.com/developer-choi/react-playground/commit/849b20a6b552a1e25b7f70945ccbae296818406c)

## TODO

본인 [Server Action에서 쿠키가 삭제 안 되는 버그 예제 (test-playground)](https://github.com/developer-choi/test-playground/commit/4b7fb563912240aea919561d9f2570f74d7e8ef2)

## Motivation

A페이지 → B페이지로 가는 프로세스가 있는데, A 페이지 안 거치고 직접 URL 입력 같은 행위로 한 번에 B 페이지로 갔을 때, "유효하지 않은 접근입니다"를 구현하고 싶었음.

이게 가능하려면,

1. 직전 페이지에서 그 임시값을 write할 수 있어야 하고,
2. 그다음 페이지에서 "임시값"이 있는지를 read해야 함.
3. read 한 상태에서 또 read하는 케이스는 잘못된 케이스로 간주하고, read 대신 pop이 되도록 구현해야 함.

### 활용할 수 있는 다른 페이지

회원정보 수정 페이지 혹은 탈퇴 페이지 접근 전에 한 번 더 확인하는 그 케이스에서, 인증 최초 성공하면 세션 유지 기간 (브라우저 다 닫기) 내내 유지되어야 하다 보니 Temporary Storage에 저장하는 식으로 응용이 가능해 보임.

## 임시 저장소 요구 조건

1. Server Side에서 접근이 가능해야 함 (웹 페이지를 요청한 시점에서 리다이렉트 여부를 판단할 수 있어야 함)
2. 최소한의 보안을 준수해야 합니다. (임시값에 이름 같은 유저 정보도 저장될 수 있습니다.)

### Local Storage / Session Storage

1. 서버에서 접근을 할 수 없습니다.
2. XSS 공격에 취약합니다.

### Cookie

1. 서버에서 접근할 수 있습니다.
2. XSS 공격을 방지하기 위해 HTTP Only 옵션을 활성화 하기로 했습니다.
3. 일회성을 유지하기 위해 유지 시간은 세션으로 잡았습니다.

## 시스템 구성도

Next.js 서버에서 2개의 API를 작성해서 구현하기로 함.

### POST API — HTTP Only 쿠키에 임시값을 저장하는 API

Request Body:

1. `key` (필수, 임시값을 구분할 이름)
2. `data` (필수, 타입은 아무 값이나 올 수 있음)

Response:

- 200

### GET API

HTTP Only 쿠키를 읽어서 반환하면서 + **동시에 그 쿠키를 삭제하여** 2회차 조회 시 404를 반환하는 API.

**를 구현하려고 했으나, 쿠키 삭제가 안 돼서 결국 선회했음.**

Request Parameter:

- `key` (필수, 임시값을 구분할 이름)

Response:

1. (200) 임시로 저장했던 값
2. (404) [없음]

## TODO

- "Server Action에서 쿠키가 삭제 안 되는 버그" 원인 파악 (위 test-playground commit 분석).
- PDF 이미지 placeholder는 검수 시 확인 필요.
