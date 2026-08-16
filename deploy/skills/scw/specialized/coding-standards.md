# Coding-Standards 특화 체크리스트

`contexts/coding-standards/` 리뷰 시 추가로 점검하는 항목. 탐색 절차와 폴더·태그 정의는 [../../../contexts/code-map.md](../../../contexts/code-map.md)가 정본이다.

## [CRITICAL] 분류 검증

다른 문서가 폴더/파일 경로 기준으로 규칙을 참조하므로, 분류가 틀리면 규칙 누락 또는 잘못된 모델 라우팅이 발생한다.

### rules vs principles 분류

판단 기준: "이 규칙을 위반했는지 코드만 보고 기계적으로 체크 가능한가?" → rules, 아니면 → principles.

### personal vs universal 분류

판단 기준: 회사 프로젝트에서도 그대로 적용되는가 → universal, 개인 프로젝트에서만 성립하는가 → personal.

### 하위 폴더·파일 배치

- **폴더명**: 기술 스택 또는 도메인인지 (`react/`, `typescript/`, `testing/` 등)
- **파일명**: "이 파일은 ___에 대한 기준이다"에서 빈칸에 해당하는 판단 주제 또는 기술 단위인지 (`component-split`, `error-handling`, `tanstack-query` 등). 단, 한두 줄짜리 규칙들이 합쳐진 파일은 `basics.md` 같은 포괄적 이름 허용 (분리 시 파일 메타데이터가 토큰을 더 먹으므로)
- **내용과 폴더 주제 일치**: 예) React 컴포넌트 분리 기준이 `quality/`에 있으면 안 됨

## 태그 검증

정의된 태그 목록과 각 파일이 실제로 부여한 태그가 맞는지 점검한다.
