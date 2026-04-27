---
name: recruitment
description: 채용 / 면접 준비 통합 스킬. 사용자가 채용·면접 관련 작업을 명시적으로 요청할 때만 진입한다. "이직 준비 시작", "내일 OOO 기술면접", "면접 끝났어" 같은 명확한 시점 발화에만 사용. 일반 대화에서 면접 단어가 언급된 정도로는 자동 트리거하지 말 것.
---

# Recruitment

채용·면접 준비 통합 스킬. 3시점 라우팅으로 진입한다.

## 폴더 구조

```
.claude/skills/recruitment/
  SKILL.md                              # 본 라우터
  technical-interview/                  # 기술면접 모드
    technical-questions.md
    self-introduction.md
    reverse-interview-tech.md
    preflight-notes.md
    reverse-interview-do-not-ask.md
    company-analysis.md
    links.md
    steps/{prep,entry,retrospective}.md
  culture-fit-interview/                # 컬쳐핏 + 임원 통합 모드
    culture-fit-qa.md
    self-introduction.md
    reverse-interview-culture.md
    preflight-notes.md
    reverse-interview-do-not-ask.md
    company-analysis.md
    links.md
    steps/{prep,entry,retrospective}.md
  tips/                                 # 시즌 단위 리마인드 (raw)
    resume.md
    application.md
    portfolio-consultant-advice.md
    schedule.md
    assignment.md
    pre-season-setup.md
```

## 3시점 라우팅

### 시점 1: 이직시즌 도래

**트리거**: "이직 준비 시작" / "이직시즌이야" / "면접 다시 봐야 함" 등.

**AI 액션** (각 단계는 외부 리서치 동반 — 1년 만에 변한 트렌드를 그때그때 끌어와 반영):

- recruitment 전체 베이스 파일 훑기 — 1년치 사용자 성장 반영. AI가 사용자와 인터뷰하며 추가/수정/제거할 부분 찾기. 대상은 `technical-interview/`, `culture-fit-interview/`, `tips/` 하위 모든 베이스 파일.
- 이력서 n벌 점검 (`tips/resume.md` 기준). 시대 변해도 기준 자체는 안 바뀜.
- 포폴 점검 (`tips/portfolio-consultant-advice.md` 기준). 마찬가지로 기준 자체는 안 바뀜.
- 채용과제 개발환경 베이스 셋업 결정 (`tips/pre-season-setup.md` 갱신). 지금은 vite/next, 그땐 또 바뀔 수 있으니 그 시점 트렌드 따라 새로 정함.
- 일정 전략 리마인드 (`tips/schedule.md`).

### 시점 2: 회사별 채용과정

각 sub-트리거는 그 회사 단위로 반복.

| Sub-트리거 | AI 액션 | 산출물 |
|---|---|---|
| "OOO 사전질문 답변" | 답변 컨펌 (네거티브·모호함 차단). 베이스: `tips/application.md` | 답변 최종본 |
| "내일 OOO 기술면접" | technical 모드 진입. 회사 분석 + 키워드 추출 → KA 매칭 + 예상질문/역질문/자기소개 합성. 베이스: `technical-interview/` 전체 + `steps/prep.md` | 그 회사용 준비물.md (1파일) |
| "내일 OOO 컬쳐핏/임원" | culture-fit 모드 진입. 회사 분석 + behavioral Q&A + 대표 성향별 역질문 + 자기소개 합성. 베이스: `culture-fit-interview/` 전체 + `steps/prep.md` | 그 회사용 준비물.md (1파일) |
| "면접 입장 직전" | 해당 모드의 `steps/entry.md` 진입. 직전 카드 훑기 (`preflight-notes.md` + `reverse-interview-do-not-ask.md`) + 태도 리마인드 | 짧은 카드 |

### 시점 3: 면접 직후 회고

**트리거**: "OOO 면접 끝났어" / "면접 회고하자".

**AI 액션**: 회고 인터뷰를 진행해 `recruitment/` 하위 적절한 md를 다듬는다. 어디에 뭘 반영할지는 AI 판단. 베이스: 해당 모드의 `steps/retrospective.md`.

**산출물**: 다듬어진 베이스 파일들 (다음 면접에 자동 반영됨).

## 모드 진입 규칙

- **technical 모드**: `technical-interview/` 폴더 진입. 진입 시 그 폴더의 베이스 파일들을 컨텍스트로 로드.
- **culture-fit 모드**: `culture-fit-interview/` 폴더 진입. 컬쳐핏과 임원면접은 같은 모드로 통합 처리한다.
- **tips 모드** (시점 1 전용): `tips/` 폴더 진입. 그 시즌의 액션에 필요한 파일만 선택적으로 읽음.

## 베이스 파일 vs 산출물

- **베이스 파일** (`technical-interview/`, `culture-fit-interview/`, `tips/` 하위 .md): 회사 무관 템플릿·원칙. 한 번 만들고 계속 재사용. 시점 1·3에서만 갱신.
- **산출물** (그 회사용 준비물.md 등): 매 회사·시즌마다 새로 생성. 베이스 + 회사 분석 결과 합성.
