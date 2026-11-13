# visibility.mjs 사용법

`node <write-doc 스킬 폴더>/scripts/visibility.mjs <레포 안 아무 경로 | owner/name>`

stdout에 `public` 또는 `private` 한 단어를 낸다.

- 로컬 클론이 없는 레포(남의 PR에 다는 코멘트 등)는 `owner/name`으로 준다
- 경로를 주면 그 레포의 `origin` 원격으로 `gh repo view`를 조회한다. 원격이 없거나 조회가 안 되면 `private`을 낸다
- 인자가 없으면 사유와 이 문서 경로를 stderr에 내고 exit 1
