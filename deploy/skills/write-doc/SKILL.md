---
name: write-doc
description: 글(PR 본문·README·결정문·기술 글·사례집)을 사용자와 함께 골격부터 써서 표현을 다듬고 발행까지 한 세션에 마친다. 명시적으로 write-doc을 호출할 때만 사용.
argument-hint: [<type> [<subtype>]]
---

# write-doc — 글 쓰기

## 목적

글의 내용을 사용자와 함께 확정하고, 표현을 다듬어, 발행처에 올린다. 한 세션에서 초안부터 발행까지 이어 간다.

## 입력

`/write-doc [<type> [<subtype>]]` 형태로 호출한다.

| type | subtype | 설명 |
|------|---------|-----|
| `pr-body` | (없음) | 일반 PR 본문 |
| `pr-body` | `recruitment` | 채용용 PR 본문 |
| `readme` | — | README |
| `decision` | — | 기술적 의사결정 문서 |
| `approach-ladder` | — | 같은 결과를 내는 방법이 여러 개일 때, 최악 → 차악 → 최선으로 옮겨 가며 판단 기준을 보이는 기술 글 |
| `case-study` | — | README에서 링크하는 문제→해결 사례집 |
| `general` | — | 위 어느 type에도 맞지 않는 글. 공통 조건(common.md)만 걸린다 |

type 없이 부르면 건넨 패키지 frontmatter의 `type`·`subtype`으로, 그것도 없으면 `general`로 진행한다. 맞는 type이 있어 보이면 재료 받기에서 한 줄로 제안하고, 고르지 않으면 `general`로 간다.

이미 쓴 글을 다듬으려면 같은 형태로 부르고 초안 단계의 재료 받기에서 그 글을 건넨다.

## 흐름

단계마다 그 단계에 들어갈 때 해당 파일을 Read하고 그대로 따른다. 앞 단계가 끝나면 다음 단계로 이어 간다.

| 단계 | 파일 |
|---|---|
| 초안 | [steps/draft.md](steps/draft.md) |
| 다듬기 | [steps/polish.md](steps/polish.md) |
| 마무리 | [steps/finish.md](steps/finish.md) |

단계 파일의 절차 제목 앞 `[OUTLINE_STEP]` 같은 표식은 그 절차의 ID다.

- 단계마다 `guide-files.mjs`가 내는 type 파일(`types/<type>/steps.md`)·subtype 파일(`types/<type>/<subtype>/steps.md`)에 같은 ID 절이 있으면, 그 절차에 이어 type 절, subtype 절 순으로 돈다.
- 기본 절차와 부딪치면 type 절을 따른다.

## 모든 단계에 걸리는 것

- **사용자가 지운 절·문장은 다시 넣지 않는다.**
- **사용자가 거부한 것은 그때마다 패키지 frontmatter `rejected`에 적는다.** 마무리 단계가 이 목록으로 쌓을 곳을 가른다.
