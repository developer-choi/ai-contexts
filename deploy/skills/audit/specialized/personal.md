# 개인 프로젝트 특화 체크리스트

이 프로젝트(ai-contexts)의 프롬프트 문서를 리뷰할 때 추가로 점검하는 항목.

## 특화 항목

### coding-standards 참조 규칙

`contexts/coding-standards/` 하위 파일을 직접 링크하지 않는다. 반드시 `coding-standards/README.md`를 통해 진입하도록 한다.

- **이유**: README.md에 프로젝트 유형(회사/개인) 판별 로직이 있어, 직접 링크하면 이를 우회하게 됨. 또한 하위 구조가 변경되면 직접 링크가 깨짐.
- **예외**: audit/specialized/coding-standards.md처럼 구조 자체를 검증하는 문서는 하위 경로를 언급해도 됨.
