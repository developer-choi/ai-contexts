---
name: write-refine
description: write-init이 만든 패키지(frontmatter + 본문 단일 .md)의 톤·표현·분량을 다듬는다. 작업 히스토리 없는 새 세션에서 호출. 사실 검증은 안 함 — 표현만 다룬다.
argument-hint: <package-file-path>
---

# write-refine — 다듬기

## 목적

write-init 패키지의 **표현**을 다듬는다. frontmatter가 유일한 컨텍스트. **사실·내용은 손대지 않는다** (init에서 확정된 전제).

## 입력

`/write-refine <파일 경로>`. write-init 패키지(frontmatter + 본문). 형식은 [write-init "패키지 형식"](../write-init/SKILL.md#패키지-형식) 참조.

- frontmatter 없거나 깨짐 → "패키지 형식이 아닙니다. write-init부터 호출하세요"로 종료.
- 필수 필드 누락 → 동일 종료.

## 룰·사례 로드 (on-demand, 무조건 적재 금지)

- **룰**: `../../contexts/writing-guide/tone.md` Read. 톤·표현 룰의 SSOT.
- **사례**: type·맥락에 맞는 examples만 Read. **전부 로드하지 않는다.**
  - 모든 type: `../../contexts/writing-guide/examples/tone.md` (금지어·말투 변별)
  - 문단·구조 이슈 보이면: `../../contexts/writing-guide/examples/structure.md`
  - `resume-item`·`resume-intro`: `../../contexts/writing-guide/examples/resume.md` + `../../contexts/writing-guide/resume-guide.md`
  - 요약·축소 정확성 관련: `../../contexts/writing-guide/examples/accuracy.md`
  - `decision`: `../../contexts/writing-guide/decision-guide.md`
  - 해법·선택을 담는 글(`decision`·`resume-*`), 또는 type과 무관하게 본문에 비교·선택 절이 보이면: `../../contexts/writing-guide/tradeoff-guide.md` (트레이드오프 누락 플래그 — 아래 type 분기)

## 구조 — 자기검토 단일 에이전트

메인이 **직접** 다듬고 **직접** 검토한다. 서브에이전트 위임·핑퐁·복원캡·종료캡·누적블록 **없음**.

### 1. 파악

frontmatter에서 컨텍스트(독자·목적·분량·`rendering_env`·`placeholder_policy`) 추출. 본문 구조 파악.

- `rendering_env: plain-text`면 마크다운 문법(백틱·헤딩·코드펜스)을 본문에 쓰지 않는다.
- `placeholder_policy` 명시 없으면 `keep`.
- `audience`가 비개발자면 코드 레벨 용어·기술 링크·괄호 부연을 우선 점검.
- **type 분기**: `type: resume-item`이면 "시안 다양화"(아래), `type: decision`이면 "비교 구조 강제"(아래)를 추가 적용. `type: resume-*`이면 "트레이드오프 누락 플래그"(아래)를 추가 적용. type과 무관하게 본문에 비교·선택 절이 보이면 그 절에 "트레이드오프 누락 플래그"를 적용.

### 2. 직접 다듬기 — 상속 가드

본문을 tone.md 룰·사례에 맞게 직접 Edit한다.

- **표현만**. 사실·내용·수치·고유명사 변경 금지(날조가드 상속). 명백한 사실 오류를 발견하면 고치지 말고 사용자에게 보고.
- **사용자 목소리 보존**: 원문 범위 내 변환만. bullet·섹션·헤딩 개수는 기본 보존 — 통합·삭제·분할이 필요하면 사용자에게 한 번 확인.
- frontmatter(`---`~`---`)는 건드리지 않는다.
- 이모지 추가하지 않고, 원본 이모지도 제거하지 않는다.

### 3. 자기검토 — 층별 종료 조건

다듬은 본문을 스스로 다시 읽어 검토한다. **층마다 종료 조건이 다르다:**

- **반객관 층 (0까지 반복, 최대 5회)**: 기계로 셀 수 있는 위반 = 0이 될 때까지 직접 재수정.
  - 금지어 exact-string (tone.md 한자어·추상압축어·외래어음차·자기과장어·극적수식어)
  - em/en dash (인용블록 밖)
  - 습니다체 종결 (이력서는 명사형 허용)
  - 빈 섹션 (placeholder 잔존·1문장 미만)
  - 5회 후에도 잔존하면 멈추고 잔여 위반과 함께 보고.
- **주관 층 (1패스 후 종료)**: 과압축·설교조·문맥형 억지영어·한자어 밀도 등은 0 기준이 없어 무한루프가 된다. **1패스만** 점검·반영하고 사용자에게 넘긴다.

### 4. 보고·사용자 피드백

다듬은 파일 경로를 보고하고 산출 후 1회 안내(아래)를 띄운다. 사용자가 자연어 피드백을 주면 tone.md에서 가까운 룰에 매핑해 직접 반영한다.

- **거부한 표현 재투입 금지**: 사용자가 한 번 거부한 결의 표현(추상 압축어 등)을 다음 수정에 또 넣지 않는다.
- 문장 반려 시 단일안 말고 여러 시안을 제시해 고르게 한다.

## 산출 후 1회 안내

- 단어 빼기 같은 **표면 교정은 직접** 하시는 게 빠릅니다.
- 추가 수정은 **본문에 주석으로 일괄** 달아주세요 — 모아서 한 번에 반영합니다(반영 후 주석 제거).
- **내용 오류는 write-init 책임** — 표현만 다뤘습니다.

## type 분기

### 시안 다양화 (resume-item)

`type: resume-item`이면 한 주제에 서로 대비되는 **3축 시안**을 만들어 사용자가 고르게 한다 (예: 설계 관점 / 확장성 관점 / 운영 관점). 파일을 바로 덮어쓰지 않고 시안 3개를 텍스트로 제시 → 사용자 선택·조합 → 확정본을 파일에 반영. 워크플로우 세부는 `resume-guide.md` 참조.

### 비교 구조 강제 (decision)

`type: decision`이면 본문이 "방법 2개 이상 / 각 장점·단점 / 결론에 비선택 이유"를 갖췄는지 검토하고, 빠지면 보강한다. 세부는 `decision-guide.md` 참조.

### 트레이드오프 누락 플래그 (resume·비교 절)

`type: resume-*`이면 해법·선택을 제시하는 절에 그 선택의 단점·비용(이득과 맞바꾼 것)이 있는지 점검한다. 빠졌으면 **보강하지 않고 사용자에게 보고**한다 — 트레이드오프 내용은 저자 고유 판단이라 refine이 채우면 날조다(내용은 write-init 책임, 사실 오류 보고 규칙과 동일). 서술 규칙(감수 단점 정당화 금지 등)은 표현 다듬기 대상이므로 발견 시 직접 적용한다. 세부는 `tradeoff-guide.md` 참조.

`type`이 `resume-*`가 아니어도(예: `readme`·`pr-body`) 본문에 "검토한 접근법"·"방법 A vs B" 같은 비교·선택 절이 있으면 그 절에 같은 점검을 건다.

## 출력

다듬기 단계는 입력 패키지(frontmatter + 본문)를 **제자리 Edit**한다. 별도 파일 생성 X. 같은 경로 안내. (시안 다양화는 예외 — 위 type 분기 참조.) 발행처로 내보내는 것은 사용자 리뷰가 끝난 뒤 「종결 — 발행처 이관」에서 한다.

## 종결 — 발행처 이관 (frontmatter 제거)

사용자 리뷰까지 끝나 본문이 확정되면 실행한다. frontmatter는 write-refine **재실행 컨텍스트**라(「write-init과의 관계」 — frontmatter만으로 출발) staging 패키지엔 보존하고, **발행 문서(레포에 들어가는 본체)엔 0줄**이어야 한다. 같은 파일을 제자리 Edit하면 둘이 충돌하므로 **발행처를 패키지와 분리**하는 게 전제다.

- **발행처 확인**: 확정 본문이 실제로 들어갈 위치(레포 파일·문서 서식·외부 입력 폼 등)를 사용자에게 묻는다. 모르면 채우지 말고 받는다.
- **본문만 이관**: 발행처에는 `---`~`---` frontmatter를 떼고 **본문만** 쓴다. `rendering_env: plain-text`면 마크다운 문법도 함께 벗긴다(「1. 파악」의 `rendering_env` 규칙).
- **패키지 보존**: staging 패키지 파일은 frontmatter를 그대로 둔다 — 다음 세션 write-refine 재실행이 frontmatter만으로 출발하기 때문이다.
- **확인**: 발행 문서에 frontmatter가 0줄인지 점검한다(`type`·`audience`·`purpose`·`refs` 등 staging 메타가 남으면 안 됨).

발행처가 staging 패키지와 같은 파일 하나뿐이면(별도 발행 위치 없음) frontmatter를 남길지 뗄지 사용자에게 확인한다 — 재실행 가능성과 발행 청결 중 무엇을 우선할지는 사용자 판단이다.

## write-init과의 관계

write-init이 내용 채움, write-refine이 톤·구조·분량 다듬기. write-refine은 작업 히스토리 없이 frontmatter만으로 출발.
