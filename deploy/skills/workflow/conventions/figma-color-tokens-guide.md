# 아이콘·이미지의 색은 인라인이 아니라 `get_variable_defs`로 가져온다

## 규칙

- 텍스트 fill은 `get_design_context` 응답 코드에 hex로 박혀 오므로 그대로 쓴다.
- 아이콘·일러스트·로고 등 컴포넌트 인스턴스는 이미지 에셋으로 export 되며 fill 변수가 응답에서 누락된다. 해당 노드 id로 `get_variable_defs`를 호출해 hex를 확정한 뒤 쓴다.
- 응답 상단 styles 목록(파일 전체 토큰 카탈로그)에서 그럴듯한 톤을 골라 추론으로 메우지 않는다.
