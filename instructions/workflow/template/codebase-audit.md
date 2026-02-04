# Codebase Audit (현황 분석 보고서)

## 1. 재사용 가능한 가용 자원

새로 만들지 않고 재사용할 수 있는 기존 코드:

- **UI 컴포넌트**: 예: `useModal` 활용
- **전역 상태/인프라**: 예: `AppContext`의 `locale`, `utils/api.ts`
- **유틸리티/상수**: 예: `src/constants/common.ts`
- **비즈니스 로직**: 예: `utils/format.ts`의 날짜 포맷팅
- **참고 코드**: 예: `UserSection.tsx`의 토글 로직

---

## 2. 파일별 수정 및 생성 포인트

어느 파일 어느 위치에 어떤 코드가 추가/수정되어야 하는지 구체적으로 기술.

### [수정] [파일명] (`path/to/file.tsx`)
- **현재 상태**: 예: `useEffect` 내부 기본 권한 체크만 (라인 45-50)
- **수정 내용**: 예: `doNotShowAgain.get` 호출 로직 추가

### [신규] [파일명] (`path/to/new/file.tsx`)
- **역할**: 예: 언어 변경 확인 모달
- **참고 레퍼런스**: 예: 기존 `ConfirmModal` 복사 후 수정

---

## 3. 중복 구현 방지 및 결론

- 예: `MarketingModal` 새로 만들려 했으나, 기존 `ConfirmModal` 확장이 나음