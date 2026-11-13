# pr-body: type마다 더 도는 절차

## [RECEIVE_STEP] 재료 받기

이미 GitHub에 게시한 PR을 다시 다듬으면, 기본 절차의 재료 읽기보다 먼저 `gh pr view <번호> [--repo owner/name] --json title,body`의 title을 H1로 붙인 본문을 재료로 쓴다.

- [package-format.md](../../../../contexts/writing-guide/package-format.md) 꼴로 `type`·`subtype`·`key_message`를 채워 저장한 뒤 진행한다. `type`·`subtype`은 이번 호출 값을 넣고, `key_message`는 게시본 H1·본문에서 한 문장을 뽑아 넣는다. 저장 경로는 "패키지 저장"의 추천 경로를 보여 받는다.
- 뒤의 골격·패키지 저장도 방금 저장한 패키지 파일에 쓴다. 표현만 다듬어 다듬기로 바로 가도 제자리에서 고칠 파일이 있어야 한다.

그 밖에, 사용자가 재료를 직접 건네지 않았으면 `plan/` 아래 재료를 열기 전에 `node ${CLAUDE_SKILL_DIR}/scripts/plan-materials.mjs <대상 레포 안 아무 경로>`를 돌린다.

1. **위치 추론**: 이 PR의 재료가 어디 있는지 이름 목록만 보고 추론하고 근거를 한 줄로 밝힌다(후보마다 열면 사용하지 않을 재료까지 컨텍스트에 실린다).
2. **todo**: 스크립트가 낸 todo md를 열어, 이 PR 본문에 들어갈 항목을 선택해 근거와 함께 보인다.

## [KEY_MESSAGE_STEP] 핵심 문장 합의

PR 제목 한 줄([가이드의 "PR 제목"](../../../../contexts/writing-guide/types/pr-body/guide.md#pr-제목) 기준)과 "재료 받기"에서 선택한 todo 항목도 함께 확인받는다.

## [SCAN_STEP] 파악

본문 H1(PR 제목)을 [가이드의 "PR 제목"](../../../../contexts/writing-guide/types/pr-body/guide.md#pr-제목) 기준으로 점검하고, 본문이 제목의 주장을 뒷받침하는지 본다.

- 걸린 것을 짚고, 점검을 통과한 시안 가운데 사용자가 선택한 것을 H1에 반영한다.
- `key_message`나 본문과 주장이 어긋난 것은 시안을 `key_message`에 맞춰 내되, 본문 쪽이 틀렸을 수 있으니 그 어긋남을 사용자에게 함께 알린다.

## [PUBLISH_STEP] 발행

게시·검사는 `node ${CLAUDE_SKILL_DIR}/scripts/publish-pr.mjs`로 한다. 인자는 [publish-pr.md](../../scripts/publish-pr.md)에 있다.

- 발행처가 이미 열린 GitHub PR이면 그 PR 번호로 `--apply`를 붙여 게시한다.
- 게시한 뒤 크롬으로 PR 페이지를 열어 본문이 의도한 대로 렌더됐는지 본다. 스크립트가 게시 전에 막는 렌더 검사는 publish-pr.md에 있고, 크롬으로는 그 밖의 렌더(목록·링크·코드 블록·표)와 `_`·링크 문법(`[…](…)`)이 글자로 남은 자리를 본다. 깨진 자리는 패키지에서 고쳐 다시 게시하고 같은 화면을 다시 본다.
- PR이 아직 없으면 `--pr` 없이 돌려 검사를 통과시킨 뒤 패키지 경로를 보고한다. PR 본문 칸에 패키지를 그대로 붙이지 않게, PR을 연 뒤 위 절차(게시, 크롬 확인, 삭제)로 올리라고 함께 안내한다.
- `--apply`가 exit 0으로 끝나고 크롬 확인까지 마친 패키지는 "frontmatter 정리"에서 지운다(그 전 "반려 적재"가 패키지 `rejected`를 읽는다). 게시한 뒤로는 GitHub PR 본문이 정본이라, 로컬에 사본이 남으면 둘 중 어느 쪽이 최신인지 헷갈린다.

## [FRONTMATTER_STEP] frontmatter 정리

기본 절차 대신 아래를 따른다.

- 게시한 패키지는 파일째 지운다. 패키지 `rejected`의 "이번 글만" 항목도 함께 사라진다.
- 게시하지 않은 패키지(PR이 아직 없음)는 frontmatter를 그대로 둔다. 나중에 publish-pr.mjs가 `type`을 읽어 게시한다.
