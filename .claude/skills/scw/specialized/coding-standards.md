# Coding-Standards 특화 체크리스트

`contexts/coding-standards/` 리뷰 시 추가로 점검하는 항목. 파일 목록은 `map.md` 참조.

## [CRITICAL] 분류 검증

다른 문서가 폴더/파일 경로 기준으로 규칙을 참조하므로, 분류가 틀리면 규칙 누락 또는 잘못된 모델 라우팅이 발생한다.

### rules vs principles 분류

- **rules/**: 중간 모델(e.g. sonnet)이 코드와 규칙을 1:1 대조하여 위반 여부를 판단할 수 있는 항목
- **principles/**: 최상위 모델(e.g. opus)이 맥락을 이해하고 판단해야 하는 항목
- 판단 기준: "이 규칙을 위반했는지 코드만 보고 기계적으로 체크 가능한가?" → rules, 아니면 → principles

### personal vs universal 분류

- **universal/**: 회사에서도 적용 가능한 범용 규칙
- **personal/**: 개인 프로젝트 전용 규칙

### 하위 폴더·파일 배치

- **폴더명**: 기술 스택 또는 도메인인지 (`react/`, `typescript/`, `testing/` 등)
- **파일명**: "이 파일은 ___에 대한 기준이다"에서 빈칸에 해당하는 판단 주제 또는 기술 단위인지 (`component-split`, `error-handling`, `tanstack-query` 등). 단, 한두 줄짜리 규칙들이 합쳐진 파일은 `basics.md` 같은 포괄적 이름 허용 (분리 시 파일 메타데이터가 토큰을 더 먹으므로)
- **내용과 폴더 주제 일치**: 예) React 컴포넌트 분리 기준이 `quality/`에 있으면 안 됨

## [CRITICAL] map.md 동기화 검증

`map.md`의 파일 목록과 실제 폴더 내 파일이 일치하는지 점검한다.

- map.md에 있지만 실제 파일이 없는 항목
- 실제 파일이 있지만 map.md에 누락된 항목
- rules/principles 섹션에 잘못 분류된 항목

## 태그 검증

태그는 개별 파일 frontmatter가 아닌 `map.md`에서 관리한다. 태그 목록과 각 파일의 태그 부여가 올바른지 점검한다.

## 중복

- 다른 coding-standards 파일이나 하위 폴더 간에 같은/비슷한 내용이 존재하는지
