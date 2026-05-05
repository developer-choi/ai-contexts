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
  steps/                                # 시점별 진입 흐름
    season-prep.md                      # 시점 1 (시즌 준비)
    interview-day.md                    # 시점 2 (준비 + 트레이닝 + 입장 직전 통합)
    retrospective.md                    # 시점 3 (회고)
  interview-baselines/                  # 모드별 베이스 (시점 1·3에서 갱신)
    technical/                          # 기술면접 모드
      personal-questions.md             # 이력·포폴 기반 기술 예상질문
      self-introduction.md
      reverse-interview.md
      preflight-notes.md                # 빈 파일 (실내용은 culture-fit 쪽)
      reverse-interview-do-not-ask.md   # 빈 파일 (실내용은 culture-fit 쪽)
      links.md
      templates/final-summary.md        # 그 회사용 준비물.md 산출 template
    culture-fit/                        # 컬쳐핏 + 임원 통합 모드
      culture-fit-qa.md                 # 회사 무관 일반 컬쳐핏 질문
      personal-questions.md             # 이력·포폴 기반 컬쳐핏 예상질문
      self-introduction.md
      reverse-interview.md
      preflight-notes.md
      reverse-interview-do-not-ask.md
      links.md
      templates/final-summary.md
  company-analysis/                     # 회사 분석 sub-skill (양 모드 공유)
    SKILL.md
    output-template.md
  tips/                                 # 시즌 자료 (회사 유형별 분기 가능)
    resume.md
    application.md
    portfolio-consultant-advice.md
    schedule.md
    assignment.md
    pre-season-setup.md
```

## 공고 입력 규칙

시점 2 진입 시(= 회사 공고가 새로 들어올 때) AI는 가장 먼저 공고 본문에서 **채용 전형**을 추출해 한 줄로 요약·컨펌한다. 추출 항목:

- 단계 흐름 (서류 → 코딩테스트 유무 → 면접 단계 → 최종합격)
- 면접 형태 (1:N / 1:1, 실무·임원 통합 여부, 포트폴리오 소개 동반 여부)

공고 본문에 명시되어 있지 않으면 **사용자에게 명시적으로 요청한 뒤 진행**한다. 면접 형태가 모드 진입 분기·임원면접 동반 여부·예상 시간 분배에 직접 영향을 주기 때문.

## 3시점 라우팅

### 시점 1: 이직시즌 도래

**트리거**: "이직 준비 시작" / "이직시즌이야" / "면접 다시 봐야 함" 등.

**진입**: `steps/season-prep.md` 흐름.

### 시점 2: 회사별 채용과정

각 sub-트리거는 그 회사 단위로 반복.

| Sub-트리거 | 진입 | 산출물 |
|---|---|---|
| "OOO 사전질문 답변" | `tips/application.md` 흐름 | 답변 최종본 |
| "내일 OOO 기술면접" | **technical 모드**로 `steps/interview-day.md` 진입 | `outputs/그 회사용 준비물.md` |
| "내일 OOO 컬쳐핏/임원" | **culture-fit 모드**로 `steps/interview-day.md` 진입 | `outputs/그 회사용 준비물.md` |
| "면접 입장 직전" | `steps/interview-day.md`의 입장 직전 단계 진입 | 짧은 카드 |

### 시점 3: 면접 직후 회고

**트리거**: "OOO 면접 끝났어" / "면접 회고하자".

**진입**: `steps/retrospective.md` 흐름.

**산출물**: 다듬어진 베이스 파일들 (다음 면접에 자동 반영됨).

## 모드

면접 모드 = 어떤 흐름으로 갈지의 추상 분류. 베이스 파일 매핑·세부 진행은 진입 흐름 파일이 알아서 처리.

- **technical 모드** (기술면접 트리거): 기술면접 + 임원면접 간략 동반. 진입 흐름 파일이 임원면접 간략 동반 준비를 사용자에게 먼저 제안.
- **culture-fit 모드** (컬쳐핏/임원 단독 트리거): 컬쳐핏 또는 임원 단독. 더 깊게 다룸.
- **tips 모드** (시점 1 전용): `tips/` 폴더 액션. 시즌 단위 점검·갱신.

## 자산 분류

- **베이스** (`interview-baselines/` 하위): 회사 무관 100% 재사용. 시점 1·3에서만 갱신.
- **시즌 자료** (`tips/` 하위): 시즌별 트렌드·회사 유형별 분기 가능성 있는 자료. 시점 1에서 점검·갱신.
- **산출물** (회사 분석, 그 회사용 준비물.md, 회고 등): 매 회사마다 새로 생성. 베이스 + 회사 정보 합성. 이전 시점 산출물이 다음 시점의 입력 재료가 된다 (회사 분석 → 기술면접 준비 → 임원면접 준비).

## 산출물 위치 — 회사별 브랜치

회사별 산출물은 `interview/{slug}` 브랜치에 누적한다. master에 머지하지 않는다 — 산출물은 평생 별도 브랜치에 산다.

- **브랜치 컨벤션**: `interview/{slug}` — `{slug}`는 **반드시 영문 소문자 + 하이픈**. 한글 금지. 우선순위: 공식 영문명 → 도메인(서브도메인 제외, TLD 제외) → 음차. 예: `interview/kakao`, `interview/apti` (apti.co.kr), `interview/okpos`, `interview/line-plus`
- **워크트리**: `~/WebstormProjects/main/ai-contexts-interview-{slug}/`
- **산출물 폴더**: `outputs/` (브랜치 내부)
- **lifecycle**: 채용 시작 시 브랜치+워크트리 생성 → 채용 진행 중 산출물 누적 → 채용 종료 후에도 브랜치 그대로 살려둠 (다음 시즌 그 회사 재지원 시 참고용). 워크트리만 정리한다.
- **다기기 동기화**: origin에 push하여 다른 컴퓨터에서 이어서 작업 가능. AC가 public이지만 회사 분석/회고는 노출돼도 무방한 정보만 담는다 — **채용과제 본문·과제 코드·메일 본문은 절대 포함하지 않는다.**

회사별 산출물 종류:

- `outputs/company-analysis.md` (Fact + Insight, [company-analysis/](company-analysis/SKILL.md) 참조)
- `outputs/그 회사용 준비물.md` (면접 직전 외울 최종 요약본)
- 그 외 시점별 회고 등
