# reviewer-input.mjs 사용법

`node <write-doc 스킬 폴더>/scripts/reviewer-input.mjs --from <패키지.md> --for expression|reader`

다듬기 단계의 리뷰어에게 줄 프롬프트를 stdout에 낸다. 출력을 덧붙이는 말 없이 그대로 Agent 프롬프트나 SendMessage에 붙인다.

- `expression` 표현 리뷰어용. 지시 파일 경로, 패키지 frontmatter 전체, 읽을 writing-guide 파일 경로, 본문에 걸린 반려 항목, `[//]: #` 주석을 뺀 본문
- `reader` 독자 리뷰어용. `reviewers/reader.md`의 [리뷰어에게 주는 지시](../reviewers/reader.md#리뷰어에게-주는-지시) 인용과 주석을 뺀 본문. frontmatter는 넘기지 않는다

출력 끝에는 결과를 `SendMessage`로 `main`에 보내라는 줄이 붙는다.

## 멈출 때 (exit 1)

- `--from`이 없거나 `--for`가 둘 중 하나가 아니다 — 사유와 이 문서 경로를 stderr에 낸다
- `expression`인데 frontmatter `user_phrases` 항목에 출처 `(…)`가 없다 — 그 항목을 낸다. 출처를 채우거나 `user_phrases`에서 뺀 뒤 다시 실행한다
- `reader`인데 reader.md의 그 절에서 `> ` 인용을 못 찾았다
