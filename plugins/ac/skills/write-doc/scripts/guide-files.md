# guide-files.mjs 사용법

`node <write-doc 스킬 폴더>/scripts/guide-files.mjs <type> [--subtype <subtype>] --for <단계>`
`node <write-doc 스킬 폴더>/scripts/guide-files.mjs --from <패키지.md> --for <단계>`
`node <write-doc 스킬 폴더>/scripts/guide-files.mjs --check`

단계마다 읽을·넘길 writing-guide 파일을 있는 것만 절대경로로 낸다.

## 인자

- `<type>`·`--subtype <subtype>` write-doc SKILL.md [입력](../SKILL.md#입력) 표의 값
- `--from <패키지.md>` type·subtype을 패키지 frontmatter에서 읽는다. 패키지가 생긴 뒤 단계는 이쪽을 쓴다 — 손으로 넘기면 subtype을 빠뜨린다
- `--for <단계>` 받는 값:
  - `draft` 초안 단계가 Read할 공통 조건·type 템플릿·가이드
  - `polish` 다듬기 단계 메인이 Read할 공통 조건·가이드
  - `finish` 마무리 단계 메인이 Read할 반려 항목 꼴·type 단계 파일
  - `reviewer` 표현 리뷰어가 읽을 경로(`reviewer-input.mjs`가 쓴다)

## 출력

- `## Read한다`(`reviewer`면 `## 늘 넘긴다`) 아래 경로 목록. 없으면 `- 없음`
- 판단이 드는 조건이 붙은 파일은 `## 조건에 맞을 때만 더 넘긴다` 아래 `- <조건>: <경로>`로 낸다. 고르는 것은 메인이다
- 메인 단계(`draft`·`polish`·`finish`)에는 스킬 `types/<type>/steps.md`·`types/<type>/<subtype>/steps.md`도 낸다

type 또는 `--for`가 없거나 `--for` 값이 위 넷이 아니면 사유와 이 문서 경로를 stderr에 내고 exit 1.

## --check

아래를 모두 대조하고, 어긋나면 stderr에 내고 exit 1. pre-commit이 실행한다.

- 스킬 `types/` 아래 steps.md의 `## [절차 ID] …` 절이 단계 파일에 같은 ID로 있는가
- writing-guide subtype 폴더에 template.md를 두지 않았는가
- writing-guide에 steps.md를 두지 않았는가
- writing-guide·스킬 `types/` 아래에 `general` 폴더가 없는가(general은 공통 조건만 건다)
