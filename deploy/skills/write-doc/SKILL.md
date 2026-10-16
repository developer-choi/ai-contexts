---
name: write-doc
description: 글(PR 본문·PR 코멘트·README·결정문·기술 글·사례집·학습 필기)을 사용자와 함께 골격부터 써서 표현을 다듬고 발행까지 한 세션에 마친다. 명시적으로 write-doc을 호출할 때만 사용.
argument-hint: <type> [<subtype>]
---

# write-doc — 글 쓰기

## 목적

글의 내용을 사용자와 함께 확정하고, 표현을 다듬어, 발행처에 올린다. 한 세션에서 초안부터 발행까지 이어 간다.

## 입력

`/write-doc <type> [<subtype>]` 형태로 호출한다.

| type | subtype | 필수/선택 | 설명 |
|------|---------|----------|-----|
| `pr-body` | (없음) | 선택 | 일반 PR 본문 |
| `pr-body` | `recruitment` | 선택 | 채용용 PR 본문 |
| `readme` | — | — | README (subtype 미사용) |
| `pr-comment` | `reviewer` | **필수** | 검토자가 남의 PR에 코멘트 |
| `pr-comment` | `author` | **필수** | 작성자가 자기 PR에 답글 |
| `decision` | — | — | 기술적 의사결정 문서 |
| `article` | — | — | 기술 글·가이드 |
| `case-study` | — | — | README에서 링크하는 문제→해결 사례집 |
| `note` | — | — | 학습 필기·설명 노트. 글 종류 규칙 없이 공통 톤 규칙만 걸린다 |

이미 쓴 글을 다듬으려면 같은 형태로 부르고 초안 단계의 재료 받기에서 그 글을 건넨다. 완성된 글이면 초안 단계를 건너뛰고 다듬기부터 한다.

## 흐름

단계마다 그 단계에 들어갈 때 해당 파일을 Read하고 그대로 따른다. 앞 단계가 끝나면 사용자에게 넘기지 않고 다음 단계로 이어 간다.

| 단계 | 파일 |
|---|---|
| 초안 | [steps/draft.md](steps/draft.md) |
| 다듬기 | [steps/polish.md](steps/polish.md) |
| 마무리 | [steps/finish.md](steps/finish.md) |

단계 파일의 절차 제목 앞 `[OUTLINE_STEP]` 같은 표식은 그 절차의 ID다. 모든 type이 이 절차를 돌고, type마다 더 도는 것은 `writing-guide/types/<type>/steps.md`에 같은 ID 절로 있다. 단계마다 `guide-files.mjs`가 그 파일을 낸다.

- ID가 붙은 절차에 들어갈 때마다 type 파일에 같은 ID 절이 있는지 보고, 있으면 이어서 돈다.
- 기본 절차와 부딪치면 type 절을 따른다.

## 모든 단계에 걸리는 것

- **사용자가 지운 절·문장은 다시 넣지 않는다.**
- **사용자가 거부한 것은 그때마다 패키지 frontmatter `rejected`에 적는다.** 마무리 단계가 이 목록으로 쌓을 곳을 가른다. 한 번 거부된 결의 표현은 다음 수정에 다시 넣지 않는다.
- **승인본(같은 성격으로 이미 승인된 글)에서는 분량·절 수·말투만 가져온다.**
