# 면접 준비

> 모드 무관 공통 절차. 모드별 차이(어떤 베이스 파일을 사용할지)는 본문에 표기.
> Step 1(이력·포폴 기반 예상질문)은 시점 1에서 미리 만들어둔 `personal-questions.md`로 대체된다 — 모드 진입 시 자동 컨텍스트 로드.

## Step 2. 2시간 전 준비

AI가 아래 항목을 위에서부터 진행 관리한다. 항목별 사용자 컨펌 후 다음으로 넘어간다. 시간은 충분 — **순서대로 누락 없이** 진행이 목적.

- 회사 분석: `company-analysis/` sub-skill 호출 (산출물 없으면 생성, 있으면 갱신)
- 회사 맞춤 예상질문 뽑기 (활성 모드별 베이스):
  - **기술면접 트리거** (technical + culture-fit 동시 진입): `technical-interview/technical-questions.md` + 양 모드의 `personal-questions.md` + `culture-fit-interview/culture-fit-qa.md`(Behavioral 보조) + 회사 분석. 취미 같은 질문조차 회사와 연계.
  - **컬쳐핏/임원 단독 트리거**: `culture-fit-interview/culture-fit-qa.md` + `culture-fit-interview/personal-questions.md` + 회사 분석. 취미 같은 질문조차 회사와 연계.
- 역질문 금지 목록 숙지 (`reverse-interview-do-not-ask.md`)
- 회사 맞춤 역질문 리스트업 (활성 모드별 베이스):
  - **기술면접**: `technical-interview/reverse-interview.md` + 회사 특화
  - **컬쳐핏/임원**: `culture-fit-interview/reverse-interview.md` + 회사 특화
- 1분 자기소개 말하며 연습 (`self-introduction.md`)
- 클로바노트 켜놓고 AI 먹이고 피드백 받기
- **최종 요약본 생성** → `outputs/{회사명}/그 회사용 준비물.md` (활성 모드의 `templates/final-summary.md` 사용. 1-2페이지로 압축. Step 3과 entry에서 사용)

## Step 3. 트레이닝 (-20분까지)

문서 정독은 모의면접 + 최종 요약본 1회 정독으로 대체한다 (베이스 QnA 암기 목적이었으므로).

- AI와 모의면접
  - 베이스: 활성 모드의 모든 질문/역질문 베이스 파일 + `personal-questions.md` + Step 2에서 만든 회사 맞춤 예상질문 + `company-analysis/` 산출물
  - 흐름: AI가 random 질문 → 사용자 답변(텍스트 또는 클로바노트 음성) → AI 짧은 피드백 (회사 가치 매핑·말투·논리 관점)
  - 우선순위: 사용자가 약하다 느끼는 영역부터. Step 2의 자기소개 피드백에서 잡힌 약점이 있으면 그 영역부터.
- 최종 요약본(`outputs/{회사명}/그 회사용 준비물.md`) 1회 정독
- 엘베 시간 때문에 **20분 전 출발**

---

> 최종 요약본의 형식·포함 항목은 활성 모드의 `templates/final-summary.md` 참조 (양 모드에 모드별 template 존재).
