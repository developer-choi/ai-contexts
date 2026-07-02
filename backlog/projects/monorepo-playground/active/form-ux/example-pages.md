# 폼 베스트 프랙티스 예제 페이지

## 개요

실무에서 반복되는 폼 핸들링 패턴을 Next.js 예제 페이지로 정리한다. 공통 규칙(어느 폼이든 적용)과 유형별 규칙(특정 폼)으로 구분한다.

- 프로젝트: MP (`~/WebstormProjects/main/monorepo-playground`)
- 브랜치: `master` (완료분 머지됨) — 잔여 페이지는 새 feature 브랜치에서 작업
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

URL은 레포 `ARCHITECTURE.md`의 **2뎁스 규칙**(`form/{주제}`)을 따른다. `공통 규칙`/`유형별 예제` 구분은 URL 계층이 아니라 **허브 페이지 카드 그룹**으로만 표현한다 (URL에 `common/`·`examples/` 중간 계층을 두지 않는다).

```
/form                  — 허브 페이지 (카드를 "공통 규칙" / "유형별 예제" 두 그룹으로 묶어 나열)
  ├── /trim            — 공백 trim (기존)
  ├── /auto-focus      — 자동 포커스 (기존)
  ├── /handle-submit   — 폼 제출 생명주기 전 과정 (기존 error-feedback 개명·확장)
  ├── /prevent-leave   — 이탈 방지
  ├── /number          — 숫자 입력
  ├── /address         — 주소 (Daum)
  ├── /file            — 파일 업로드
  ├── /password        — 비밀번호
  ├── /member          — 회원정보 입력
  ├── /compound-field  — 복합 필드
  └── /input-type      — input type 종류별
```

허브 카드 그룹:

- **공통 규칙** (모든 폼에 적용): trim · auto-focus · handle-submit · prevent-leave
- **유형별 예제** (특정 폼): number · address · file · password · member · compound-field · input-type

기존 `/form/trim`·`/form/auto-focus`는 경로 변경 없이 그대로 둔다. `/form/error-feedback`은 `/form/handle-submit`으로 개명·확장한다(아래 남은 작업 참조).

## 진행 상태

### 완료

- `/form` — 허브 페이지 (하위 예제 링크 나열)
- `/form/trim` — 공백 trim 유효성검증 + 서버 전송 시 일괄 trim
- `/form/auto-focus` — 폼 중심 페이지 자동 포커스
- `/form/error-feedback` — 검증 시점·버튼 활성화·에러 필드 포커스 (→ `/form/handle-submit`으로 개명·확장 예정, 남은 작업 참조)
- `shared/components/LinkCardGrid` — 루트(`/`)와 `/form`이 공통으로 쓰는 카드 그리드
- `shared/utils/data/object.ts` — `mapObjectLeaves` / `trimObject` / `cleanObject` 재귀 순회 유틸리티
- `/sandbox/scroll-restoration` — autoFocus가 있는 긴 페이지에서 뒤로가기 스크롤 복원 동작 관찰용

### 미착수

아래 "남은 작업" 참조.

## 남은 작업

### 공통 규칙

남은 공통 규칙 2개(`/form/handle-submit`·`/form/prevent-leave`)는 **폼 예제 워크플로우로 진행 중**이다. 상세 명세·PR 분할·진행 상태는 그쪽 `project.md`가 단일 출처(SSOT)이며, 여기서는 중복 관리하지 않는다. 구현이 머지되면 위 "완료"에 반영한다.

### 유형별 규칙

**`/form/number` — 숫자 입력**

- 소수점 사칙연산은 반드시 `decimal.js` 사용 (0.1 + 0.2 문제)
- 뺄셈 시 음수 방지 — `subtractMinZero` 패턴
- 천 단위 포맷팅과 실제 숫자값 분리 관리

**`/form/address` — 주소 (Daum)**

- Daum 주소 팝업 연동
- 우편번호 + 기본주소 필드는 `readOnly`
- `readOnly` input 클릭 시에도 팝업 오픈
- 주소 미입력 상태로 제출 시 → 얼럿 후 Daum 팝업 자동 오픈

**`/form/file` — 파일 업로드**

- drag & drop 지원 범위
- `label` 중첩 트릭
- `accept`로 확장자 제한해도 우회 가능 → 파일명으로 검증 필요
- 용량 검증 함수는 `number` 반환 설계
- 다중 파일 `FormData` append 방식
- 이미지 프리뷰
- CSS 커스텀

**`/form/password` — 비밀번호**

- 6가지 비밀번호 폼 케이스와 상속 구조
- 비밀번호 ↔ 비밀번호 확인 교차 `onChange` 검증 패턴
- 보기/숨기기 토글

**`/form/member` — 회원정보 입력**

- 회원정보 항목 분류 (클라이언트 검증만 vs API 검증 필요, 수정 가능 vs 불가)
- 내정보 수정 페이지에서 `isDirty` 체크
- `setValue` 시 `shouldDirty` 옵션

**`/form/compound-field` — 복합 필드**

- 이메일 `@` 기준 좌우 분리 입력 — 두 필드를 하나의 값으로 합치는 패턴
- 동적 필드 추가/삭제 (`useFieldArray`)

**`/form/input-type` — input type 종류별**

- 휴대폰번호 입력 — 세 가지 방식 비교
  - `type="number"`
  - `type="text"` + `pattern` + `inputMode`
  - `type="tel"` — 숫자만 입력되는지, 하이픈이 막히는지 동작 확인 필요

### 기타

- `apps/examples/src/form/README.md` 최신화 (auto-focus 설명이 "단일 목적 페이지" 옛 문구 그대로임 → "폼 중심 페이지"로 갱신)
- 구현 완료 후 Google Docs 원본 2개(공통 규칙, 유형별 규칙) 최신화
- 구현 완료 후 재사용 가능한 패턴은 MP `docs/best-practices-map.md`에 엔트리 추가 + MP `docs/patterns/` 하위에 함축 문서 작성 (현재는 `/form/auto-focus`만 연결됨)

## 새 페이지 추가 플로우

`/form/<slug>` 한 개를 추가할 때 순서.

1. **그룹 결정** — 허브의 "공통 규칙"(모든 폼 적용) / "유형별 예제"(특정 폼) 중 어느 카드 그룹에 넣을지 정한다. URL은 `/form/<slug>` flat 2뎁스로 고정(레포 `ARCHITECTURE.md` 2뎁스 규칙) — 그룹은 URL 계층이 아니라 허브 카드 묶음일 뿐이다. 확신 없으면 결정 근거를 이 문서의 본인 항목에 메모.
2. **라우트 파일 작성** — `apps/examples/src/app/form/<slug>/page.tsx`. Demo용 클라이언트 컴포넌트는 같은 폴더에 co-located.
3. **폼 예제 공용 코드 필요 시** — `apps/examples/src/form/components/` 에 추가하거나 기존 컴포넌트(`example.tsx` 등) 재사용.
4. **전역 공유 컴포넌트 필요 시** — `apps/examples/src/shared/components/` 에 추가. 폼 전용 요소는 `shared/components/form/`.
5. **허브 페이지 등록** — `apps/examples/src/app/form/page.tsx` 의 `ITEMS` 에 카드 항목(title · href · description · keywords) 추가. 1번에서 정한 그룹("공통 규칙"/"유형별 예제")에 맞춰 배치.
6. **재사용 패턴이면 문서화** — MP `docs/best-practices-map.md` 에 엔트리 추가 + `docs/patterns/<영역>/<패턴>.md` 함축 문서 작성. "그래서 뭘 해야 하는가"만 담고 구현 코드는 레포 경로로 링크.
7. **원본 문서 최신화** — 구현 중 확정된 규칙이 있으면 Google Docs 공통 규칙 / 유형별 규칙에 즉시 반영. 이 최신화는 페이지 머지 전에 끝낸다.
8. **이 문서 갱신** — 완료 체크리스트에 항목 추가, "남은 작업" 해당 bullet 제거.
