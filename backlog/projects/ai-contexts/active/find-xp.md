---
name: find-xp
description: 사용자의 실제 경험을 인덱스에서 찾아 답변을 준비한다. "A 경험 있어?", "A 해봤어?", "내 경험 중에 A 관련 있어?", "A 어떻게 했어?", "내가 A 관련 뭐해봤니?"처럼 사용자 개인 경험을 조회할 때 반드시 이 스킬을 사용한다. 면접 준비, 모의 면접, 루틴 요약, pre-exit, 기술 질문 답변 준비 등 어떤 맥락에서든 사용.
argument-hint: "[검색 키워드 또는 주제]"
---

# find-xp

사용자가 특정 주제에 대해 어떤 경험이 있는지 인덱스에서 찾아 실제 파일을 읽고 답한다.

## 라우팅

질문 도메인에 따라 읽을 인덱스가 다르다. 도메인이 모호하면 복수 인덱스를 동시에 읽는다.

| 도메인 | 인덱스 경로 |
|--------|------------|
| FE 구현·라이브러리·셋업 패턴 | `~/WebstormProjects/main/monorepo-playground/docs/best-practices-map.md` |
| 코드 품질·컨벤션·아키텍처 원칙 | `~/WebstormProjects/main/ai-contexts/deploy/contexts/coding-standards/map.md` |
| 커리어·프로젝트 경험·트러블슈팅 | `~/WebstormProjects/main/private-playground/experience-index.md` |

## 절차

1. args 또는 대화에서 검색 키워드를 추출한다.
2. 도메인을 판단해 해당 인덱스를 Read한다.
3. 인덱스에서 키워드와 매칭되는 항목을 찾는다.
4. 매칭 항목이 가리키는 파일을 Read한다.
5. 읽은 내용을 바탕으로 사용자 경험을 요약·정리해 제시한다.

매칭 항목이 없으면 "해당 경험 없음"을 보고한다. 추측으로 메우지 않는다.
