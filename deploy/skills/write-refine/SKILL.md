---
name: write-refine
description: write-init이 만든 패키지(frontmatter + 본문 단일 .md)의 톤·표현·분량을 다듬는다. 같은 세션에서 이어 호출해도 되고, 히스토리가 무거우면 `/compact` 후 호출한다. 사실 검증은 안 함 — 표현만 다룬다.
argument-hint: <package-file-path>
---

# write-refine — 다듬기

## 목적

write-init 패키지의 **표현**을 다듬는다. frontmatter가 정본 컨텍스트. **사실·내용은 손대지 않는다** (init에서 확정된 전제).

## 입력

`/write-refine <파일 경로>`. 형식은 [package-format.md](../../contexts/writing-guide/package-format.md) 참조.

패키지가 아닌 입력(레포 상주 문서 등)도 종료시키지 않는다. 입구에서 패키지로 만든 뒤 같은 파이프라인에 태운다.

### 입구 정규화 — frontmatter 없거나 필수 필드 누락일 때

대상 파일에 frontmatter를 **임시 부착**한 뒤 「1. 파악」으로 진행한다. 별도 staging 사본을 만들지 않는다.

값을 유도하는 순서:

- **문서군** — 대상 파일의 형제 문서(같은 디렉토리·같은 계열)를 읽어 `audience`·`purpose`와 확립된 톤 관례를 유도한다.
- **대상 레포 CLAUDE.md** — 그 레포의 운영방침·frontmatter 스키마가 있으면 따른다.
- **본문** — `key_message`는 H1과 첫 문단에서 유도한다. `type`은 [write-init 「입력」 표](../write-init/SKILL.md#입력)의 어휘 중 문서 성격에 가장 가까운 값을 고른다.
- 위로 유도할 수 없는 필드만 사용자에게 **한 번** 묻는다. 필드마다 나눠 묻지 않는다.

부착한 frontmatter는 「종결 — 발행처 이관」에서 제거한다.

## 룰·사례 로드 (on-demand, 무조건 적재 금지)

- **룰**: `../../contexts/writing-guide/tone.md` Read. 톤·표현 룰의 SSOT.
- **사례**: type·맥락에 맞는 것만 Read.
  - 모든 type: `../../contexts/writing-guide/examples/tone.md` (금지어·말투 변별)
  - 문단·구조 이슈 보이면: `../../contexts/writing-guide/examples/structure.md`
  - 절차·과정 서술을 점검할 때: `../../contexts/writing-guide/examples/process.md`
  - `resume-item`·`resume-intro`: `../../contexts/writing-guide/examples/resume.md` + `../../contexts/writing-guide/resume-guide.md`
  - `readme`: `../../contexts/writing-guide/readme-guide.md`
  - 본문에 수치·단정 표현이 있거나 요약·축소 정확성 관련: `../../contexts/writing-guide/examples/accuracy.md` (단정 수위를 낮추는 것까지가 표현 다듬기다. 사실 자체의 검증은 init 책임)
  - `decision`: `../../contexts/writing-guide/decision-guide.md`
  - 해법·선택을 제시하는 절이 있으면: `../../contexts/writing-guide/tradeoff-guide.md`

## 구조 — 자기검토 단일 에이전트

메인이 **직접** 다듬고 **직접** 검토한다. 서브에이전트에 위임하지 않는다.

### 1. 파악

frontmatter에서 컨텍스트(독자·목적·분량·`rendering_env`·`placeholder_policy`·`rejected`) 추출. 본문 구조 파악.

- `rejected`가 있으면 그 표현과 **같은 결**의 표현을 이번 수정에 넣지 않는다(「4. 보고·사용자 피드백」의 「거부한 표현 재투입 금지」 판단 근거).
- `audience`가 비개발자면 코드 레벨 용어·기술 링크·괄호 부연을 우선 점검.
- `rendering_env`가 `markdown`이 아니면 [package-format.md](../../contexts/writing-guide/package-format.md)의 그 값 규칙대로 본문 문법을 제한한다.
- **type 분기**: `type: resume-item`이면 "시안 다양화"(아래), `type: decision`이면 "비교 구조 강제"(아래)를 추가 적용. `type: resume-*`이면 "트레이드오프 누락 플래그"(아래)를 추가 적용. type과 무관하게 본문에 비교·선택 절이 보이면 그 절에 "트레이드오프 누락 플래그"를 적용.

### 2. 직접 다듬기 — 상속 가드

본문을 tone.md 룰·사례에 맞게 직접 Edit한다.

- **표현만**. 사실·내용·수치·고유명사 변경 금지(날조가드 상속). 명백한 사실 오류를 발견하면 고치지 말고 사용자에게 보고.
- **사용자 목소리 보존**: 원문 범위 내 변환만. bullet·섹션·헤딩 개수는 기본 보존 — 통합·삭제·분할이 필요하면 사용자에게 한 번 확인.
- 이모지 추가하지 않고, 원본 이모지도 제거하지 않는다.

### 3. 자기검토 — 층별 종료 조건

다듬은 본문을 스스로 다시 읽어 검토한다. **층마다 종료 조건이 다르다:**

- **반객관 층 (0까지 반복)**: 자기판단 대신 `../pre-exit/augmentations/score.mjs`를 직접 실행해 검증한다(`type`이 `resume-*`면 `--resume` 추가). 출력의 **기계 적발 합계**가 0이 될 때까지 직접 재수정 → 재실행을 반복한다. 반복 상한은 글로벌 규칙 「검증은 수렴할 때까지 반복」을 따르고, 상한에서 잔존하면 멈추고 잔여 위반과 함께 보고한다.
  - 합계에 안 들어가고 "눈으로 확인"으로 표시된 항목(습니다체 휴리스틱, `placeholder_policy: keep`의 placeholder 잔존)은 0-강제 대상이 아니다 — 출력된 후보를 직접 읽고 실제 위반만 고른다.
- **주관 층 (1패스 후 종료)**: 과압축·설교조·문맥형 억지영어·한자어 밀도 등은 0 기준이 없어 무한루프가 된다. **1패스만** 점검·반영하고 사용자에게 넘긴다.

### 4. 보고·사용자 피드백

다듬은 파일 경로를 보고하고 산출 후 1회 안내(아래)를 띄운다. 사용자가 자연어 피드백을 주면 tone.md에서 가까운 룰에 매핑해 직접 반영한다.

- **거부한 표현 재투입 금지**: 사용자가 한 번 거부한 결의 표현을 다음 수정에 또 넣지 않는다. 거부가 나올 때마다 그 자리에서 frontmatter `rejected`에 append한다 — 이 세션의 기억은 다음 재실행에 남지 않으므로, 파일에 적어야 규정이 다음 세션에서도 발동한다.
- 문장 반려 시 단일안 말고 여러 시안을 제시해 고르게 한다.

## 산출 후 1회 안내

- 표면 교정은 사용자가 직접 하는 게 빠르고, 그 외 수정 지시는 본문에 주석으로 일괄 달면 모아서 반영한다(반영 후 주석 제거).
- 내용 오류는 write-init 몫이라 이번 다듬기에서 다루지 않았다는 것을 알린다.

## type 분기

### 시안 다양화 (resume-item)

`type: resume-item`이면 `resume-guide.md` 「시안 다양화 워크플로우」대로 시안을 만들어 사용자가 고르게 한다. 파일을 바로 덮어쓰지 않고 시안을 텍스트로 제시 → 사용자 선택·조합 → 확정본을 파일에 반영.

### 비교 구조 강제 (decision)

`type: decision`이면 `decision-guide.md` 「비교 구조 강제 규칙」이 요구하는 것이 본문에 있는지 검토한다. 빠진 것은 refine이 채우지 않고 사용자에게 받는다(그 규칙이 정한 처리 방식이다).

### 트레이드오프 누락 플래그 (비교 절)

해법·선택을 제시하는 절에 그 선택과 맞바꾼 것이 있는지 점검한다. 빠졌으면 refine은 **채우지 않고 사용자에게 보고**한다 — 트레이드오프 내용은 저자 고유 판단이라 refine이 채우면 날조다(내용은 write-init 책임, 사실 오류 보고 규칙과 동일). 반면 `tradeoff-guide.md` 「서술 규칙」 위반은 표현 다듬기 대상이라 발견 시 직접 적용한다.

## 출력

입력 패키지를 **제자리 Edit**한다 (시안 다양화는 예외 — 위 type 분기 참조).

## 종결 — 발행처 이관 (frontmatter 제거)

사용자 리뷰까지 끝나 본문이 확정되면 실행한다. frontmatter는 write-refine **재실행 컨텍스트**라(「write-init과의 관계」 — frontmatter만으로 출발) staging 패키지엔 보존하고, **발행 문서(레포에 들어가는 본체)엔 0줄**이어야 한다. 같은 파일을 제자리 Edit하면 둘이 충돌하므로 **발행처를 패키지와 분리**하는 게 전제다.

- **발행처 확인**: 확정 본문이 실제로 들어갈 위치(레포 파일·문서 서식·외부 입력 폼 등)를 사용자에게 묻는다. 모르면 채우지 말고 받는다.
- **본문만 이관**: 발행처에는 `---`~`---` frontmatter를 떼고 **본문만** 쓴다. `rendering_env`가 요구하는 문법 제약도 발행처 본문에 그대로 적용한다.
- **패키지 보존**: staging 패키지 파일은 frontmatter를 그대로 둔다 — 다음 세션 write-refine 재실행이 frontmatter만으로 출발하기 때문이다.

- **입구 정규화로 부착한 frontmatter는 무조건 제거**: 대상이 원래 레포 상주 문서였다면 그 파일 자체가 발행처다. 확인 없이 떼고, 뗀 사실을 보고한다. 이 경우 재실행은 다음 세션이 다시 입구 정규화를 거치므로 frontmatter를 남길 이유가 없다.

발행처가 staging 패키지와 같은 파일 하나뿐이고 그 frontmatter를 write-init이 만든 것이면, 남길지 뗄지 사용자에게 확인한다 — 재실행 가능성과 발행 청결 중 무엇을 우선할지는 사용자 판단이다.

## write-init과의 관계

init과 같은 세션에서 이어 다듬어도 된다. 진입 전 `/compact`를 권장한다 — AI가 밀다가 기각당한 초안 문장이 히스토리에 남아 있으면 표현 개선을 핑계로 되살아나는데, compact 요약은 사용자 발화를 원문 보존하면서 AI 중간 산출은 버리기 때문이다.

**컨텍스트가 어긋나면 frontmatter가 정본이다.** 대화·compact 요약에 남은 잔재가 frontmatter와 다르면 frontmatter를 따른다.
