# publish-file.mjs 사용법

`node <write-doc 스킬 폴더>/scripts/publish-file.mjs <패키지.md> <발행 파일> [--base <커밋>]`

패키지 본문을 발행 파일에 쓴다. 패키지 frontmatter는 떼고, 발행 파일이 원래 가진 frontmatter 블록만 남긴다. 두 경로가 같아도 된다.

- 두 경로가 다르면 발행 파일이 지금 가진 블록을 남긴다. 발행 파일이 없으면 폴더째 만든다
- 두 경로가 같으면 `git show <base>:<파일>`의 블록을 남긴다(`--base` 기본 `HEAD`). 추적되지 않았거나 그 원본에 블록이 없으면 붙이지 않는다
  - 그 블록에 패키지 전용 필드(`key_message`)가 있으면 exit 1로 멈춘다 — 붙인 frontmatter가 작업 중에 커밋된 것이다. 붙이기 전 커밋을 `--base`로 준다
- 원래 CRLF였던 파일은 CRLF로 쓴다

## 출력

stdout에 세 줄을 낸다.

- `발행: <발행 파일>`
- `뗀 필드: <패키지에만 있던 필드들 | 없음>`
- `남긴 필드: <남긴 블록의 필드들 | 없음>`

경로가 빠졌거나 `--base` 뒤 값이 없으면 사유와 이 문서 경로를 stderr에 내고 exit 1.
