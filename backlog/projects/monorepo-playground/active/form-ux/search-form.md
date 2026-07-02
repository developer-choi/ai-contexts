# Search Form

## References

- Handle form: https://docs.google.com/document/d/1lFkActTl9Htv-WrqX5_-QUb9ffv1OPAdv6rleQ1g_bA/edit#heading=h.n4zpv07h2878
- Pagination with filter & sort & search: https://docs.google.com/document/d/18uixuUU9rpzDBMUEgxfB2TBx9Tr9SApG18c1rFoaOJs/edit

## Required features

1. 빈문자열로 검색을 시도하면 얼럿

2. 검색어 삭제버튼 존재여부, 검색 초기화기능이 필요한 폼인지에 따라 동작이 달라야함.

   1) 검색 초기화가 필요하고, 삭제버튼도 있는경우
   - 폼 제출할 때 검색어 입력값이 없으면 항상 얼럿보여주면됨.
   - 검색 안한 최초 상태를 보고싶은 사용자는, 삭제버튼 누르면되니까.

   2) 없는경우
   - 최초의 상태 (= 아직 검색안한상태)에서 폼 제출하는경우 검색어 없으면 얼럿 보여주고,
   - 이미 검색된 상태(= query-string에 검색어가 있는상태) 에서 폼 제출하는경우 검색어 없으면, 검색 초기화 로 작동이 되야함.
     (= 얼럿이 안떠야함.)
   - 이렇게 안하면, 사용자는 검색어를 초기화해서 최초의 목록을 볼 방법이 없음.

3. 검색 타입을 선택할 수 있는경우, input type이 바뀌는 경우가 있다면 기존 입력값 삭제 & 인풋포커스

   <!-- from PDF p.1 (image1) -->
   <!-- 검색 타입 드롭다운 + 텍스트 입력박스 조합 UI, PDF 이미지 참조 -->

   - 이 경우 어떤 검색타입을 선택해도 우측 입력박스의 타입은 "text"로 고정이라서 입력값 삭제를 안해도 되지만,

   <!-- from PDF p.1 (image2) -->
   <!-- 검색 타입이 email → date로 바뀌는 UI 예시, PDF 이미지 참조 -->

   - 이처럼 입력타입이 email ⇒ date로 아예 달라지는경우에는
   - 날짜선택해서 11/09/2020 입력된 상태로 검색타입을 핸드폰으로 누르면 2020-11-09 됨.

4. 쓰이는 곳에 따라 추가동작이 붙음.
   - 페이지네이션이 들어있는 URL 방식의 페이지라면, 검색했을 때 페이지가 1로 돌아가야함.
   - 그게 아니라면 없음.
