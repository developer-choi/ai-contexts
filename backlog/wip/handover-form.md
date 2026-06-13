# 폼 베스트 프랙티스 예제 페이지 인수인계

## 개요

실무에서 반복되는 폼 핸들링 패턴을 Next.js 예제 페이지로 정리한다. 공통 규칙(어느 폼이든 적용)과 유형별 규칙(특정 폼)으로 구분한다.

- 프로젝트: MP (`~/WebstormProjects/main/monorepo-playground`)
- 브랜치: `feature/form-rebuild`
- 페이지 경로: `apps/examples/src/app/form/`, `apps/examples/src/app/sandbox/`
- 폼 예제 공용 코드: `apps/examples/src/form/` (데모 컴포넌트·폼 예제 README)
- 공통 유틸: `apps/examples/src/shared/utils/data/`
- 전역 공유 컴포넌트: `apps/examples/src/shared/components/` (예: `LinkCardGrid`, `form/Input`, `form/Button`)

## 참고 원본 문서

Google Docs 2개는 이 예제 페이지의 근거 문서다. **예제 페이지 구현이 끝나면 두 원본을 최신화해야 한다.** 예제에서 확정된 내용이 원본에 누락되지 않도록 동기화 작업이 필요하다.

- [폼 핸들링 공통 규칙](https://docs.google.com/document/d/1dsUhjzYW46Qq6meZ9_D0ApZnBeZLOFW2WmrxlxQ8gCk/edit) — **최신화 필요**
- [폼 유형별 규칙](https://docs.google.com/document/d/1VoSj5njAyHC7LBYoVSfHd90iPcNrd96LF6xMvdQZawk/edit) — **최신화 필요**

관련 원본 문서:

- [중복제출 방지](https://docs.google.com/document/d/1QgEZwF6ei0g3HRqOhgfMrKzIPvSWNTwIp6qygKwZXpo/edit)
- [Form submit](https://docs.google.com/document/d/1mH1bLEUtys1WOLKsSSOS0fwOeTrHVdJSCyvu9rVSofI/edit)
- [Handle File](https://docs.google.com/document/d/1vlpxoOK6XzDqWgvEqGvHb_Ie6yGcq9BH5-m_XBF3FQk/edit)
- [Handle member input](https://docs.google.com/document/d/1O0UMNf505xpytsAAUlKFr29rMmj5XvdP8Gr1uP9l4-s/edit)
- [Handle password form](https://docs.google.com/document/d/1YpwgJ2PoG2MfD6S9NDppZUGUgG_71UxbsGNXARkFGiE/edit)
- [이메일 @ 분리 폼 커밋](https://github.com/developer-choi/react-playground/commit/af3ccc4c)
- [공백 trim 커밋](https://github.com/developer-choi/react-playground/commit/2e31f75bca086c9f6ce37a2c0dffc4b3e65def60)

## 라우트 구조

```
/form                          — 허브 페이지 (예제 링크 나열)
  ├── /common
  │     ├── /validation        — 유효성검증
  │     ├── /error-feedback    — 에러 피드백
  │     ├── /submit            — 제출
  │     ├── /input-ux          — 입력 편의
  │     ├── /prevent-leave     — 이탈 방지
  │     └── /shortcuts         — 단축키
  └── /examples
        ├── /number            — 숫자 입력
        ├── /address           — 주소 (Daum)
        ├── /file              — 파일 업로드
        ├── /password          — 비밀번호
        ├── /member            — 회원정보 입력
        ├── /compound-field    — 복합 필드
        └── /input-type        — input type 종류별
```

현재 구현된 공통 규칙 페이지 3개는 이 로드맵 이전 구조의 경로(`/form/trim`, `/form/auto-focus`, `/form/error-feedback`)에 있다. 위 `/form/common/` 체계로 이동 필요.

## 진행 상태

### 완료

- `/form` — 허브 페이지 (하위 예제 링크 나열)
- `/form/trim` — 공백 trim 유효성검증 + 서버 전송 시 일괄 trim
- `/form/auto-focus` — 폼 중심 페이지 자동 포커스
- `/form/error-feedback` — 에러 피드백 (시점, 버튼 활성화, 포커스 이동)
- `shared/components/LinkCardGrid` — 루트(`/`)와 `/form`이 공통으로 쓰는 카드 그리드
- `shared/utils/data/object.ts` — `mapObjectLeaves` / `trimObject` / `cleanObject` 재귀 순회 유틸리티
- `/sandbox/scroll-restoration` — autoFocus가 있는 긴 페이지에서 뒤로가기 스크롤 복원 동작 관찰용

### 미착수

아래 "남은 작업" 참조.

## 남은 작업

### 공통 규칙

**`/form/common/validation` — 유효성검증**

- 세부 TODO는 원본 Google Docs(공통 규칙) 참고 — 로드맵에 미명시

**`/form/common/error-feedback` — 에러 피드백 (현재 페이지 확장)**

현재 구현에서 아직 다루지 않은 주제:

- 입력 시(`onChange`) 에러메시지 초기화
- 폼 전체를 담당하는 에러메시지 vs 필드별 에러메시지

**`/form/common/submit` — 제출**

- 중복제출 방지
  - `isPending`만으로는 부족. 제출 성공 → 페이지 이동/모달 닫기 사이 틈도 `isSuccess`로 막아야 함
  - `button onClick` + `form onSubmit` 양쪽 다 막아야 함
- 제출 성공 후 처리
  - 폼 UI를 **벗어나는** 경우: 페이지 이동 또는 모달 닫기
  - 폼 UI를 **벗어나지 않는** 경우: 폼 reset 필요 (예시: 네이버카페 댓글폼 — 댓글 성공해도 폼이 화면에 남으므로 리셋)
- 제출 후 페이지 벗어나거나 모달 닫히기 전까지 로딩 보여주기 (따닥 방지 효과도 있음)
- API 에러 피드백

**`/form/common/input-ux` — 입력 편의**

- 세부 TODO는 원본 Google Docs(공통 규칙) 참고 — 로드맵에 미명시

**`/form/common/prevent-leave` — 이탈 방지**

- `beforeunload` (새로고침 / 브라우저 닫기)
- Next.js 라우터 이탈 감지 (App Router에서 navigation 가로채기)
- 모달 닫기 방어 (닫기 버튼 / backdrop 클릭 시 confirm)

**`/form/common/shortcuts` — 단축키**

- `Ctrl+Enter` 제출 (특히 textarea — `form.requestSubmit()` 활용)
- `Ctrl+A` 전체선택 (메일리스트, 어드민 테이블 등)
- `Shift` 구간선택 (리스트 아이템 범위 선택)

### 유형별 규칙

**`/form/examples/number` — 숫자 입력**

- 소수점 사칙연산은 반드시 `decimal.js` 사용 (0.1 + 0.2 문제)
- 뺄셈 시 음수 방지 — `subtractMinZero` 패턴
- 천 단위 포맷팅과 실제 숫자값 분리 관리

**`/form/examples/address` — 주소 (Daum)**

- Daum 주소 팝업 연동
- 우편번호 + 기본주소 필드는 `readOnly`
- `readOnly` input 클릭 시에도 팝업 오픈
- 주소 미입력 상태로 제출 시 → 얼럿 후 Daum 팝업 자동 오픈

**`/form/examples/file` — 파일 업로드**

- drag & drop 지원 범위
- `label` 중첩 트릭
- `accept`로 확장자 제한해도 우회 가능 → 파일명으로 검증 필요
- 용량 검증 함수는 `number` 반환 설계
- 다중 파일 `FormData` append 방식
- 이미지 프리뷰
- CSS 커스텀

**`/form/examples/password` — 비밀번호**

- 6가지 비밀번호 폼 케이스와 상속 구조
- 비밀번호 ↔ 비밀번호 확인 교차 `onChange` 검증 패턴
- 보기/숨기기 토글

**`/form/examples/member` — 회원정보 입력**

- 회원정보 항목 분류 (클라이언트 검증만 vs API 검증 필요, 수정 가능 vs 불가)
- 내정보 수정 페이지에서 `isDirty` 체크
- `setValue` 시 `shouldDirty` 옵션

**`/form/examples/compound-field` — 복합 필드**

- 이메일 `@` 기준 좌우 분리 입력 — 두 필드를 하나의 값으로 합치는 패턴
- 동적 필드 추가/삭제 (`useFieldArray`)

**`/form/examples/input-type` — input type 종류별**

- 휴대폰번호 입력 — 세 가지 방식 비교
  - `type="number"`
  - `type="text"` + `pattern` + `inputMode`
  - `type="tel"` — 숫자만 입력되는지, 하이픈이 막히는지 동작 확인 필요

### 기타

- 기존 구현 페이지 3개를 `/form/common/` 구조로 이동
- `apps/examples/src/form/README.md` 최신화 (auto-focus 설명이 "단일 목적 페이지" 옛 문구 그대로임 → "폼 중심 페이지"로 갱신)
- 구현 완료 후 Google Docs 원본 2개(공통 규칙, 유형별 규칙) 최신화
- 구현 완료 후 재사용 가능한 패턴은 MP `docs/best-practices-map.md`에 엔트리 추가 + MP `docs/patterns/` 하위에 함축 문서 작성 (현재는 `/form/auto-focus`만 연결됨)

## 새 페이지 추가 플로우

`/form/<slug>` 한 개를 추가할 때 순서.

1. **위치 결정** — "라우트 구조" 트리를 보고 `common/` 과 `examples/` 중 어디에 속하는지 정한다. 확신 없으면 작업 전에 결정 근거를 이 문서의 본인 항목에 메모.
2. **라우트 파일 작성** — `apps/examples/src/app/form/<slug>/page.tsx`. Demo용 클라이언트 컴포넌트는 같은 폴더에 co-located.
3. **폼 예제 공용 코드 필요 시** — `apps/examples/src/form/components/` 에 추가하거나 기존 컴포넌트(`example.tsx` 등) 재사용.
4. **전역 공유 컴포넌트 필요 시** — `apps/examples/src/shared/components/` 에 추가. 폼 전용 요소는 `shared/components/form/`.
5. **허브 페이지 등록** — `apps/examples/src/app/form/page.tsx` 의 `ITEMS` 에 카드 항목(title · href · description · keywords) 추가.
6. **재사용 패턴이면 문서화** — MP `docs/best-practices-map.md` 에 엔트리 추가 + `docs/patterns/<영역>/<패턴>.md` 함축 문서 작성. "그래서 뭘 해야 하는가"만 담고 구현 코드는 레포 경로로 링크.
7. **원본 문서 최신화** — 구현 중 확정된 규칙이 있으면 Google Docs 공통 규칙 / 유형별 규칙에 즉시 반영. 이 최신화는 페이지 머지 전에 끝낸다.
8. **이 handover 갱신** — 완료 체크리스트에 항목 추가, "남은 작업" 해당 bullet 제거.
