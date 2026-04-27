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
  company-analysis/                     # 회사 분석 sub-skill (양 모드 공유)
    SKILL.md
    output-template.md
  technical-interview/                  # 기술면접 모드
    technical-questions.md              # 회사 무관 일반 기술 질문
    personal-questions.md               # 이력·포폴 기반 기술 예상질문 (시점 1 산출)
    self-introduction.md
    reverse-interview-tech.md
    preflight-notes.md
    reverse-interview-do-not-ask.md
    links.md
    steps/{prep,entry,retrospective}.md
  culture-fit-interview/                # 컬쳐핏 + 임원 통합 모드
    culture-fit-qa.md                   # 회사 무관 일반 컬쳐핏 질문
    personal-questions.md               # 이력·포폴 기반 컬쳐핏 예상질문 (시점 1 산출)
    self-introduction.md
    reverse-interview-culture.md
    preflight-notes.md
    reverse-interview-do-not-ask.md
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
- **이력·포폴 기반 예상질문 추출**: AI가 갱신된 이력서·포폴을 읽고 양 모드의 `personal-questions.md`(기술용/컬쳐핏용)에 예상질문을 추출·갱신. 이 자산은 회사 무관하며, 시점 2의 모든 면접에서 재사용된다.
- 채용과제 개발환경 베이스 셋업 결정 (`tips/pre-season-setup.md` 갱신). 지금은 vite/next, 그땐 또 바뀔 수 있으니 그 시점 트렌드 따라 새로 정함.
- 일정 전략 리마인드 (`tips/schedule.md`).

### 시점 2: 회사별 채용과정

각 sub-트리거는 그 회사 단위로 반복.

| Sub-트리거 | AI 액션 | 산출물 |
|---|---|---|
| "OOO 사전질문 답변" | 답변 컨펌 (네거티브·모호함 차단). 베이스: `tips/application.md` | 답변 최종본 |
| "내일 OOO 기술면접" | technical 모드 + culture-fit 모드 **동시** 진입 (기술면접에서도 컬쳐핏 질문이 섞여 나오므로). **`company-analysis/` 호출하여 회사 분석 산출물 생성/갱신** → 양 모드의 prep 흐름을 모두 진행. 베이스: `technical-interview/` 전체 + `culture-fit-interview/` 전체 + 양쪽 `steps/prep.md` | 그 회사용 준비물.md (1파일) |
| "내일 OOO 컬쳐핏/임원" | culture-fit 모드 **단독** 진입 (컬쳐핏만 더 깊게). **`company-analysis/` 호출하여 회사 분석 산출물 생성/갱신** → behavioral Q&A + 대표 성향별 역질문 + 자기소개 합성. 베이스: `culture-fit-interview/` 전체 + `steps/prep.md` | 그 회사용 준비물.md (1파일) |
| "면접 입장 직전" | 해당 모드의 `steps/entry.md` 진입. 직전 카드 훑기 (`preflight-notes.md` + `reverse-interview-do-not-ask.md`) + 태도 리마인드 | 짧은 카드 |

### 시점 3: 면접 직후 회고

**트리거**: "OOO 면접 끝났어" / "면접 회고하자".

**AI 액션**: 회고 인터뷰를 진행해 `recruitment/` 하위 적절한 md를 다듬는다. 어디에 뭘 반영할지는 AI 판단. 베이스: 해당 모드의 `steps/retrospective.md`.

**산출물**: 다듬어진 베이스 파일들 (다음 면접에 자동 반영됨).

## 모드 진입 규칙

- **technical 모드** (기술면접 트리거): `technical-interview/` + `culture-fit-interview/` 양 폴더 동시 진입. 기술면접에서도 컬쳐핏 질문이 섞여 나오므로 함께 준비한다. 양쪽 베이스 파일 + 양쪽 `steps/prep.md`를 모두 컨텍스트로 로드.
- **culture-fit 모드** (컬쳐핏/임원 트리거): `culture-fit-interview/` 단독 진입. 컬쳐핏 단독 면접에서는 더 깊게 다룬다. 컬쳐핏과 임원면접은 같은 모드로 통합 처리한다.
- **tips 모드** (시점 1 전용): `tips/` 폴더 진입. 그 시즌의 액션에 필요한 파일만 선택적으로 읽음.

## 베이스 파일 vs 산출물

- **베이스 파일** (`company-analysis/`, `technical-interview/`, `culture-fit-interview/`, `tips/` 하위 .md): 회사 무관 템플릿·원칙. 한 번 만들고 계속 재사용. 시점 1·3에서만 갱신.
- **산출물** (회사 분석, 그 회사용 준비물.md, 회고 등): 매 회사마다 새로 생성. 베이스 + 회사 정보 합성. 이전 시점 산출물이 다음 시점의 입력 재료가 된다 (회사 분석 → 기술면접 준비 → 임원면접 준비).

## 산출물 위치 — 회사별 브랜치

회사별 산출물은 `interview/{회사명}` 브랜치에 누적한다. master에 머지하지 않는다 — 산출물은 평생 별도 브랜치에 산다.

- **브랜치 컨벤션**: `interview/{회사명}` (예: `interview/카카오`, `interview/오케이포스`)
- **워크트리**: `~/WebstormProjects/main/ai-contexts-interview-{회사명}/`
- **산출물 폴더**: `outputs/` (브랜치 내부)
- **lifecycle**: 채용 시작 시 브랜치+워크트리 생성 → 채용 진행 중 산출물 누적 → 채용 종료 후에도 브랜치 그대로 살려둠 (다음 시즌 그 회사 재지원 시 참고용). 워크트리만 정리한다.
- **다기기 동기화**: origin에 push하여 다른 컴퓨터에서 이어서 작업 가능. AC가 public이지만 회사 분석/회고는 노출돼도 무방한 정보만 담는다 — **채용과제 본문·과제 코드·메일 본문은 절대 포함하지 않는다.**

회사별 산출물 종류:

- `outputs/company-analysis.md` (Fact + Insight, [company-analysis/](company-analysis/SKILL.md) 참조)
- `outputs/그 회사용 준비물.md` (면접 직전 외울 최종 요약본)
- 그 외 시점별 회고 등
