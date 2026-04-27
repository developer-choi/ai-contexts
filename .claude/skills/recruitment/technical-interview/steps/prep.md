# 면접 준비일 (Step 1~3)

## Step 1. 기초 재료 준비

- 내 이력, 내 포폴 기반으로 예상질문 뽑아서 대비

## Step 2. 2시간 전 준비

- 회사 분석: `company-analysis/` sub-skill 호출 (산출물 없으면 생성, 있으면 갱신)
- Technical Interview 예상 질문 뽑기
- 역질문 금지 목록 숙지 (`reverse-interview-do-not-ask.md`)
- 역질문 리스트업: `reverse-interview-tech.md` 베이스 + 그 회사 특화 항목 → AI가 회사 분석 결과 합쳐서 그 회사용 목록 생성
- Behavioral Interview: 취미 같은 질문조차 회사와 연계할 답변 찾기
- 1분 자기소개 말하며 연습
- 클로바노트 켜놓고 AI 먹이고 피드백 받기

## Step 3. 트레이닝 (-20분까지)

- Technical / Behavioral / Reverse Interview 문서 다시 보기
- 엘베 시간 때문에 **20분 전 출발**

---

## [draft] 그 회사용 최종 준비물 (= AI 산출물)

면접 준비일에 AI가 모든 분석·생성 결과를 합쳐서 **한 파일**로 출력. 이 파일이 Step 3 트레이닝과 면접 직전에 사용자가 읽는 본물.

### 포함 항목 (현재까지)

- **회사 분석** (베이스: `company-analysis/` 산출물 = `outputs/company-analysis.md`)
- **회사 맞춤 Technical 예상질문** (베이스: 미정 + 회사 분석)
- **회사 맞춤 역질문 목록** (베이스: `reverse-interview-tech.md` + 회사 특화)
- **회사 연계 Behavioral 답변 가이드** (베이스: `culture-fit-qa.md` + 회사 맞춤 1분 자기소개)
- **면접 직전 리마인더** (베이스: `preflight-notes.md` + `reverse-interview-do-not-ask.md`)
- **이력·포폴 기반 예상질문** (Step 1 산출물)

### 베이스 파일 vs 산출물

- **베이스 파일** (`.claude/skills/recruitment/technical-interview/*.md`): 회사 무관한 템플릿/원칙. 한 번 만들고 계속 재사용
- **산출물** (그 회사용 준비물.md): 매 면접마다 새로 생성. 베이스 + 회사 분석 결과 합성

> 새 컨텍스트 파일을 만들 때마다 위 "포함 항목"에 추가할 것.
