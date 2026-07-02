# Input (기능)

## References

- [setSelectionRange로 검색창 커서 옮기기 | 카카오엔터테인먼트 테크블로그](https://tech.kakaoent.com/front-end/2021/211104-setselectionrange/)

### 하위문서

- Input (구글 드라이브 폴더)
- 숫자만 입력되는 인풋을 만들 때 겪었던 히스토리 (구글 문서)

## type 속성 용도별 가이드

로그인폼, 회원가입폼, 아이디찾기폼 등 폼 유형에 따라 적절한 `type`을 지정한다.

- 이메일 입력: `type="email"`
- 비밀번호 입력: `type="password"`
- 검색: `type="search"`
- URL 입력 (배너 연결 링크 등): `type="url"`

## Attributes

### autocapitalize

[MDN 공식 문서](https://developer.mozilla.org/ko/docs/Web/HTML/Global_attributes/autocapitalize):

> autocapitalize 특성을 type 특성의 값이 url, email, password인 `<input>` 요소에 적용해도 자동 대문자 변환은 되지 않습니다.

동작 범위:
- 물리 키보드(유선·무선)에서는 비활성화
- 모바일 가상 키보드, 음성 입력에서는 자동 활성화됨

### autocomplete

보안 관련 정보(회원가입 토큰 등)는 `autocomplete="off"` 설정 필요.  
비밀번호는 `type="password"`이면 자동으로 꺼짐.

### PasswordField의 autocapitalize·spellcheck 고정 (학습·검증 필요)

MP PasswordField가 `autoCapitalize="off"` + `spellCheck={false}`를 고정으로 넣고 있었다. 사용자가 검증하지 않은 코드라 2026-06-12에 제거하기로 결정 — 아래 주장을 학습·검증한 뒤 재도입 여부를 판단한다.

근거 주장:

- 눈 토글로 `type`이 password↔text로 바뀌는데, **text 상태에선 password가 받던 보호가 풀린다**는 것. 위 MDN 인용("type이 url/email/password면 자동 대문자 변환 안 됨")도 password *type*에만 해당하므로, 표시 토글 상태(text)에는 적용 제외가 사라진다는 논리.
- spellcheck 쪽 추가 주장: 일부 브라우저의 향상된 맞춤법 검사(Chrome Enhanced Spellcheck·Edge Editor)가 검사 내용을 서버로 전송한다는 보고(2022, "spell-jacking") → 평문 표시 상태의 비밀번호 유출 경로. **미검증 — 1차 소스 확인 필요.**

검증 거리: 모바일 가상 키보드에서 토글 후 자동 대문자 동작 실측, spell-jacking 보고 원문(otto-js 2022로 추정) 확인.
