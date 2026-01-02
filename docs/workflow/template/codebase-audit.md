# Codebase Audit (현황 분석 보고서)

## 1. 재사용 가능한 가용 자원 (Reusable Parts)
새로 만들지 않고 가져다 쓰거나 참고할 수 있는 기존 코드입니다.

- **UI 컴포넌트**: (예: 이미 `useModal`이 있으니 이를 활용)
- **전역 상태/인프라**: (예: `AppContext`에서 `locale` 정보를 제공 중, `utils/api.ts` 사용 가능)
- **유틸리티/상수**: (예: `src/constants/common.ts`에 정의된 상수 활용)
- **비즈니스 로직**: (예: `utils/format.ts`에 날짜 포맷팅 함수가 이미 존재함)
- **참고 코드**: (예: `UserSection.tsx`의 토글 로직이 이번 요구사항과 유사함)

---

## 2. 파일별 수정 및 생성 포인트 (Modification & Creation)
어느 파일의 어느 위치에 어떤 코드가 추가/수정되어야 하는지 구체적으로 기술합니다.

### [수정] [파일명] (`path/to/file.tsx`)
- **현재 상태 (As-Is)**: (예: `useEffect` 내부에서 기본 권한 체크만 하고 있음, 라인 45-50)
- **수정 내용 (To-Be)**: (예: `doNotShowAgain.get` 호출 로직을 추가하여 모달 노출 여부 결정)

### [수정] [파일명] (`path/to/file.tsx`)
- **현재 상태**: ...
- **수정 내용**: ...

### [신규] [파일명] (`path/to/new/file.tsx`)
- **역할**: (예: 언어 변경 확인 모달)
- **참고 레퍼런스**: (예: 기존 `ConfirmModal`을 복사하여 수정)

---

## 3. 중복 구현 방지 및 결론
- **중복 방지**: (예: `MarketingModal`을 새로 만들려 했으나, 기존 `ConfirmModal`을 확장하는 것이 나음)