# conventions-index.md

`background/retained/conventions-index.md` — 프로젝트 컨벤션 소스의 인덱스. 작업 레포가 있어야 만든다.

## 수집

1. 작업 레포에서 컨벤션 성격의 파일을 **이름만** 스캔한다 — `**/CLAUDE.md`, `**/AGENTS.md`, `docs/**`, `*convention*`, `*ARCHITECTURE*`, `*CONTRIBUTING*` 류. 후보를 사용자에게 제안해 채택받는다. 채택된 파일도 이때는 본문을 읽지 않는다.
2. 추가로 참고할 자료가 있는지 사용자에게 묻는다. 사용자가 준 원문 자료는 `background/retained/`에 저장하고 인덱스에 올린다.

## 양식

항목당 「경로 + 한 줄 트리거(어떤 작업·디렉터리에서 봐야 하는지)」.

## 표준 참고처 — 개인·실무 모드

이번 작업이 MUI·radix 등 라이브러리 컴포넌트에 대응하는 컴포넌트·마크업을 직접 작성할 때만 `~/WebstormProjects/simplify/` 하위 simplified 레포(라이브러리 원본 미러)를 올린다. 트리거는 "대응 컴포넌트를 이 레포들에서 뒤져 참고"이고, simplify 하위에 실제 있는 레포 경로만 나열한다.
