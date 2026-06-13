# Checkable List

## Related Link

- Checkbox, Radio Markup: https://docs.google.com/document/d/1rqmOi11-M61mjOkk5i63SigHNN8BJYLpka8c73tSLb0/edit
- Legacy Checkable List History: https://docs.google.com/document/d/19FET2ooBEBvsP7H-hO8Yz4FE90FOge-ATTM3F3jPyDY/edit
- Category Filter: https://docs.google.com/document/d/1iDFWYVVx_MK6Qko0NC6OC9dx9XXp7lZcrPYduidO84c/edit

## TODO

기존 구현은 legacy로 바꾸고, 새거는 rhf로 해서 새롭게 구현하기.

로직통합 가능 여부 탐구:
- Category Filter 히스토리에서 겪은 버그를 전체 체크박스 구현 시 또 겪음.
- **상하위 체크박스 vs 전체/각각 체크박스 로직이 본질적으로 동일한 구조인지 검토 필요.** 상위체크박스 체크/해제 vs 하위체크박스 체크/해제 로직이, 전체선택 체크박스 vs 각각 체크박스 로직과 너무 똑같지 않음? 통합이 가능할까?
- 네이버 메일리스트 페이지가 완벽한 레퍼런스 예제.

## 필기

shift 누르고 클릭하는 범위 선택 기능을 구현하려면 Checkbox 컴포넌트에 shift 클릭 캐시가 필요함. 과거에는 Checkbox에 직접 `onShiftChecked` props를 만들었음.

## Features

예제: 메일목록, 쪽지목록

- rhf로 구현하기.
- 하나씩 선택 / 해제 (체크박스)하는 기능
- 여러 개 선택 단축키: 하나 체크하고 다른 목록에 shift 누른 상태로 또 체크하면 그 사이에 있는 목록 모두 체크
- 전체선택 단축키 (Ctrl+A): 전체선택됨. 단, 이 상태로 또 Ctrl+A 눌러도 전체해제 되지는 않음.
- 전체선택 / 전체해제 체크박스
  - 누르면 전체선택 / 전체해제됨.
  - 모든 목록 체크 여부에 따라 전체선택/해제 체크박스도 같이 체크/해제되야함.
  - 최초로딩 시점에 목록이 1개도 없을 때 자동으로 체크되지 않아야함. (당연한건데 로직 작성할 때 놓침)
- 목록이 1개 이상 존재하는지 여부값 (전체삭제버튼 노출값으로 사용할 수 있음)
- 체크된 목록이 존재하는지 여부값

<!-- 체크된 목록 존재 여부를 활성화 조건으로 쓰는 UI 캡처, PDF 참조 (PDF Read 불가 환경) -->

- 체크된 목록 (PK 포함) 배열값 (선택목록삭제 / 답장 / 읽음처리 / 안읽음처리 등에 활용)
- 선택삭제 / 답장 / 읽음처리 / 안읽음처리: 선택된 게 없을 때 시도하면 선택된 게 없다는 얼럿메시지 뜸
- 선택삭제 단축키 (Delete): 선택삭제 기능을 재사용하여 유효성검증
- 전체삭제버튼: 눌렀을 때 현재 페이지의 모든 목록 삭제
  - 노출여부는 목록 존재여부값으로 판단
  - 삭제기능은 선택삭제 기능을 재사용해서 유효성검증 공통적용
- 선택삭제 / 전체삭제 버튼은 목록이 1개 이상 존재해야 노출하는 것도 괜찮음.
