---
description: Claude Code 세션 로그에서 KPI를 추출한다. 사용자와 대화하며 프로젝트·세션을 탐색하고, 선택한 세션의 사용자 입력을 정제하여 보여준다.
argument-hint: [project] (생략 시 프로젝트 목록부터 시작)
---

# kpi

세션 로그에서 사용자의 active time KPI를 추출하는 대화형 데이터 추출 도구다.
사용자와 대화하며 프로젝트와 세션을 탐색하고, 선택한 세션의 데이터를 정제해서 보여준다.

## 스크립트

경로: `~/WebstormProjects/main/ai-contexts/scripts/kpi.js`

| 명령어 | 설명 |
|--------|------|
| `node kpi.js projects` | 프로젝트 목록 조회 |
| `node kpi.js sessions <project>` | 세션 목록 조회 |
| `node kpi.js detail <session-id>` | 세션 상세: 시작/종료 시각, 사용자 입력 목록 |

## 정제 규칙

- 오탈자 교정, 비문 정리 수준만 허용
- 내용 요약·삭제·재해석 금지
- 승인성 입력("ㅇㅋ", "진행해", 빈 문자열 등) 유지 — 승인 횟수도 KPI임
