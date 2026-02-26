# 파일 분리 기준

하나의 프롬프트(md 파일) 안에 있는 내용을 SKILL.md와 supporting files로 분류하는 기준입니다.

## SKILL.md로 가야 하는 것 (지시)

실행 흐름을 제어하는 내용. 잘 변하지 않는다.

- 실행 순서 ("1번부터 순서대로 순회하라")
- 행동 지시 ("이 파일을 읽고 검증하라")
- 조건 분기 ("해당하지 않으면 스킵하라")
- 입출력 정의 ("결과를 표로 출력하라")
- frontmatter (name, description, allowed-tools 등)

## supporting files로 가야 하는 것 (참고자료)

지시가 참조하는 데이터. 자주 변할 수 있다.

- 체크리스트 항목 (체크할 조건 목록)
- 예시 (Good/Bad 대비)
- 규칙/컨벤션 목록
- 템플릿
- 도메인 지식/배경 정보

## 분류 판단 체크리스트

- 파일 안에 "~하라", "~하세요" 같은 행동 지시와, 그 지시가 참조하는 데이터가 섞여 있지 않은지
- SKILL.md에서 supporting files를 참조하고 있는지 (경로 또는 파일명 언급)
- supporting files에 실행 흐름 제어가 섞여 있지 않은지

```
❌ Bad — 하나의 파일에 지시와 참고자료가 섞여 있음
audit.md (1000줄짜리 단일 파일에 실행 방법 + 체크리스트 전부 포함)

✅ Good — SKILL.md와 supporting files 분리
SKILL.md         → "0단계부터 순서대로 순회하라" (지시)
consistency.md   → 0단계 체크항목 (supporting file)
specific.md      → 1단계 체크항목 (supporting file)
```

## 분리하지 않아도 되는 경우

- 프롬프트 전체가 50줄 이하로 짧은 경우
- 지시와 참고자료가 밀접하게 얽혀 있어 분리하면 오히려 맥락이 끊기는 경우
